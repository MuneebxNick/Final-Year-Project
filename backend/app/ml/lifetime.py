"""Load the lifetime Random Forest once and run encoded predictions."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from ..services.weather_service import get_weather

logger = logging.getLogger(__name__)

_KARACHI = ZoneInfo("Asia/Karachi")
FEATURE_ORDER = [
    "severity",
    "bounding_box_percentage",
    "road_type",
    "traffic_density",
    "rainfall_probability",
    "temperature_celsius",
    "season",
]
MODELS_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODELS_DIR / "lifetime_model.pkl"
ENCODERS_PATH = MODELS_DIR / "feature_encoders.json"

_SEVERITY_ALIASES = {"small": "Small", "medium": "Medium", "large": "Large"}
_ROAD_ALIASES = {
    "highway": "Highway",
    "serviceroad": "Service Road",
    "simpleroad": "Simple Road",
    "localroad": "Simple Road",
}
_TRAFFIC_ALIASES = {"low": "Low", "medium": "Medium", "high": "High"}

_model: Any | None = None
_encoders: dict[str, Any] | None = None


def _compact(value: str) -> str:
    return "".join(value.strip().lower().split())


def canonicalize_severity(value: str) -> str:
    key = value.strip().lower()
    if key not in _SEVERITY_ALIASES:
        raise ValueError("severity must be Small, Medium, or Large")
    return _SEVERITY_ALIASES[key]


def canonicalize_road_type(value: str) -> str:
    key = _compact(value)
    if key not in _ROAD_ALIASES:
        raise ValueError("road_type must be Highway, Service Road, or Simple Road")
    return _ROAD_ALIASES[key]


def canonicalize_traffic_density(value: str) -> str:
    key = value.strip().lower()
    if key not in _TRAFFIC_ALIASES:
        raise ValueError("traffic_density must be Low, Medium, or High")
    return _TRAFFIC_ALIASES[key]


def load_lifetime_model() -> None:
    """Load pkl + encoder JSON into process-wide singletons.

    Failures are logged and leave the singletons as None so
    /api/predict/lifetime can return 503 instead of crashing the app.
    """
    global _model, _encoders
    try:
        import joblib

        if not MODEL_PATH.is_file() or not ENCODERS_PATH.is_file():
            logger.warning(
                "Lifetime model artifacts missing (%s / %s); /api/predict/lifetime will return 503.",
                MODEL_PATH,
                ENCODERS_PATH,
            )
            _model = None
            _encoders = None
            return
        _model = joblib.load(MODEL_PATH)
        payload = json.loads(ENCODERS_PATH.read_text())
        if not isinstance(payload, dict):
            raise ValueError("feature_encoders.json is not an object")
        _encoders = payload
        logger.info("Lifetime model loaded from %s", MODEL_PATH)
    except Exception:
        logger.exception(
            "Failed to load lifetime model; /api/predict/lifetime will return 503."
        )
        _model = None
        _encoders = None


def get_lifetime_model() -> Any | None:
    return _model


def get_encoders() -> dict[str, Any] | None:
    return _encoders


def _label_to_int(encoders: dict[str, Any], feature: str, label: str) -> int:
    mapping = encoders.get(feature)
    if not isinstance(mapping, dict):
        raise RuntimeError(f"Missing encoder map for {feature}")
    if label not in mapping:
        raise RuntimeError(f"Unknown {feature} label: {label}")
    return int(mapping[label])


def _urgency_note(days: int) -> str:
    if days < 7:
        return "Critical"
    if days <= 30:
        return "Moderate"
    return "Low urgency"


def predict_lifetime(
    *,
    severity: str,
    bounding_box_percentage: float,
    road_type: str,
    traffic_density: str,
    location: str,
    model: Any | None = None,
    encoders: dict[str, Any] | None = None,
) -> dict[str, Any]:
    fitted = model if model is not None else _model
    maps = encoders if encoders is not None else _encoders
    if fitted is None or maps is None:
        raise RuntimeError("Lifetime model is unavailable.")

    severity_label = canonicalize_severity(severity)
    road_label = canonicalize_road_type(road_type)
    traffic_label = canonicalize_traffic_density(traffic_density)
    weather = get_weather(location)

    season_label = str(weather.get("season") or "")
    features = {
        "severity": _label_to_int(maps, "severity", severity_label),
        "bounding_box_percentage": float(bounding_box_percentage),
        "road_type": _label_to_int(maps, "road_type", road_label),
        "traffic_density": _label_to_int(maps, "traffic_density", traffic_label),
        "rainfall_probability": float(weather["rainfall_probability"]),
        "temperature_celsius": float(weather["temperature_celsius"]),
        "season": _label_to_int(maps, "season", season_label),
    }
    vector = [features[name] for name in FEATURE_ORDER]

    raw = fitted.predict([vector])[0]
    days = max(2, min(60, int(round(float(raw)))))
    deadline = (datetime.now(_KARACHI).date() + timedelta(days=days)).isoformat()
    return {
        "days_until_critical": days,
        "recommended_repair_deadline": deadline,
        "urgency_note": _urgency_note(days),
        "inputs": {
            "severity": severity_label,
            "bounding_box_percentage": bounding_box_percentage,
            "road_type": road_label,
            "traffic_density": traffic_label,
            "location": location,
        },
        "weather": {
            "rainfall_probability": weather["rainfall_probability"],
            "temperature_celsius": weather["temperature_celsius"],
            "season": weather["season"],
            "source": weather["source"],
            "latitude": weather.get("latitude"),
            "longitude": weather.get("longitude"),
            "condition": weather.get("condition"),
        },
    }
