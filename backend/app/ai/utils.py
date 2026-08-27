"""Helpers for turning YOLO boxes into Title-Case severity labels."""

from __future__ import annotations

# Hole wider or taller than this share of the photo → phone is too close.
CLOSEUP_SPAN_PCT = 20.0
CLOSEUP_AREA_PCT = 15.0


def _span_and_area(
    box: tuple[float, float, float, float],
    image_width: int,
    image_height: int,
) -> tuple[float, float, float]:
    x1, y1, x2, y2 = box
    box_w = max(0.0, x2 - x1)
    box_h = max(0.0, y2 - y1)
    width_pct = box_w / float(image_width) * 100
    height_pct = box_h / float(image_height) * 100
    area_pct = (box_w * box_h) / (float(image_width) * float(image_height)) * 100
    return width_pct, height_pct, round(area_pct, 2)


def is_closeup_photo(
    box: tuple[float, float, float, float],
    image_width: int,
    image_height: int,
) -> bool:
    """True when one hole dominates the frame (typical single-hole close-up)."""
    if image_width <= 0 or image_height <= 0:
        return False
    width_pct, height_pct, area_pct = _span_and_area(box, image_width, image_height)
    return width_pct >= CLOSEUP_SPAN_PCT or height_pct >= CLOSEUP_SPAN_PCT or area_pct > CLOSEUP_AREA_PCT


def severity_from_area(percentage: float) -> str:
    if percentage < 5:
        return "Small"
    if percentage <= 15:
        return "Medium"
    return "Large"


def classify_severity(
    box: tuple[float, float, float, float],
    image_width: int,
    image_height: int,
    *,
    cap_closeup: bool = False,
) -> tuple[str, float]:
    """Return (severity_label, area_percentage) for a pixel xyxy box.

    Area bands: < 5 Small, 5–15 Medium, > 15 Large.

    cap_closeup: only for a *single* hole filling the photo. Do not use when
    several potholes are visible — then the bigger hole should stay Large.
    """
    if image_width <= 0 or image_height <= 0:
        return "Small", 0.0

    _, _, percentage = _span_and_area(box, image_width, image_height)
    label = severity_from_area(percentage)
    if cap_closeup and is_closeup_photo(box, image_width, image_height) and label == "Large":
        return "Medium", percentage
    return label, percentage
