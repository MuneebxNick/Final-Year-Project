"""Startup-cached area forecasts for predictive maintenance.

Prophet is fit offline by train_maintenance_model.py. Startup only reads
maintenance_forecasts_v2.csv and derives risk, priority, and budget.
Priority percentiles are assigned once on the full nationwide table.
"""

from __future__ import annotations

import logging
import math
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent / "data"
FORECASTS_PATH = DATA_DIR / "maintenance_forecasts_v2.csv"

_BUDGET_BASE = 100_000
_COST_PER_REPORT = {
    "Highway": 150_000,
    "Service Road": 90_000,
    "Simple Road": 60_000,
}

_FORECAST_COLUMNS = (
    "segment_id",
    "province",
    "city",
    "area",
    "road_type",
    "predicted_reports_next_30_days",
    "historical_avg_reports_per_30_days",
    "trend_direction",
)

HIGH_RISK_WINDOW = "High risk within 1-2 weeks"
MODERATE_RISK_WINDOW = "Moderate risk within 3-4 weeks"
LOW_RISK_WINDOW = "Low risk (30+ days)"

_segments: list[dict] | None = None


def _budget_estimate_pkr(road_type: str, predicted_reports_next_30_days: int) -> int:
    per_report = _COST_PER_REPORT.get(road_type, _COST_PER_REPORT["Simple Road"])
    return _BUDGET_BASE + per_report * int(predicted_reports_next_30_days)


def derive_risk_window(trend: str, predicted: int, historical_avg: float) -> str:
    """Deterministic heuristic from 30-day forecast + trend + historical baseline,
    not a separately trained time-to-failure model."""
    if historical_avg == 0:
        ratio = float("inf") if predicted > 0 else 0.0
    else:
        ratio = predicted / historical_avg
    if trend == "increasing" and ratio >= 1.5:
        return HIGH_RISK_WINDOW
    if trend in ("increasing", "stable") and ratio >= 1.0:
        return MODERATE_RISK_WINDOW
    return LOW_RISK_WINDOW


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


def _load_forecasts_csv(path: Path) -> list[dict] | None:
    try:
        import pandas as pd

        if not path.is_file():
            return None
        frame = pd.read_csv(path)
        missing = [col for col in _FORECAST_COLUMNS if col not in frame.columns]
        if missing or frame.empty:
            logger.warning(
                "Maintenance forecasts CSV missing columns %s or empty (%s).",
                missing,
                path,
            )
            return None
        if frame.loc[:, list(_FORECAST_COLUMNS)].isna().any().any():
            logger.warning(
                "Maintenance forecasts CSV has nulls in required columns (%s).",
                path,
            )
            return None
        rows: list[dict] = []
        for row in frame.itertuples(index=False):
            predicted = int(row.predicted_reports_next_30_days)
            avg = round(float(row.historical_avg_reports_per_30_days), 2)
            trend = str(row.trend_direction)
            road_type = str(row.road_type)
            rows.append(
                {
                    "segment_id": str(row.segment_id),
                    "province": str(row.province),
                    "city": str(row.city),
                    "area": str(row.area),
                    "road_type": road_type,
                    "predicted_reports_next_30_days": predicted,
                    "historical_avg_reports_per_30_days": avg,
                    "trend_direction": trend,
                    "risk_window": derive_risk_window(trend, predicted, avg),
                    "budget_estimate_pkr": _budget_estimate_pkr(road_type, predicted),
                }
            )
        return rows
    except Exception:
        logger.exception("Failed to load maintenance forecasts CSV from %s", path)
        return None


def load_maintenance() -> None:
    """Read cached area forecasts and derive risk, priority, and budget.

    Failures are logged and leave the cache empty so
    /api/predictive-maintenance can return 503 instead of crashing the app.
    """
    global _segments
    _segments = None
    try:
        if not FORECASTS_PATH.is_file():
            logger.warning(
                "Maintenance forecasts CSV missing (%s); "
                "/api/predictive-maintenance will return 503.",
                FORECASTS_PATH,
            )
            return

        forecast_rows = _load_forecasts_csv(FORECASTS_PATH)
        if forecast_rows is None:
            logger.warning(
                "Maintenance forecasts CSV unusable (%s); "
                "/api/predictive-maintenance will return 503.",
                FORECASTS_PATH,
            )
            return

        forecast_rows.sort(
            key=lambda r: int(r["predicted_reports_next_30_days"]),
            reverse=True,
        )
        _assign_categories(forecast_rows)
        for row in forecast_rows:
            row["priority"] = row["category"]
        _segments = forecast_rows
        logger.info(
            "Maintenance forecasts loaded (%d segments) from %s",
            len(_segments),
            FORECASTS_PATH,
        )
    except Exception:
        logger.exception(
            "Failed to load maintenance forecasts; "
            "/api/predictive-maintenance will return 503."
        )
        _segments = None


def list_segments(
    province: str | None = None,
    city: str | None = None,
    category: str | None = None,
) -> list[dict] | None:
    """Return cached segments, optionally filtered. None if cache unavailable.

    Filters combine with AND. Priority is not recomputed on the subset.
    """
    if _segments is None:
        return None
    rows = _segments
    if province is not None:
        needle = province.strip().lower()
        rows = [r for r in rows if str(r["province"]).lower() == needle]
    if city is not None:
        needle = city.strip().lower()
        rows = [r for r in rows if str(r["city"]).lower() == needle]
    if category is not None:
        needle = category.strip().lower()
        rows = [r for r in rows if str(r["category"]).lower() == needle]
    return rows
