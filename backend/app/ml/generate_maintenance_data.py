"""Generate synthetic monthly pothole-report history per road segment.

Stdlib only. Does not train a model.

Run from backend/:
  python -m app.ml.generate_maintenance_data
  python app/ml/generate_maintenance_data.py
"""

from __future__ import annotations

import csv
import random
from collections import Counter
from datetime import date
from pathlib import Path

SEED = 42
N_MONTHS = 12
END_MONTH = date(2026, 8, 1)
MONSOON_MONTHS = frozenset({6, 7, 8, 9})

# Stronger monsoon spike in the northern/eastern rainfall belt; weaker in arid south-west.
WET_BELT = frozenset(
    {"Lahore", "Islamabad", "Rawalpindi", "Sialkot", "Gujranwala", "Peshawar"}
)
ARID = frozenset({"Quetta", "Bahawalpur"})

ROAD_BASELINE = {
    "Highway": 16.0,
    "Service Road": 9.0,
    "Simple Road": 5.5,
}

# Unique city + area + road_type. Bigger cities get more segments.
SEGMENTS: list[tuple[str, str, str]] = [
    ("Lahore", "Gulberg", "Highway"),
    ("Lahore", "DHA", "Service Road"),
    ("Lahore", "Johar Town", "Simple Road"),
    ("Lahore", "Model Town", "Highway"),
    ("Lahore", "Township", "Simple Road"),
    ("Lahore", "Cantt", "Service Road"),
    ("Lahore", "Allama Iqbal Town", "Simple Road"),
    ("Lahore", "Garden Town", "Highway"),
    ("Karachi", "Clifton", "Highway"),
    ("Karachi", "Defence", "Service Road"),
    ("Karachi", "Gulshan-e-Iqbal", "Simple Road"),
    ("Karachi", "Saddar", "Highway"),
    ("Karachi", "North Nazimabad", "Simple Road"),
    ("Karachi", "Korangi", "Service Road"),
    ("Karachi", "PECHS", "Highway"),
    ("Karachi", "Gulistan-e-Jauhar", "Simple Road"),
    ("Islamabad", "F-7", "Highway"),
    ("Islamabad", "G-9", "Simple Road"),
    ("Islamabad", "Blue Area", "Service Road"),
    ("Islamabad", "F-10", "Highway"),
    ("Islamabad", "I-8", "Simple Road"),
    ("Rawalpindi", "Saddar", "Highway"),
    ("Rawalpindi", "Satellite Town", "Simple Road"),
    ("Rawalpindi", "Chaklala", "Service Road"),
    ("Rawalpindi", "Committee Chowk", "Simple Road"),
    ("Faisalabad", "D Ground", "Highway"),
    ("Faisalabad", "Peoples Colony", "Simple Road"),
    ("Faisalabad", "Jinnah Colony", "Service Road"),
    ("Faisalabad", "Madina Town", "Simple Road"),
    ("Multan", "Cantt", "Highway"),
    ("Multan", "Gulgasht", "Simple Road"),
    ("Multan", "Bosan Road", "Service Road"),
    ("Peshawar", "Hayatabad", "Highway"),
    ("Peshawar", "University Town", "Simple Road"),
    ("Peshawar", "Saddar", "Service Road"),
    ("Hyderabad", "Latifabad", "Simple Road"),
    ("Hyderabad", "Qasimabad", "Highway"),
    ("Hyderabad", "Autobahn", "Service Road"),
    ("Quetta", "Jinnah Road", "Highway"),
    ("Quetta", "Satellite Town", "Simple Road"),
    ("Sialkot", "Cantt", "Highway"),
    ("Sialkot", "Model Town", "Simple Road"),
    ("Gujranwala", "Satellite Town", "Highway"),
    ("Gujranwala", "Model Town", "Service Road"),
    ("Bahawalpur", "Model Town", "Simple Road"),
    ("Bahawalpur", "Satellite Town", "Highway"),
]

COLUMNS = [
    "segment_id",
    "city",
    "area",
    "road_type",
    "month",
    "report_count",
]

OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "synthetic_maintenance_data.csv"


def _month_window(end: date = END_MONTH, n: int = N_MONTHS) -> list[date]:
    months: list[date] = []
    year, month = end.year, end.month
    for _ in range(n):
        months.append(date(year, month, 1))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    months.reverse()
    return months


def _monsoon_multiplier(city: str) -> float:
    if city in WET_BELT:
        return random.uniform(2.0, 2.8)
    if city in ARID:
        return random.uniform(1.15, 1.4)
    return random.uniform(1.4, 1.9)


def generate_rows() -> tuple[list[dict], list[str]]:
    months = _month_window()
    rows: list[dict] = []
    patterns: list[str] = []
    for index, (city, area, road_type) in enumerate(SEGMENTS, start=1):
        segment_id = f"SEG-{index:03d}"
        pattern = random.choices(
            ("seasonal", "worsening", "stable"),
            weights=(0.40, 0.30, 0.30),
        )[0]
        patterns.append(pattern)

        baseline = ROAD_BASELINE[road_type] + random.uniform(-2.0, 2.5)
        if pattern == "stable":
            baseline *= random.uniform(0.45, 0.70)
        slope = random.uniform(0.9, 1.8) if pattern == "worsening" else 0.0
        if pattern == "worsening" and road_type == "Highway":
            slope *= 1.25
        monsoon_mult = _monsoon_multiplier(city)
        noise_sigma = 0.6 if pattern == "stable" else 1.4

        for t, month in enumerate(months):
            value = baseline
            if pattern == "seasonal" and month.month in MONSOON_MONTHS:
                value *= monsoon_mult
            elif pattern == "worsening":
                value = baseline + t * slope
            value += random.gauss(0.0, noise_sigma)
            rows.append(
                {
                    "segment_id": segment_id,
                    "city": city,
                    "area": area,
                    "road_type": road_type,
                    "month": month.isoformat(),
                    "report_count": max(0, round(value)),
                }
            )
    return rows, patterns


def write_csv(rows: list[dict], path: Path = OUTPUT_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def print_summary(rows: list[dict], patterns: list[str], path: Path) -> None:
    print(f"Wrote {len(rows)} rows to {path}")
    print("Segment count per city:")
    city_counts = Counter(seg[0] for seg in SEGMENTS)
    for city, count in city_counts.most_common():
        print(f"  {city}: {count}")
    months = sorted({row["month"] for row in rows})
    print(f"Date range: {months[0]} .. {months[-1]}")
    print("Row count:", len(rows))
    mix = Counter(patterns)
    parts = [f"{name}={mix[name]}" for name in ("seasonal", "worsening", "stable")]
    print("Pattern mix:", ", ".join(parts))
    values = [int(row["report_count"]) for row in rows]
    mean = sum(values) / len(values)
    print(f"  report_count: min={min(values)}  max={max(values)}  mean={mean:.2f}")


def main() -> None:
    random.seed(SEED)
    rows, patterns = generate_rows()
    write_csv(rows, OUTPUT_PATH)
    print_summary(rows, patterns, OUTPUT_PATH)


if __name__ == "__main__":
    main()
