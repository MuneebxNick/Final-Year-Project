from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..auth import require_admin
from ..db import get_db
from ..models import Report, User
from ..schemas import AdminReportPatch, ReportOut, from_admin_ui_status, report_to_out, timeline_for

router = APIRouter()


@router.get("/reports", response_model=list[ReportOut])
def list_reports(
    _user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ReportOut]:
    rows = (
        db.scalars(
            select(Report).options(joinedload(Report.submitter)).order_by(Report.created_at.desc())
        )
        .unique()
        .all()
    )
    return [report_to_out(row) for row in rows]


@router.get("/reports/{report_id}", response_model=ReportOut)
def get_report(
    report_id: UUID,
    _user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ReportOut:
    row = db.scalar(
        select(Report).options(joinedload(Report.submitter)).where(Report.id == report_id)
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report_to_out(row)


@router.patch("/reports/{report_id}", response_model=ReportOut)
def patch_report(
    report_id: UUID,
    body: AdminReportPatch,
    _user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ReportOut:
    row = db.scalar(
        select(Report).options(joinedload(Report.submitter)).where(Report.id == report_id)
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    mapped = from_admin_ui_status(body.status, body.assigned_team)
    row.assigned_team = body.assigned_team
    row.status = mapped
    row.timeline_stage = timeline_for(mapped)
    db.commit()
    db.refresh(row)
    return report_to_out(row)
