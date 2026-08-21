from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..auth import require_citizen
from ..db import get_db
from ..models import Report, User
from ..schemas import ReportCreate, ReportOut, report_to_out

router = APIRouter()


def _owned_query(user_id: UUID):
    return (
        select(Report)
        .options(joinedload(Report.submitter))
        .where(Report.submitted_by == user_id)
        .order_by(Report.created_at.desc())
    )


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    body: ReportCreate,
    user: Annotated[User, Depends(require_citizen)],
    db: Annotated[Session, Depends(get_db)],
) -> ReportOut:
    photo_url = body.photo_uri
    if photo_url and not photo_url.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="photoUri must be an HTTPS Cloudinary URL",
        )
    city = body.city.strip()
    area = body.area.strip()
    if not city:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="City is required")
    row = Report(
        photo_url=photo_url,
        photo_public_id=body.photo_public_id,
        city=city,
        area=area,
        road_type=body.road_type,
        status="pending",
        assigned_team="unassigned",
        timeline_stage="submitted",
        severity=body.severity,
        confidence=body.confidence,
        description=body.description,
        landmark=body.landmark,
        address=body.address or "",
        lat=body.coords.lat if body.coords else None,
        lng=body.coords.lng if body.coords else None,
        bbox_left=body.bounding_box.left,
        bbox_top=body.bounding_box.top,
        bbox_width=body.bounding_box.width,
        bbox_height=body.bounding_box.height,
        submitted_by=user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.submitter = user
    return report_to_out(row)


@router.get("/me", response_model=list[ReportOut])
def my_reports(
    user: Annotated[User, Depends(require_citizen)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ReportOut]:
    rows = db.scalars(_owned_query(user.id)).unique().all()
    return [report_to_out(row) for row in rows]


@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: UUID,
    user: Annotated[User, Depends(require_citizen)],
    db: Annotated[Session, Depends(get_db)],
) -> ReportOut:
    row = db.scalar(
        select(Report).options(joinedload(Report.submitter)).where(Report.id == report_id)
    )
    if row is None or row.submitted_by != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report_to_out(row)
