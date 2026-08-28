"""Load the pothole YOLOv8 weights once at process start."""

from __future__ import annotations

import logging
import urllib.request
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

HF_MODEL_URL = "https://huggingface.co/EngJamesO/pothole-detector/resolve/main/models/yolov8n.pt"

WEIGHTS_DIR = Path(__file__).resolve().parents[2] / "weights"
LOCAL_WEIGHTS = WEIGHTS_DIR / "yolov8n.pt"

_model: Any | None = None


def _ensure_weights() -> Path:
    """Return the local checkpoint path, downloading it once if missing."""
    if LOCAL_WEIGHTS.exists():
        return LOCAL_WEIGHTS

    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading pothole weights from %s", HF_MODEL_URL)
    # Download beside the target then rename: an interrupted download must not
    # leave a truncated .pt that every later startup would try to parse.
    staged = LOCAL_WEIGHTS.with_suffix(".part")
    try:
        with urllib.request.urlopen(HF_MODEL_URL) as response, staged.open("wb") as target:
            while chunk := response.read(1 << 20):
                target.write(chunk)
        staged.replace(LOCAL_WEIGHTS)
    except BaseException:
        staged.unlink(missing_ok=True)
        raise
    return LOCAL_WEIGHTS


def load_model() -> None:
    """Load the cached weights and keep a process-wide singleton.

    Failures are logged and leave the singleton as None so /api/detect can
    return 503 instead of crashing the app.
    """
    global _model
    try:
        from ultralytics import YOLO

        weights = _ensure_weights()
        logger.info("Loading pothole YOLO model from %s…", weights)
        _model = YOLO(str(weights))
        logger.info("Pothole YOLO model loaded.")
    except Exception:
        logger.exception("Failed to load pothole YOLO model; /api/detect will return 503.")
        _model = None


def get_model() -> Any | None:
    return _model
