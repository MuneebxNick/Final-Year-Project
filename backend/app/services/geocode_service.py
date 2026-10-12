"""Nominatim reverse geocoding for citizen report location."""

from __future__ import annotations

import re

import httpx

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
_PHOTON_URL = "https://photon.komoot.io/reverse"
_TIMEOUT = 10.0
_USER_AGENT = "RahScan/1.0 (pothole-reporting FYP; reverse-geocode)"
_PHOTON_AREA_KINDS = frozenset(
    {"neighbourhood", "suburb", "village", "town", "hamlet", "quarter", "residential"}
)

# Specific local places first. Suburb, quarter, and city district are broader
# administrative areas and must not win over a neighbourhood or village.
_AREA_KEYS = (
    "neighbourhood",
    "village",
    "hamlet",
    "residential",
    "town",
    "suburb",
    "quarter",
    "city_district",
)

_ADMIN_SUFFIX_RE = re.compile(
    r"\s+(District|Tehsil|Division)\s*$",
    re.IGNORECASE,
)


class ReverseGeocodeError(Exception):
    """Nominatim request failed."""


def _str_field(payload: dict, key: str) -> str:
    value = payload.get(key)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return ""


def _is_admin_unit(value: str) -> bool:
    return bool(value) and bool(_ADMIN_SUFFIX_RE.search(value))


def _strip_admin_suffix(value: str) -> str:
    if not value:
        return ""
    stripped = _ADMIN_SUFFIX_RE.sub("", value).strip()
    return stripped or value


def _first_str(payload: dict, keys: tuple[str, ...], *, skip: frozenset[str] | None = None) -> str:
    excluded = skip or frozenset()
    for key in keys:
        value = _str_field(payload, key)
        if value and value not in excluded and not _is_admin_unit(value):
            return value
    return ""


def parse_nominatim(payload: dict) -> dict[str, str]:
    address = payload.get("address")
    if not isinstance(address, dict):
        address = {}
    display = payload.get("display_name")
    address_line = display.strip() if isinstance(display, str) else ""

    village = _str_field(address, "village")
    town = _str_field(address, "town")
    area = _first_str(address, _AREA_KEYS)

    osm_city = _strip_admin_suffix(_str_field(address, "city"))
    village_level = {name for name in (village, town, area) if name}

    city = ""
    if osm_city and osm_city not in village_level:
        city = osm_city
    if not city:
        city = _strip_admin_suffix(_str_field(address, "county"))
    if not city:
        city = _str_field(address, "municipality")
    if not city:
        city = _strip_admin_suffix(_str_field(address, "state_district"))
    if not city and town and town != area:
        city = town

    if city and area and city == area:
        area = _first_str(address, _AREA_KEYS, skip=frozenset({city}))

    return {
        "city": city,
        "area": area,
        "address": address_line,
    }


def _nominatim_payload(client: httpx.Client, lat: float, lng: float) -> dict:
    response = client.get(
        _NOMINATIM_URL,
        params={
            "lat": lat,
            "lon": lng,
            "format": "json",
            "addressdetails": 1,
            "zoom": 18,
        },
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ReverseGeocodeError("Could not reverse-geocode coordinates.")
    return payload


def _photon_payload(client: httpx.Client, lat: float, lng: float) -> dict:
    """Nominatim-shaped payload from Photon when Nominatim is unavailable."""
    response = client.get(
        _PHOTON_URL,
        params={"lat": lat, "lon": lng, "lang": "en"},
    )
    response.raise_for_status()
    payload = response.json()
    features = payload.get("features") if isinstance(payload, dict) else None
    if not isinstance(features, list) or not features or not isinstance(features[0], dict):
        return {"address": {}}
    props = features[0].get("properties")
    if not isinstance(props, dict):
        return {"address": {}}

    address: dict[str, str] = {
        "city": _str_field(props, "city"),
        "county": _str_field(props, "county"),
        "state": _str_field(props, "state"),
    }
    locality = _str_field(props, "locality") or _str_field(props, "district")
    if locality:
        address["suburb"] = locality
    kind = _str_field(props, "osm_value").lower()
    name = _str_field(props, "name")
    if name and kind in _PHOTON_AREA_KINDS:
        address[kind] = name
    elif name and kind not in {"city", "administrative", "state", "country", "county"}:
        address.setdefault("suburb", name)
    return {"address": address, "display_name": ""}


def reverse_geocode(lat: float, lng: float) -> dict[str, str]:
    headers = {
        "User-Agent": _USER_AGENT,
        "Accept": "application/json",
        "Accept-Language": "en",
    }
    try:
        with httpx.Client(timeout=_TIMEOUT, headers=headers) as client:
            try:
                payload = _nominatim_payload(client, lat, lng)
            except (httpx.HTTPError, ValueError, TypeError, ReverseGeocodeError):
                payload = _photon_payload(client, lat, lng)
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        raise ReverseGeocodeError("Could not reverse-geocode coordinates.") from exc

    if not isinstance(payload, dict):
        raise ReverseGeocodeError("Could not reverse-geocode coordinates.")

    if payload.get("error"):
        return {"city": "", "area": "", "address": ""}

    return parse_nominatim(payload)
