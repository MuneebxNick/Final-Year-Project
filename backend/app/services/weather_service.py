"""Open-Meteo geocoding + current weather. Always returns a dict."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import httpx

_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
_TIMEOUT = 8.0
_KARACHI = ZoneInfo("Asia/Karachi")

_GEOCODE_CACHE: dict[str, tuple[float, float] | None] = {}

_FALLBACK_RAIN = 30
_FALLBACK_TEMP = 28.0


def _season_now() -> str:
    month = datetime.now(_KARACHI).month
    if month in (6, 7, 8, 9):
        return "Monsoon"
    if month in (11, 12, 1, 2):
        return "Winter"
    return "Summer"


def _geocode_query(location: str) -> str:
    query = location.strip()
    if "pakistan" not in query.lower():
        query = f"{query}, Pakistan"
    return query


def _pick_pakistan_result(results: list[dict]) -> dict | None:
    if not results:
        return None
    for item in results:
        if str(item.get("country_code", "")).upper() == "PK":
            return item
    return results[0]


def _coords_from_result(item: dict) -> tuple[float, float] | None:
    try:
        lat = float(item["latitude"])
        lon = float(item["longitude"])
    except (KeyError, TypeError, ValueError):
        return None
    return (lat, lon)


def get_coordinates(location: str) -> tuple[float, float] | None:
    cache_key = location.strip().lower()
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(
                _GEOCODE_URL,
                params={
                    "name": _geocode_query(location),
                    "count": 5,
                    "language": "en",
                    "countryCode": "PK",
                },
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError, TypeError):
        _GEOCODE_CACHE[cache_key] = None
        return None

    results = payload.get("results") if isinstance(payload, dict) else None
    if not isinstance(results, list) or not results:
        _GEOCODE_CACHE[cache_key] = None
        return None

    chosen = _pick_pakistan_result(results)
    coords = _coords_from_result(chosen) if chosen else None
    _GEOCODE_CACHE[cache_key] = coords
    return coords


def _rain_at_current_hour(hourly: dict, current_time: str | None) -> int | None:
    times = hourly.get("time") or []
    probs = hourly.get("precipitation_probability") or []
    if not isinstance(probs, list) or not probs:
        return None

    idx = 0
    if current_time and isinstance(times, list):
        if current_time in times:
            idx = times.index(current_time)
        else:
            hour_prefix = current_time[:13]
            for i, stamp in enumerate(times):
                if isinstance(stamp, str) and stamp.startswith(hour_prefix):
                    idx = i
                    break
    if idx >= len(probs):
        idx = 0
    try:
        return int(round(float(probs[idx])))
    except (TypeError, ValueError):
        return None


def _fetch_forecast(lat: float, lon: float) -> tuple[int, float] | None:
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(
                _FORECAST_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m",
                    "hourly": "precipitation_probability",
                    "forecast_days": 1,
                    "timezone": "Asia/Karachi",
                },
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError, TypeError):
        return None

    if not isinstance(payload, dict):
        return None

    current = payload.get("current") or {}
    hourly = payload.get("hourly") or {}
    if not isinstance(current, dict) or not isinstance(hourly, dict):
        return None

    try:
        temperature = float(current["temperature_2m"])
    except (KeyError, TypeError, ValueError):
        return None

    rain = _rain_at_current_hour(hourly, current.get("time") if isinstance(current.get("time"), str) else None)
    if rain is None:
        return None
    return (rain, temperature)


def get_weather(location: str) -> dict:
    season = _season_now()
    fallback = {
        "location": location,
        "latitude": None,
        "longitude": None,
        "rainfall_probability": _FALLBACK_RAIN,
        "temperature_celsius": _FALLBACK_TEMP,
        "season": season,
        "source": "fallback",
    }
    try:
        coords = get_coordinates(location)
        if coords is None:
            return fallback
        lat, lon = coords
        forecast = _fetch_forecast(lat, lon)
        if forecast is None:
            return {**fallback, "latitude": lat, "longitude": lon}
        rain, temperature = forecast
        return {
            "location": location,
            "latitude": lat,
            "longitude": lon,
            "rainfall_probability": max(0, min(100, rain)),
            "temperature_celsius": temperature,
            "season": season,
            "source": "open-meteo",
        }
    except Exception:
        return fallback
