"""Generate synthetic labeled rows for pothole repair-SLA Random Forest training.

Labels are risk-based repair windows (days), not physical pavement failure
from a photo. Temperature, capped bbox, and road class as traffic load tier
are first-class signals.

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

# Cap effective bbox so close-up shots do not crush the window.
BBOX_CAP_PCT = 20.0

# Encodings (Simple Road = app localRoad)
# severity: Small=0, Medium=1, Large=2
# road_type: Simple Road=0, Service Road=1, Highway=2  (traffic/axle-load tier)
# traffic_density: Low=0, Medium=1, High=2  (derived from road_type; not independent)
# season: Winter=0, Spring=1, Summer=2, Monsoon=3, Autumn=4

SEASON_WINTER = 0
SEASON_SPRING = 1
SEASON_SUMMER = 2
SEASON_MONSOON = 3
SEASON_AUTUMN = 4
SEASON_CODES = (
    SEASON_WINTER,
    SEASON_SPRING,
    SEASON_SUMMER,
    SEASON_MONSOON,
    SEASON_AUTUMN,
)

# SLA window cuts by season (days). Monsoon dominates; summer heat next;
# spring / autumn are mild transitional penalties; winter none.
_SEASON_CUT = {
    SEASON_WINTER: 0.0,
    SEASON_SPRING: 1.0,
    SEASON_SUMMER: 2.0,
    SEASON_MONSOON: 6.0,
    SEASON_AUTUMN: 1.5,
}

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
    else:  # Large ~15–40 (includes close-ups that look huge)
        lo, hi = 12.0, 55.0
    return round(min(100.0, max(0.0, random.uniform(lo, hi))), 2)


def _temperature_for_season(season: int) -> float:
    """Seasonal temp bands for Pakistan. Clamp ~2–48."""
    if season == SEASON_WINTER:
        lo, hi = 2.0, 22.0
    elif season == SEASON_SPRING:
        lo, hi = 16.0, 32.0
    elif season == SEASON_SUMMER:
        lo, hi = 28.0, 48.0
    elif season == SEASON_MONSOON:
        lo, hi = 24.0, 38.0
    else:  # Autumn / post-monsoon
        lo, hi = 14.0, 30.0
    return round(min(48.0, max(2.0, random.uniform(lo, hi))), 1)


def _rainfall_for_season(season: int) -> int:
    """Monsoon wettest; winter / autumn drier. Still covers 0–100 overall."""
    if season == SEASON_WINTER:
        lo, hi = 0, 45
    elif season == SEASON_SPRING:
        lo, hi = 5, 55
    elif season == SEASON_SUMMER:
        lo, hi = 0, 50
    elif season == SEASON_MONSOON:
        lo, hi = 25, 100
    else:  # Autumn
        lo, hi = 5, 50
    return max(0, min(100, random.randint(lo, hi)))


def _traffic_from_road_type(road_type: int) -> int:
    """Road class is the traffic/axle-load tier (Highway > Service > Local)."""
    # Encoded identically: Simple=0→Low, Service=1→Medium, Highway=2→High
    return road_type


def _temperature_penalty(temp: float, rain: int) -> float:
    """Small climate penalty: hot asphalt softening or cool + wet stripping."""
    if temp >= 40.0:
        return 5.0
    if temp >= 35.0:
        return 3.0
    # Near-freezing / cool + moisture → binder stripping / water damage risk
    if temp <= 5.0 and rain >= 40:
        return 4.0
    if temp <= 8.0:
        return 2.0
    return 0.0


def _days_until_critical(
    severity: int,
    bbox: float,
    road_type: int,
    rain: int,
    temp: float,
    season: int,
) -> int:
    """Risk-based recommended repair window in days (SLA), not physical failure."""
    season_cut = _SEASON_CUT.get(season, 0.0)
    # Cap bbox so a close-up camera shot cannot dominate the window.
    bbox_eff = min(float(bbox), BBOX_CAP_PCT)
    # road_type alone is the load tier (no separate traffic term).
    days = (
        38.0
        - severity * 9.0
        - bbox_eff * 0.12
        - road_type * 5.0
        - (rain / 100.0) * 10.0
        - season_cut
        - _temperature_penalty(temp, rain)
        + random.gauss(0.0, 2.5)
    )
    return max(2, min(60, round(days)))


def generate_rows(n: int = N_ROWS) -> list[dict]:
    rows: list[dict] = []
    for _ in range(n):
        severity = random.choice((0, 1, 2))
        road_type = random.choice((0, 1, 2))
        traffic = _traffic_from_road_type(road_type)
        season = random.choice(SEASON_CODES)
        bbox = _bbox_for_severity(severity)
        rain = _rainfall_for_season(season)
        temp = _temperature_for_season(season)
        target = _days_until_critical(severity, bbox, road_type, rain, temp, season)
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
