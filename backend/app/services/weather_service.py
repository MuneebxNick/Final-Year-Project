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
_COUNTRY_ALIASES = frozenset({"pakistan", "pk"})
_GEOCODE_COUNT = 10


def _season_now() -> str:
    month = datetime.now(_KARACHI).month
    if month in (6, 7, 8, 9):
        return "Monsoon"
    if month in (11, 12, 1, 2):
        return "Winter"
    return "Summer"


def _location_parts(location: str) -> list[str]:
    """Split 'Area, City, Pakistan' into significant parts, dropping country suffixes."""
    parts = [p.strip() for p in location.split(",") if p.strip()]
    while parts and parts[-1].lower() in _COUNTRY_ALIASES:
        parts.pop()
    return parts


def _query_names(location: str) -> list[str]:
    """Ordered geocoding names. Comma-qualifiers are tried first, then area, then city."""
    original = location.strip()
    parts = _location_parts(original)
    names: list[str] = []

    def _add(name: str) -> None:
        key = name.strip()
        if key and key.lower() not in {n.lower() for n in names}:
            names.append(key)

    _add(original)
    if parts:
        _add(", ".join(parts))
        _add(parts[0])
        if len(parts) >= 2:
            _add(parts[-1])
    return names


def _admin_blob(item: dict) -> str:
    return " ".join(
        str(item.get(key) or "")
        for key in ("name", "admin1", "admin2", "admin3", "admin4")
    ).lower()


def _hint_in_result(item: dict, hint: str) -> bool:
    needle = hint.strip().lower()
    return bool(needle) and needle in _admin_blob(item)


def _result_score(item: dict, area: str, city: str | None) -> tuple:
    name = str(item.get("name") or "").lower()
    area_l = area.strip().lower()
    city_l = (city or "").strip().lower()
    try:
        population = int(item.get("population") or 0)
    except (TypeError, ValueError):
        population = 0
    pk = 1 if str(item.get("country_code") or "").upper() == "PK" else 0
    return (
        pk,
        1 if city_l and _hint_in_result(item, city_l) else 0,
        1 if city_l and name == city_l else 0,
        1 if area_l and name == area_l else 0,
        1 if area_l and area_l in name else 0,
        population,
    )


def _pick_result(results: list[dict], parts: list[str], query_name: str) -> dict | None:
    if not results:
        return None
    pk_results = [item for item in results if str(item.get("country_code") or "").upper() == "PK"]
    pool = pk_results or results

    area = parts[0] if parts else query_name
    city = parts[-1] if len(parts) >= 2 else None
    query_is_city_fallback = bool(city) and query_name.strip().lower() == city.strip().lower()

    if city and not query_is_city_fallback:
        matched = [item for item in pool if _hint_in_result(item, city)]
        if not matched:
            return None
        pool = matched

    pool.sort(key=lambda item: _result_score(item, area, city), reverse=True)
    return pool[0]


def _coords_from_result(item: dict) -> tuple[float, float] | None:
    try:
        lat = float(item["latitude"])
        lon = float(item["longitude"])
    except (KeyError, TypeError, ValueError):
        return None
    return (lat, lon)


def _geocode_search(client: httpx.Client, name: str) -> list[dict]:
    response = client.get(
        _GEOCODE_URL,
        params={
            "name": name,
            "count": _GEOCODE_COUNT,
            "language": "en",
            "countryCode": "PK",
        },
    )
    response.raise_for_status()
    payload = response.json()
    results = payload.get("results") if isinstance(payload, dict) else None
    if not isinstance(results, list):
        return []
    return [item for item in results if isinstance(item, dict)]


def get_coordinates(location: str) -> tuple[float, float] | None:
    cache_key = location.strip().lower()
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    parts = _location_parts(location)
    names = _query_names(location)
    if not names:
        _GEOCODE_CACHE[cache_key] = None
        return None

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            for name in names:
                results = _geocode_search(client, name)
                chosen = _pick_result(results, parts, name)
                coords = _coords_from_result(chosen) if chosen else None
                if coords is not None:
                    _GEOCODE_CACHE[cache_key] = coords
                    return coords
    except (httpx.HTTPError, ValueError, TypeError):
        _GEOCODE_CACHE[cache_key] = None
        return None

    _GEOCODE_CACHE[cache_key] = None
    return None


def _parse_meteo_time(value: str) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        return parsed.replace(tzinfo=None)
    return parsed


def _condition_from_wmo(code: int) -> str:
    if 0 <= code <= 1:
        return "Clear"
    if code in (2, 3, 45, 48):
        return "Cloudy"
    if code >= 51:
        return "Rainy"
    return "Cloudy"


def _rain_at_current_hour(hourly: dict, current_time: str | None) -> int | None:
    times = hourly.get("time") or []
    probs = hourly.get("precipitation_probability") or []
    if not isinstance(times, list) or not isinstance(probs, list) or not probs:
        return None

    idx: int | None = None
    if current_time:
        if current_time in times:
            idx = times.index(current_time)
        else:
            hour_prefix = current_time[:13]
            for i, stamp in enumerate(times):
                if isinstance(stamp, str) and stamp.startswith(hour_prefix):
                    idx = i
                    break
        if idx is None:
            current_dt = _parse_meteo_time(current_time)
            if current_dt is not None:
                best_delta: float | None = None
                for i, stamp in enumerate(times):
                    if i >= len(probs) or not isinstance(stamp, str):
                        continue
                    stamp_dt = _parse_meteo_time(stamp)
                    if stamp_dt is None:
                        continue
                    delta = abs((stamp_dt - current_dt).total_seconds())
                    if best_delta is None or delta < best_delta:
                        best_delta = delta
                        idx = i

    if idx is None or idx >= len(probs):
        return None
    try:
        return int(round(float(probs[idx])))
    except (TypeError, ValueError):
        return None


def _fetch_forecast(lat: float, lon: float) -> tuple[int, float, str | None] | None:
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(
                _FORECAST_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,weather_code",
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

    condition: str | None = None
    raw_code = current.get("weather_code")
    if raw_code is not None:
        try:
            condition = _condition_from_wmo(int(raw_code))
        except (TypeError, ValueError):
            condition = None

    return (rain, temperature, condition)


def get_weather(location: str) -> dict:
    season = _season_now()
    fallback = {
        "location": location,
        "latitude": None,
        "longitude": None,
        "rainfall_probability": _FALLBACK_RAIN,
        "temperature_celsius": _FALLBACK_TEMP,
        "season": season,
        "condition": None,
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
        rain, temperature, condition = forecast
        return {
            "location": location,
            "latitude": lat,
            "longitude": lon,
            "rainfall_probability": max(0, min(100, rain)),
            "temperature_celsius": temperature,
            "season": season,
            "condition": condition,
            "source": "open-meteo",
        }
    except Exception:
        return fallback
