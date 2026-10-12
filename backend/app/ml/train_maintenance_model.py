"""Train per-segment Prophet models for next-month pothole-report forecasts.

One model per segment_id. This script retrains every run because it is a
one-shot CLI. Do not write per-segment .pkl files.

Run from backend/:
  python -m app.ml.train_maintenance_model

Writes maintenance_forecasts_v2.csv only. The city-level
maintenance_forecasts.csv is left untouched.
"""

from __future__ import annotations

import logging
import multiprocessing
import os
import warnings
from pathlib import Path

# One Stan thread per worker. Set before numpy/prophet import; spawn children
# inherit the environment, so each fit stays single-threaded.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

logging.getLogger("matplotlib").setLevel(logging.CRITICAL)
logging.getLogger("matplotlib.font_manager").setLevel(logging.CRITICAL)
warnings.filterwarnings("ignore", message="Importing plotly failed.*")
for _logger_name in ("prophet", "cmdstanpy", "stan"):
    _logger = logging.getLogger(_logger_name)
    _logger.setLevel(logging.CRITICAL)
    _logger.propagate = False
    _logger.disabled = True

import pandas as pd
from prophet import Prophet

DATA_PATH = Path(__file__).resolve().parent / "data" / "synthetic_maintenance_data_v2.csv"
OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "maintenance_forecasts_v2.csv"
# City-level history. Never pass this to save_forecasts.
LEGACY_FORECASTS_PATH = Path(__file__).resolve().parent / "data" / "maintenance_forecasts.csv"

COLUMNS = [
    "segment_id",
    "province",
    "city",
    "area",
    "road_type",
    "predicted_reports_next_30_days",
    "historical_avg_reports_per_30_days",
    "trend_direction",
]

REL_STABLE = 0.05
ABS_EPS = 0.25


def _silence_prophet() -> None:
    """Keep Stan/cmdstan chatter out of the progress log."""
    logging.getLogger("matplotlib").setLevel(logging.CRITICAL)
    logging.getLogger("matplotlib.font_manager").setLevel(logging.CRITICAL)
    warnings.filterwarnings("ignore", message="Importing plotly failed.*")
    for name in ("prophet", "cmdstanpy", "stan"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.setLevel(logging.CRITICAL)
        logger.propagate = False
        logger.disabled = True
    try:
        import cmdstanpy

        stan_logger = cmdstanpy.utils.get_logger()
        stan_logger.handlers.clear()
        stan_logger.setLevel(logging.CRITICAL)
        stan_logger.propagate = False
        stan_logger.disabled = True
    except Exception:
        pass


def load_history(path: Path = DATA_PATH) -> pd.DataFrame:
    frame = pd.read_csv(path)
    required = (
        "segment_id",
        "province",
        "city",
        "area",
        "road_type",
        "month",
        "report_count",
    )
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


def _historical_avg_reports_per_30_days(group: pd.DataFrame) -> float:
    """Mean monthly report_count, rounded to 2 decimals.

    Each history row is one month, and the API treats that month as the
    30-day baseline. Same definition maintenance.py used at startup.
    """
    return round(float(group["report_count"].mean()), 2)


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
        "province": meta["province"],
        "city": meta["city"],
        "area": meta["area"],
        "road_type": meta["road_type"],
        "predicted_reports_next_30_days": predicted,
        "historical_avg_reports_per_30_days": _historical_avg_reports_per_30_days(group),
        "trend_direction": _trend_direction(last_trend, next_trend),
    }


def _forecast_records(records: list[dict]) -> dict:
    """Picklable pool worker. records is one segment's monthly history."""
    _silence_prophet()
    return forecast_segment(pd.DataFrame.from_records(records))


def _worker_count(n_tasks: int) -> int:
    cpu = os.cpu_count() or 2
    return max(2, min(n_tasks, cpu - 1 if cpu > 1 else 2))


def train_forecasts(frame: pd.DataFrame) -> pd.DataFrame:
    payloads = [
        group.to_dict(orient="records")
        for _, group in frame.groupby("segment_id", sort=True)
    ]
    total = len(payloads)
    if total == 0:
        return pd.DataFrame(columns=COLUMNS)

    workers = _worker_count(total)
    print(f"Training {total} Prophet models with {workers} workers", flush=True)

    # Import the real module name so spawn can unpickle the worker. Running
    # this file as __main__ (python -m) would otherwise pickle __main__._forecast_records.
    import app.ml.train_maintenance_model as trainer

    rows: list[dict] = []
    context = multiprocessing.get_context("spawn")
    with context.Pool(
        processes=workers,
        initializer=trainer._silence_prophet,
    ) as pool:
        for done, row in enumerate(
            pool.imap_unordered(trainer._forecast_records, payloads),
            start=1,
        ):
            rows.append(row)
            print(f"completed {done}/{total}", flush=True)

    forecasts = pd.DataFrame(rows, columns=COLUMNS)
    if forecasts[COLUMNS].isna().any().any():
        raise ValueError("Forecast table has nulls in required columns")
    return forecasts.sort_values(
        "predicted_reports_next_30_days",
        ascending=False,
        ignore_index=True,
    )


def save_forecasts(forecasts: pd.DataFrame, path: Path = OUTPUT_PATH) -> None:
    if path.resolve() == LEGACY_FORECASTS_PATH.resolve():
        raise RuntimeError(
            f"Refusing to overwrite city-level forecasts at {LEGACY_FORECASTS_PATH}"
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    forecasts.to_csv(path, index=False)


def print_report(forecasts: pd.DataFrame, path: Path) -> None:
    print(
        f"{'segment_id':<10} {'province':<12} {'city':<18} {'area':<24} "
        f"{'road_type':<14} {'pred':>5} {'hist':>7}  trend"
    )
    for row in forecasts.itertuples(index=False):
        print(
            f"{row.segment_id:<10} {row.province:<12} {row.city:<18} {row.area:<24} "
            f"{row.road_type:<14} {row.predicted_reports_next_30_days:>5} "
            f"{row.historical_avg_reports_per_30_days:>7.2f}  {row.trend_direction}"
        )
    counts = forecasts["trend_direction"].value_counts()
    print(
        "Trend counts: "
        + ", ".join(
            f"{name}={int(counts.get(name, 0))}"
            for name in ("increasing", "decreasing", "stable")
        )
    )
    print(f"Rows: {len(forecasts)}")
    print(f"Saved forecasts: {path}")


def main() -> None:
    _silence_prophet()
    history = load_history()
    forecasts = train_forecasts(history)
    save_forecasts(forecasts, OUTPUT_PATH)
    print_report(forecasts, OUTPUT_PATH)


if __name__ == "__main__":
    main()
