"""Train per-segment Prophet models for next-month pothole-report forecasts.

A future /api/predict/maintenance step should cache/save one model per
segment_id and only refit on new months — this script retrains every run
because it is a one-shot CLI. Do not write per-segment .pkl files yet.

Run from backend/:
  python -m app.ml.train_maintenance_model
"""

from __future__ import annotations

import logging
import warnings
from pathlib import Path

import pandas as pd

logging.getLogger("matplotlib").setLevel(logging.CRITICAL)
logging.getLogger("matplotlib.font_manager").setLevel(logging.CRITICAL)
warnings.filterwarnings("ignore", message="Importing plotly failed.*")

from prophet import Prophet

DATA_PATH = Path(__file__).resolve().parent / "data" / "synthetic_maintenance_data.csv"
OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "maintenance_forecasts.csv"

COLUMNS = [
    "segment_id",
    "city",
    "area",
    "road_type",
    "predicted_report_count",
    "trend_direction",
]

REL_STABLE = 0.05
ABS_EPS = 0.25


def _silence_prophet() -> None:
    """Keep Stan/cmdstan chatter out of the ranked summary table."""
    for name in ("prophet", "cmdstanpy", "stan"):
        logger = logging.getLogger(name)
        logger.setLevel(logging.CRITICAL)
        logger.propagate = False
    try:
        import cmdstanpy

        cmdstanpy.utils.get_logger().setLevel(logging.CRITICAL)
    except Exception:
        pass


def load_history(path: Path = DATA_PATH) -> pd.DataFrame:
    frame = pd.read_csv(path)
    required = ("segment_id", "city", "area", "road_type", "month", "report_count")
    missing = [col for col in required if col not in frame.columns]
    if missing:
        raise ValueError(f"CSV missing columns: {missing}")
    return frame


def _trend_direction(last_trend: float, next_trend: float) -> str:
    delta = next_trend - last_trend
    rel = delta / max(abs(last_trend), ABS_EPS)
    if abs(delta) <= ABS_EPS or abs(rel) <= REL_STABLE:
        return "stable"
    return "increasing" if delta > 0 else "decreasing"


def forecast_segment(group: pd.DataFrame) -> dict:
    meta = group.iloc[0]
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
    future = model.make_future_dataframe(periods=1, freq="MS")
    forecast = model.predict(future)

    predicted = max(0, round(float(forecast["yhat"].iloc[-1])))
    last_trend = float(forecast["trend"].iloc[-2])
    next_trend = float(forecast["trend"].iloc[-1])
    return {
        "segment_id": meta["segment_id"],
        "city": meta["city"],
        "area": meta["area"],
        "road_type": meta["road_type"],
        "predicted_report_count": predicted,
        "trend_direction": _trend_direction(last_trend, next_trend),
    }


def train_forecasts(frame: pd.DataFrame) -> pd.DataFrame:
    rows = [
        forecast_segment(group)
        for _, group in frame.groupby("segment_id", sort=True)
    ]
    return pd.DataFrame(rows, columns=COLUMNS).sort_values(
        "predicted_report_count",
        ascending=False,
        ignore_index=True,
    )


def save_forecasts(forecasts: pd.DataFrame, path: Path = OUTPUT_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    forecasts.to_csv(path, index=False)


def print_report(forecasts: pd.DataFrame, path: Path) -> None:
    print(f"{'segment_id':<12} {'city':<14} {'area':<22} {'road_type':<14} {'pred':>5}  trend")
    for row in forecasts.itertuples(index=False):
        print(
            f"{row.segment_id:<12} {row.city:<14} {row.area:<22} "
            f"{row.road_type:<14} {row.predicted_report_count:>5}  {row.trend_direction}"
        )
    counts = forecasts["trend_direction"].value_counts()
    print(
        "Trend counts: "
        + ", ".join(
            f"{name}={int(counts.get(name, 0))}"
            for name in ("increasing", "decreasing", "stable")
        )
    )
    print(f"Saved forecasts: {path}")


def main() -> None:
    _silence_prophet()
    history = load_history()
    forecasts = train_forecasts(history)
    save_forecasts(forecasts, OUTPUT_PATH)
    print_report(forecasts, OUTPUT_PATH)


if __name__ == "__main__":
    main()
