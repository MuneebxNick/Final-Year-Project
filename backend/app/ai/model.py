"""Load the RahScan YOLOv8s pothole weights once at process start."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

WEIGHTS_DIR = Path(__file__).resolve().parents[2] / "weights"
LOCAL_WEIGHTS = WEIGHTS_DIR / "newv8s.pt"

_model: Any | None = None


def load_model() -> None:
    """Load newv8s.pt into the process-wide singleton."""
    global _model
    if not LOCAL_WEIGHTS.is_file():
        logger.error("Pothole weights missing at %s; /api/detect will return 503.", LOCAL_WEIGHTS)
        _model = None
        return
    try:
        from ultralytics import YOLO
    except Exception:
        logger.exception("Failed to import ultralytics; /api/detect will return 503.")
        _model = None
        return
    try:
        logger.info("Loading pothole model from %s…", LOCAL_WEIGHTS)
        _model = YOLO(str(LOCAL_WEIGHTS))
        logger.info("Pothole model loaded.")
    except Exception:
        logger.exception("Failed to load pothole model.")
        _model = None


def get_model() -> Any | None:
    return _model
