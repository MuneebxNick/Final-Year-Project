"""Generate synthetic labeled rows for future pothole-lifetime Random Forest training.

Stdlib only. Does not train a model.

Run from backend/:
  python -m app.ml.generate_training_data
  python app/ml/generate_training_data.py
"""

from __future__ import annotations

import csv
import random
from collections import Counter
from pathlib import Path

N_ROWS = 2500
SEED = 42

# Encodings (Simple Road = app localRoad)
# severity: Small=0, Medium=1, Large=2
# road_type: Simple Road=0, Service Road=1, Highway=2
# traffic_density: Low=0, Medium=1, High=2
# season: Winter=0, Summer=1, Monsoon=2

COLUMNS = [
    "severity",
    "bounding_box_percentage",
    "road_type",
    "traffic_density",
    "rainfall_probability",
    "temperature_celsius",
    "season",
    "days_until_critical",
]

OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "synthetic_lifetime_data.csv"


def _bbox_for_severity(severity: int) -> float:
    """Sample bbox % with band overlap so severity is not a perfect proxy."""
    if severity == 0:  # Small ~0.5–5
        lo, hi = 0.5, 7.0
    elif severity == 1:  # Medium ~5–15
        lo, hi = 3.0, 18.0
    else:  # Large ~15–40
        lo, hi = 12.0, 40.0
    return round(min(100.0, max(0.0, random.uniform(lo, hi))), 2)


def _temperature_for_season(season: int) -> float:
    """Winter cooler, summer hotter, monsoon humid/hot. Clamp ~8–45."""
    if season == 0:  # Winter
        lo, hi = 8.0, 22.0
    elif season == 1:  # Summer
        lo, hi = 28.0, 45.0
    else:  # Monsoon
        lo, hi = 24.0, 38.0
    return round(min(45.0, max(8.0, random.uniform(lo, hi))), 1)


def _rainfall_for_season(season: int) -> int:
    """Monsoon wetter; winter drier. Still covers 0–100 overall."""
    if season == 0:  # Winter
        lo, hi = 0, 45
    elif season == 1:  # Summer
        lo, hi = 0, 55
    else:  # Monsoon
        lo, hi = 25, 100
    return max(0, min(100, random.randint(lo, hi)))


def _days_until_critical(
    severity: int,
    bbox: float,
    road_type: int,
    traffic: int,
    rain: int,
    season: int,
) -> int:
    season_cut = 6.0 if season == 2 else 2.0 if season == 1 else 0.0
    highway_high_traffic = 5.0 if road_type == 2 and traffic == 2 else 0.0
    days = (
        36.0
        - severity * 8.0
        - bbox * 0.25
        - traffic * 4.0
        - (rain / 100.0) * 10.0
        - season_cut
        - highway_high_traffic
        + random.gauss(0.0, 3.0)
    )
    return max(2, min(60, round(days)))


def generate_rows(n: int = N_ROWS) -> list[dict]:
    rows: list[dict] = []
    for _ in range(n):
        severity = random.choice((0, 1, 2))
        road_type = random.choice((0, 1, 2))
        traffic = random.choice((0, 1, 2))
        season = random.choice((0, 1, 2))
        bbox = _bbox_for_severity(severity)
        rain = _rainfall_for_season(season)
        temp = _temperature_for_season(season)
        target = _days_until_critical(severity, bbox, road_type, traffic, rain, season)
        rows.append(
            {
                "severity": severity,
                "bounding_box_percentage": bbox,
                "road_type": road_type,
                "traffic_density": traffic,
                "rainfall_probability": rain,
                "temperature_celsius": temp,
                "season": season,
                "days_until_critical": target,
            }
        )
    return rows


def write_csv(rows: list[dict], path: Path = OUTPUT_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def _numeric_summary(rows: list[dict], key: str) -> str:
    values = [float(row[key]) for row in rows]
    mean = sum(values) / len(values)
    return f"  {key}: min={min(values):.2f}  max={max(values):.2f}  mean={mean:.2f}"


def _count_summary(rows: list[dict], key: str) -> str:
    counts = Counter(int(row[key]) for row in rows)
    parts = [f"{k}={counts[k]}" for k in sorted(counts)]
    return f"  {key}: " + ", ".join(parts)


def print_summary(rows: list[dict], path: Path) -> None:
    print(f"Wrote {len(rows)} rows to {path}")
    print("Row count:", len(rows))
    print("Feature / target ranges:")
    for key in (
        "bounding_box_percentage",
        "rainfall_probability",
        "temperature_celsius",
        "days_until_critical",
    ):
        print(_numeric_summary(rows, key))
    print("Categorical counts:")
    for key in ("severity", "road_type", "traffic_density", "season"):
        print(_count_summary(rows, key))


def main() -> None:
    random.seed(SEED)
    rows = generate_rows(N_ROWS)
    write_csv(rows, OUTPUT_PATH)
    print_summary(rows, OUTPUT_PATH)


if __name__ == "__main__":
    main()
