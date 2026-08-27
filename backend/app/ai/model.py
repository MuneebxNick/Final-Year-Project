"""Load the pothole YOLOv8 weights once at process start."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

HF_MODEL_URL = "https://huggingface.co/Samdutse/pothole-yolov8/resolve/main/best.pt"

_model: Any | None = None


def load_model() -> None:
    """Download/cache Hugging Face weights and keep a process-wide singleton.

    Failures are logged and leave the singleton as None so /api/detect can
    return 503 instead of crashing the app.
    """
    global _model
    try:
        from ultralytics import YOLO

        logger.info("Loading pothole YOLO model from Hugging Face…")
        _model = YOLO(HF_MODEL_URL)
        logger.info("Pothole YOLO model loaded.")
    except Exception:
        logger.exception("Failed to load pothole YOLO model; /api/detect will return 503.")
        _model = None


def get_model() -> Any | None:
    return _model
