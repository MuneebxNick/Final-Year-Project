"""Dummy pothole detector — copies seedHash / mockDetect from src/models/report.ts."""

from __future__ import annotations

SEVERITIES = ("small", "medium", "large")


def seed_hash(city: str, area: str) -> int:
    value = 0
    for char in f"{city}|{area}":
        value = (value * 31 + ord(char)) & 0xFFFFFFFF
    return value


def mock_detect(city: str, area: str) -> dict:
    hashed = seed_hash(city, area)
    return {
        "severity": SEVERITIES[hashed % len(SEVERITIES)],
        "confidence": 72 + (hashed % 24),
        "boundingBox": {
            "left": 16 + (hashed % 14),
            "top": 24 + (hashed % 18),
            "width": 40 + (hashed % 20),
            "height": 26 + (hashed % 14),
        },
    }
