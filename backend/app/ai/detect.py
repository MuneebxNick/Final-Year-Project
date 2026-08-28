"""Image-in / result-out pothole detection. No Cloudinary or database writes."""

from __future__ import annotations

from dataclasses import dataclass, replace
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from .model import get_model
from .utils import classify_severity

_SEVERITY_RANK = {"Small": 1, "Medium": 2, "Large": 3}

# A box below this confidence may still be reported, but it must not be the one
# that promotes a report to Large.
_PROMOTE_MIN_CONFIDENCE = 0.5

# Promotion is only for a hole already near the 15% Large boundary that also
# clearly dominates the next-biggest one. Without both gates the rule fires on
# almost any multi-box photo and severity ends up depending on how many holes
# happen to be in frame.
_PROMOTE_MIN_AREA_PCT = 12.0
_PROMOTE_RATIO = 2.0


class DetectionError(Exception):
    """Base class for failures the HTTP layer maps to status codes."""


class InvalidImageError(DetectionError):
    """Image bytes could not be decoded."""


class ModelUnavailableError(DetectionError):
    """YOLO weights were not loaded at startup."""


class InferenceError(DetectionError):
    """model.predict() failed."""


@dataclass(frozen=True)
class BoxDetection:
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    severity: str
    area_percentage: float


@dataclass(frozen=True)
class DetectionResult:
    detections: list[BoxDetection]
    highest_severity: str | None
    message: str | None


def _promote_largest_hole(detections: list[BoxDetection]) -> list[BoxDetection]:
    """When several holes are in one photo, a near-Large dominant one is Large."""
    ranked = sorted(detections, key=lambda item: item.area_percentage)
    largest = ranked[-1]
    second = ranked[-2]
    bigger_enough = (
        largest.area_percentage >= _PROMOTE_MIN_AREA_PCT
        and largest.area_percentage >= second.area_percentage * _PROMOTE_RATIO
    )
    if not bigger_enough or largest.severity == "Large":
        return detections
    if largest.confidence < _PROMOTE_MIN_CONFIDENCE:
        return detections
    return [
        replace(item, severity="Large")
        if item.x1 == largest.x1 and item.y1 == largest.y1 and item.x2 == largest.x2 and item.y2 == largest.y2
        else item
        for item in detections
    ]


def run_detection(image_bytes: bytes) -> DetectionResult:
    try:
        opened = Image.open(BytesIO(image_bytes))
        # Phones record rotation in EXIF rather than rotating the pixels. Bake it
        # in before size is read so boxes and area_percentage use the orientation
        # the user actually sees.
        image = (ImageOps.exif_transpose(opened) or opened).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidImageError("Could not read the image.") from exc

    width, height = image.size

    model = get_model()
    if model is None:
        raise ModelUnavailableError("Pothole model is unavailable.")

    try:
        # Larger imgsz so distant/small potholes are less likely to be dropped;
        # conf high enough that faint artifacts never reach the UI or the database.
        results = model.predict(
            image,
            verbose=False,
            device="cpu",
            conf=0.35,
            iou=0.5,
            imgsz=1280,
            max_det=50,
        )
    except Exception as exc:
        raise InferenceError("Pothole detection failed.") from exc

    detections: list[BoxDetection] = []
    for result in results or []:
        boxes = result.boxes
        if boxes is None:
            continue
        for box in boxes:
            x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
            confidence = round(float(box.conf[0]), 2)
            severity, area_percentage = classify_severity(
                (x1, y1, x2, y2),
                width,
                height,
                cap_closeup=False,
            )
            detections.append(
                BoxDetection(
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                    confidence=confidence,
                    severity=severity,
                    area_percentage=area_percentage,
                )
            )

    if not detections:
        return DetectionResult(
            detections=[],
            highest_severity=None,
            message="No potholes detected.",
        )

    if len(detections) == 1:
        only = detections[0]
        severity, _ = classify_severity(
            (only.x1, only.y1, only.x2, only.y2),
            width,
            height,
            cap_closeup=True,
        )
        detections = [replace(only, severity=severity)]
    else:
        detections = _promote_largest_hole(detections)

    highest_severity = max(detections, key=lambda item: _SEVERITY_RANK.get(item.severity, 0)).severity
    return DetectionResult(detections=detections, highest_severity=highest_severity, message=None)
