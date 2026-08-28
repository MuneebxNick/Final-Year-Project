"""Startup-cached Prophet models and ranked predictive-maintenance segments."""

from __future__ import annotations

import logging
import math
import warnings
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent / "data"
HISTORY_PATH = DATA_DIR / "synthetic_maintenance_data.csv"
FORECASTS_PATH = DATA_DIR / "maintenance_forecasts.csv"

REL_STABLE = 0.05
ABS_EPS = 0.25

_BUDGET_BASE = 100_000
_COST_PER_REPORT = {
    "Highway": 150_000,
    "Service Road": 90_000,
    "Simple Road": 60_000,
}

_FORECAST_COLUMNS = (
    "segment_id",
    "city",
    "area",
    "road_type",
    "predicted_report_count",
    "trend_direction",
)

_models: dict[str, Any] = {}
_segments: list[dict] | None = None


def _silence_prophet() -> None:
    """Keep Stan/cmdstan chatter out of startup logs."""
    logging.getLogger("matplotlib").setLevel(logging.CRITICAL)
    logging.getLogger("matplotlib.font_manager").setLevel(logging.CRITICAL)
    warnings.filterwarnings("ignore", message="Importing plotly failed.*")
    for name in ("prophet", "cmdstanpy", "stan"):
        log = logging.getLogger(name)
        log.setLevel(logging.CRITICAL)
        log.propagate = False
    try:
        import cmdstanpy

        cmdstanpy.utils.get_logger().setLevel(logging.CRITICAL)
    except Exception:
        pass


def _trend_direction(last_trend: float, next_trend: float) -> str:
    delta = next_trend - last_trend
    rel = delta / max(abs(last_trend), ABS_EPS)
    if abs(delta) <= ABS_EPS or abs(rel) <= REL_STABLE:
        return "stable"
    return "increasing" if delta > 0 else "decreasing"


def _budget_estimate_pkr(road_type: str, predicted_report_count: int) -> int:
    per_report = _COST_PER_REPORT.get(road_type, _COST_PER_REPORT["Simple Road"])
    return _BUDGET_BASE + per_report * int(predicted_report_count)


def _assign_categories(rows: list[dict]) -> None:
    """Mutate rows in place with percentile categories (already sorted desc)."""
    n = len(rows)
    if n == 0:
        return
    urgent_n = math.ceil(0.2 * n)
    plan_n = math.ceil(0.5 * n)
    for i, row in enumerate(rows):
        if i < urgent_n:
            row["category"] = "Urgent"
        elif i < urgent_n + plan_n:
            row["category"] = "Plan Repair"
        else:
            row["category"] = "Monitor"


def _fit_models(frame: Any) -> dict[str, Any]:
    import pandas as pd
    from prophet import Prophet

    models: dict[str, Any] = {}
    for segment_id, group in frame.groupby("segment_id", sort=True):
        history = (
            group.rename(columns={"month": "ds", "report_count": "y"})[["ds", "y"]]
            .copy()
            .sort_values("ds")
        )
        history["ds"] = pd.to_datetime(history["ds"])
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            n_changepoints=3,
            changepoint_prior_scale=0.05,
        )
        model.fit(history)
        models[str(segment_id)] = model
    return models


def _forecast_from_models(frame: Any, models: dict[str, Any]) -> list[dict]:
    rows: list[dict] = []
    for segment_id, group in frame.groupby("segment_id", sort=True):
        model = models.get(str(segment_id))
        if model is None:
            continue
        meta = group.iloc[0]
        future = model.make_future_dataframe(periods=1, freq="MS")
        forecast = model.predict(future)
        predicted = max(0, round(float(forecast["yhat"].iloc[-1])))
        last_trend = float(forecast["trend"].iloc[-2])
        next_trend = float(forecast["trend"].iloc[-1])
        rows.append(
            {
                "segment_id": str(meta["segment_id"]),
                "city": str(meta["city"]),
                "area": str(meta["area"]),
                "road_type": str(meta["road_type"]),
                "predicted_report_count": int(predicted),
                "trend_direction": _trend_direction(last_trend, next_trend),
            }
        )
    return rows


def _load_forecasts_csv(path: Path) -> list[dict] | None:
    try:
        import pandas as pd

        if not path.is_file():
            return None
        frame = pd.read_csv(path)
        missing = [col for col in _FORECAST_COLUMNS if col not in frame.columns]
        if missing or frame.empty:
            return None
        rows: list[dict] = []
        for row in frame.itertuples(index=False):
            rows.append(
                {
                    "segment_id": str(row.segment_id),
                    "city": str(row.city),
                    "area": str(row.area),
                    "road_type": str(row.road_type),
                    "predicted_report_count": int(row.predicted_report_count),
                    "trend_direction": str(row.trend_direction),
                }
            )
        return rows
    except Exception:
        logger.exception("Failed to load maintenance forecasts CSV from %s", path)
        return None


def load_maintenance() -> None:
    """Fit Prophet models and cache enriched segment forecasts.

    Failures are logged and leave the cache empty so
    /api/predictive-maintenance can return 503 instead of crashing the app.
    """
    global _models, _segments
    _models = {}
    _segments = None
    try:
        import pandas as pd

        _silence_prophet()

        if not HISTORY_PATH.is_file():
            logger.warning(
                "Maintenance history CSV missing (%s); "
                "/api/predictive-maintenance will return 503.",
                HISTORY_PATH,
            )
            return

        frame = pd.read_csv(HISTORY_PATH)
        required = ("segment_id", "city", "area", "road_type", "month", "report_count")
        missing = [col for col in required if col not in frame.columns]
        if missing:
            logger.warning(
                "Maintenance history CSV missing columns %s; "
                "/api/predictive-maintenance will return 503.",
                missing,
            )
            return
        if frame.empty:
            logger.warning(
                "Maintenance history CSV is empty; "
                "/api/predictive-maintenance will return 503."
            )
            return

        _models = _fit_models(frame)

        forecast_rows = _load_forecasts_csv(FORECASTS_PATH)
        if forecast_rows is None:
            forecast_rows = _forecast_from_models(frame, _models)

        for row in forecast_rows:
            row["budget_estimate_pkr"] = _budget_estimate_pkr(
                row["road_type"], row["predicted_report_count"]
            )

        forecast_rows.sort(
            key=lambda r: int(r["predicted_report_count"]),
            reverse=True,
        )
        _assign_categories(forecast_rows)
        _segments = forecast_rows
        logger.info(
            "Maintenance models loaded (%d segments) from %s",
            len(_segments),
            HISTORY_PATH,
        )
    except Exception:
        logger.exception(
            "Failed to load maintenance models; "
            "/api/predictive-maintenance will return 503."
        )
        _models = {}
        _segments = None


def list_segments(
    city: str | None = None,
    category: str | None = None,
) -> list[dict] | None:
    """Return cached segments, optionally filtered. None if cache unavailable."""
    if _segments is None:
        return None
    rows = _segments
    if city is not None:
        needle = city.strip().lower()
        rows = [r for r in rows if str(r["city"]).lower() == needle]
    if category is not None:
        needle = category.strip().lower()
        rows = [r for r in rows if str(r["category"]).lower() == needle]
    return rows
