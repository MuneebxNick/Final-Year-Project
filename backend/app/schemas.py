from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from .models import Report as ReportRow
from .models import User as UserRow

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


def report_to_out(row: ReportRow) -> ReportOut:
    coords = None
    if row.lat is not None and row.lng is not None:
        coords = GeoCoords(lat=row.lat, lng=row.lng)
    return ReportOut(
        id=str(row.id),
        photo_uri=row.photo_url,
        city=row.city,
        area=row.area,
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
            left=row.bbox_left,
            top=row.bbox_top,
            width=row.bbox_width,
            height=row.bbox_height,
        ),
        timeline_stage=row.timeline_stage,  # type: ignore[arg-type]
        submitted_by=row.submitter.email if row.submitter else "",
    )


def user_to_auth(user: UserRow, token: str) -> AuthUser:
    return AuthUser(name=user.name, email=user.email, role=user.role, token=token)  # type: ignore[arg-type]
