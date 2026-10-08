"""Load pothole YOLO weights once at process start.

oldv8n is the app's current detector. newv8s, newv8n, and refrencev8s are
temporary comparison checkpoints downloaded from Kaggle notebooks.
"""

from __future__ import annotations

import logging
import urllib.request
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

HF_MODEL_URL = "https://huggingface.co/EngJamesO/pothole-detector/resolve/main/models/yolov8n.pt"

WEIGHTS_DIR = Path(__file__).resolve().parents[2] / "weights"
LOCAL_WEIGHTS = WEIGHTS_DIR / "yolov8n.pt"

# Keys the compare screen can request. oldv8n stays the default for /api/detect.
MODEL_KEYS = ("oldv8n", "newv8s", "newv8n", "refrencev8s")
MODEL_FILES = {
    "oldv8n": LOCAL_WEIGHTS,
    "newv8s": WEIGHTS_DIR / "newv8s.pt",
    "newv8n": WEIGHTS_DIR / "newv8n.pt",
    "refrencev8s": WEIGHTS_DIR / "refrencev8s.pt",
}

_models: dict[str, Any] = {}


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
    """Load every comparison checkpoint and keep them for the process.

    A failure on one file does not drop the others. /api/detect still uses
    oldv8n, and returns 503 only when that checkpoint is missing.
    """
    global _models
    loaded: dict[str, Any] = {}
    try:
        from ultralytics import YOLO
    except Exception:
        logger.exception("Failed to import ultralytics; /api/detect will return 503.")
        _models = {}
        return

    for key in MODEL_KEYS:
        try:
            weights = _ensure_weights() if key == "oldv8n" else MODEL_FILES[key]
            if key != "oldv8n" and not weights.is_file():
                logger.warning("Comparison weights missing for %s (%s).", key, weights)
                continue
            logger.info("Loading %s from %s…", key, weights)
            loaded[key] = YOLO(str(weights))
            logger.info("%s loaded.", key)
        except Exception:
            logger.exception("Failed to load %s.", key)
    _models = loaded
    if "oldv8n" not in _models:
        logger.error("oldv8n did not load; /api/detect will return 503.")


def get_model(key: str = "oldv8n") -> Any | None:
    return _models.get(key)
