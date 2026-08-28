from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, AliasChoices, field_validator
from pydantic.alias_generators import to_camel

from .models import Report as ReportRow
from .models import User as UserRow
from .services.geocode_service import ReverseGeocodeError, reverse_geocode

RoadType = Literal["highway", "serviceRoad", "localRoad"]
ReportStatus = Literal["pending", "assigned", "inProgress", "resolved"]
AssignedTeam = Literal["unassigned", "roadMaintenance", "emergencyRepair", "inspection"]
TimelineStage = Literal["submitted", "underReview", "repairAssigned", "inProgress", "resolved"]
Severity = Literal["small", "medium", "large"]
AdminUiStatus = Literal["pending", "inProgress", "resolved"]
Role = Literal["citizen", "admin"]


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        serialize_by_alias=True,
    )


class BoundingBox(CamelModel):
    left: float
    top: float
    width: float
    height: float


class DetectionBox(BoundingBox):
    severity: Severity
    confidence: int


class GeoCoords(CamelModel):
    lat: float
    lng: float


class DetectRequest(CamelModel):
    city: str
    area: str


class DetectResponse(CamelModel):
    severity: Severity
    confidence: int
    bounding_box: BoundingBox


YoloSeverity = Literal["Small", "Medium", "Large"]


class PixelBoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class YoloDetectionOut(BaseModel):
    bounding_box: PixelBoundingBox
    confidence: float
    severity: YoloSeverity
    area_percentage: float


class YoloDetectResponse(BaseModel):
    detections: list[YoloDetectionOut]
    highest_severity: YoloSeverity | None = None
    message: str | None = None


WeatherSeason = Literal["Monsoon", "Summer", "Winter"]
WeatherSource = Literal["open-meteo", "fallback"]


class WeatherOut(BaseModel):
    location: str
    latitude: float | None = None
    longitude: float | None = None
    rainfall_probability: int
    temperature_celsius: float
    season: WeatherSeason
    source: WeatherSource


MaintenanceCategory = Literal["Urgent", "Plan Repair", "Monitor"]
MaintenanceTrend = Literal["increasing", "decreasing", "stable"]


class PredictiveMaintenanceSegment(BaseModel):
    segment_id: str
    city: str
    area: str
    road_type: str
    predicted_report_count: int
    trend_direction: MaintenanceTrend
    category: MaintenanceCategory
    budget_estimate_pkr: int


class ReverseGeocodeOut(BaseModel):
    city: str = ""
    area: str = ""
    address: str = ""


LifetimeUrgency = Literal["Critical", "Moderate", "Low urgency"]

_SEVERITY_CANONICAL = {"small": "Small", "medium": "Medium", "large": "Large"}
_ROAD_CANONICAL = {
    "highway": "Highway",
    "serviceroad": "Service Road",
    "simpleroad": "Simple Road",
    "localroad": "Simple Road",
}
_TRAFFIC_CANONICAL = {"low": "Low", "medium": "Medium", "high": "High"}


class LifetimePredictRequest(CamelModel):
    severity: str
    bounding_box_percentage: float = Field(ge=0, le=100)
    road_type: str
    traffic_density: str
    location: str = Field(min_length=1)

    @field_validator("severity")
    @classmethod
    def _normalize_severity(cls, value: str) -> str:
        key = value.strip().lower()
        if key not in _SEVERITY_CANONICAL:
            raise ValueError("severity must be Small, Medium, or Large")
        return _SEVERITY_CANONICAL[key]

    @field_validator("road_type")
    @classmethod
    def _normalize_road_type(cls, value: str) -> str:
        key = "".join(value.strip().lower().split())
        if key not in _ROAD_CANONICAL:
            raise ValueError("road_type must be Highway, Service Road, or Simple Road")
        return _ROAD_CANONICAL[key]

    @field_validator("traffic_density")
    @classmethod
    def _normalize_traffic_density(cls, value: str) -> str:
        key = value.strip().lower()
        if key not in _TRAFFIC_CANONICAL:
            raise ValueError("traffic_density must be Low, Medium, or High")
        return _TRAFFIC_CANONICAL[key]

    @field_validator("location")
    @classmethod
    def _strip_location(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("location must be a non-empty string")
        return stripped


class LifetimePredictInputs(CamelModel):
    severity: str
    bounding_box_percentage: float
    road_type: str
    traffic_density: str
    location: str


class LifetimeWeatherOut(CamelModel):
    rainfall_probability: int
    temperature_celsius: float
    season: WeatherSeason
    source: WeatherSource
    latitude: float | None = None
    longitude: float | None = None


class LifetimePredictResponse(CamelModel):
    days_until_critical: int
    recommended_repair_deadline: str
    urgency_note: LifetimeUrgency
    inputs: LifetimePredictInputs
    weather: LifetimeWeatherOut


class SignupRequest(CamelModel):
    name: str
    email: str
    password: str = Field(min_length=6)


class LoginRequest(CamelModel):
    email: str
    password: str = Field(min_length=6)


class AuthUser(CamelModel):
    name: str
    email: str
    role: Role
    token: str


class MeResponse(CamelModel):
    name: str
    email: str
    role: Role


class ReportOut(CamelModel):
    id: str
    photo_uri: str | None
    city: str
    area: str
    road_type: RoadType
    status: ReportStatus
    assigned_team: AssignedTeam
    created_at: datetime
    severity: Severity
    confidence: int
    description: str | None = None
    landmark: str | None = None
    address: str
    coords: GeoCoords | None = None
    bounding_box: BoundingBox
    bounding_boxes: list[DetectionBox] = Field(default_factory=list)
    timeline_stage: TimelineStage
    submitted_by: str


class ReportCreate(CamelModel):
    photo_uri: str | None = None
    photo_public_id: str | None = None
    city: str
    area: str
    road_type: RoadType
    address: str = ""
    coords: GeoCoords | None = None
    description: str | None = None
    landmark: str | None = None
    severity: Severity
    confidence: int
    bounding_box: BoundingBox
    bounding_boxes: list[DetectionBox] = Field(
        default_factory=list,
        validation_alias=AliasChoices("boundingBoxes", "bounding_boxes"),
    )


class AdminReportPatch(CamelModel):
    assigned_team: AssignedTeam
    status: AdminUiStatus


class UploadSignature(CamelModel):
    cloud_name: str
    api_key: str = ""
    timestamp: int = 0
    signature: str = ""
    folder: str
    format: str
    upload_preset: str
    unsigned: bool = False


def from_admin_ui_status(ui: AdminUiStatus, team: AssignedTeam) -> ReportStatus:
    if ui == "resolved":
        return "resolved"
    if ui == "inProgress":
        return "inProgress"
    return "pending" if team == "unassigned" else "assigned"


def timeline_for(status: ReportStatus) -> TimelineStage:
    if status == "resolved":
        return "resolved"
    if status == "inProgress":
        return "inProgress"
    if status == "assigned":
        return "repairAssigned"
    return "underReview"


def _detections_from_row(row: ReportRow) -> list[DetectionBox]:
    raw = row.detections
    if isinstance(raw, list) and len(raw) > 0:
        boxes: list[DetectionBox] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            try:
                boxes.append(
                    DetectionBox(
                        left=float(item.get("left", 0)),
                        top=float(item.get("top", 0)),
                        width=float(item.get("width", 0)),
                        height=float(item.get("height", 0)),
                        severity=item.get("severity", row.severity),  # type: ignore[arg-type]
                        confidence=int(item.get("confidence", row.confidence)),
                    )
                )
            except (TypeError, ValueError):
                continue
        if boxes:
            return boxes
    return [
        DetectionBox(
            left=row.bbox_left,
            top=row.bbox_top,
            width=row.bbox_width,
            height=row.bbox_height,
            severity=row.severity,  # type: ignore[arg-type]
            confidence=row.confidence,
        )
    ]


_GEOCODE_CACHE: dict[tuple[float, float], dict[str, str] | None] = {}


def _cached_reverse_geocode(lat: float, lng: float) -> dict[str, str] | None:
    key = (round(lat, 5), round(lng, 5))
    if key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[key]
    try:
        result = reverse_geocode(lat, lng)
    except ReverseGeocodeError:
        _GEOCODE_CACHE[key] = None
        return None
    _GEOCODE_CACHE[key] = result
    return result


def _overlay_city_area(row: ReportRow) -> tuple[str, str]:
    city = row.city or ""
    area = row.area or ""
    if row.lat is None or row.lng is None:
        return city, area
    geo = _cached_reverse_geocode(row.lat, row.lng)
    if not geo:
        return city, area
    geo_city = geo.get("city") or ""
    geo_area = geo.get("area") or ""
    if not geo_city and not geo_area:
        return city, area
    if geo_city:
        return geo_city, geo_area
    return city, geo_area or area


def report_to_out(row: ReportRow) -> ReportOut:
    coords = None
    if row.lat is not None and row.lng is not None:
        coords = GeoCoords(lat=row.lat, lng=row.lng)
    city, area = _overlay_city_area(row)
    boxes = _detections_from_row(row)
    primary = boxes[0]
    return ReportOut(
        id=str(row.id),
        photo_uri=row.photo_url,
        city=city,
        area=area,
        road_type=row.road_type,  # type: ignore[arg-type]
        status=row.status,  # type: ignore[arg-type]
        assigned_team=row.assigned_team,  # type: ignore[arg-type]
        created_at=row.created_at,
        severity=row.severity,  # type: ignore[arg-type]
        confidence=row.confidence,
        description=row.description,
        landmark=row.landmark,
        address=row.address or "",
        coords=coords,
        bounding_box=BoundingBox(
            left=primary.left,
            top=primary.top,
            width=primary.width,
            height=primary.height,
        ),
        bounding_boxes=boxes,
        timeline_stage=row.timeline_stage,  # type: ignore[arg-type]
        submitted_by=row.submitter.email if row.submitter else "",
    )


def user_to_auth(user: UserRow, token: str) -> AuthUser:
    return AuthUser(name=user.name, email=user.email, role=user.role, token=token)  # type: ignore[arg-type]
