"""Load the lifetime Random Forest once and run encoded predictions.

Output is a risk-based recommended repair SLA window (days), not a claim of
physical pavement failure from a single 2D photo. Features: image severity,
capped bbox area%, road class as traffic/axle-load tier, and live weather
(rain, temperature, season).
"""

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

# Close-up photos inflate area%; cap before scoring so severity + road + weather dominate.
BBOX_CAP_PCT = 20.0

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
_SEASON_ALIASES = {
    "winter": "Winter",
    "spring": "Spring",
    "summer": "Summer",
    "monsoon": "Monsoon",
    "autumn": "Autumn",
    "fall": "Autumn",
    "postmonsoon": "Autumn",
    "post-monsoon": "Autumn",
}

# Highway > Service Road > Local (Simple Road) as axle-load / traffic tier.
_TRAFFIC_FROM_ROAD = {
    "Highway": "High",
    "Service Road": "Medium",
    "Simple Road": "Low",
}

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


def traffic_density_from_road_type(road_type: str) -> str:
    """Derive traffic density from road class — sole traffic/axle-load proxy."""
    road_label = canonicalize_road_type(road_type)
    return _TRAFFIC_FROM_ROAD[road_label]


def canonicalize_season(value: str) -> str:
    key = _compact(value)
    if key not in _SEASON_ALIASES:
        raise ValueError(
            "season must be Spring, Summer, Monsoon, Autumn, or Winter"
        )
    return _SEASON_ALIASES[key]


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


def _priority_band(days: int) -> str:
    """SLA urgency band for the recommended repair window."""
    if days < 7:
        return "Critical"
    if days <= 14:
        return "High"
    if days <= 30:
        return "Moderate"
    return "Routine"


def _contributing_factors(
    *,
    severity: str,
    road_type: str,
    rainfall_probability: float,
    temperature_celsius: float,
    season: str,
) -> str:
    rain = int(round(float(rainfall_probability)))
    temp = int(round(float(temperature_celsius)))
    return (
        f"Severity: {severity} · Road class: {road_type} · "
        f"Rain: {rain}% · Temp: {temp}°C · Season: {season}"
    )


def predict_lifetime(
    *,
    severity: str,
    bounding_box_percentage: float,
    road_type: str,
    traffic_density: str | None = None,
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
    # Ignore client traffic_density — road class is the sole load tier.
    traffic_label = traffic_density_from_road_type(road_label)
    _ = traffic_density  # accepted for API compat; not used independently
    weather = get_weather(location)

    season_label = canonicalize_season(str(weather.get("season") or ""))
    rain = float(weather["rainfall_probability"])
    temp = float(weather["temperature_celsius"])
    bbox_raw = float(bounding_box_percentage)
    bbox_for_model = min(max(0.0, bbox_raw), BBOX_CAP_PCT)

    features = {
        "severity": _label_to_int(maps, "severity", severity_label),
        "bounding_box_percentage": bbox_for_model,
        "road_type": _label_to_int(maps, "road_type", road_label),
        "traffic_density": _label_to_int(maps, "traffic_density", traffic_label),
        "rainfall_probability": rain,
        "temperature_celsius": temp,
        "season": _label_to_int(maps, "season", season_label),
    }
    vector = [features[name] for name in FEATURE_ORDER]

    raw = fitted.predict([vector])[0]
    days = max(2, min(60, int(round(float(raw)))))
    band = _priority_band(days)
    deadline = (datetime.now(_KARACHI).date() + timedelta(days=days)).isoformat()
    factors = _contributing_factors(
        severity=severity_label,
        road_type=road_label,
        rainfall_probability=rain,
        temperature_celsius=temp,
        season=season_label,
    )
    return {
        "days_until_critical": days,
        "recommended_repair_deadline": deadline,
        "urgency_note": band,
        "priority_band": band,
        "contributing_factors": factors,
        "inputs": {
            "severity": severity_label,
            "bounding_box_percentage": bbox_raw,
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
