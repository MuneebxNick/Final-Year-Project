from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from ..auth import require_admin
from ..db import get_db
from ..models import Report, ReportEvent, User
from ..schemas import (
    AdminReportDetail,
    AdminReportOut,
    AssignRequest,
    ReasonRequest,
    admin_report_to_detail,
    admin_report_to_out,
)
from ..services.workflow import assign_report, reject_report, verify_report

router = APIRouter()


def _load_detail(db: Session, report_id: UUID) -> Report:
    row = db.scalar(
        select(Report)
        .options(
            joinedload(Report.submitter),
            selectinload(Report.events).selectinload(ReportEvent.actor),
        )
        .where(Report.id == report_id)
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return row


@router.get("/reports", response_model=list[AdminReportOut])
def list_reports(
    _user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> list[AdminReportOut]:
    rows = (
        db.scalars(
            select(Report).options(joinedload(Report.submitter)).order_by(Report.created_at.desc())
        )
        .unique()
        .all()
    )
    return [admin_report_to_out(row) for row in rows]


@router.get("/reports/{report_id}", response_model=AdminReportDetail)
def get_report(
    report_id: UUID,
    _user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminReportDetail:
    return admin_report_to_detail(_load_detail(db, report_id))


@router.post("/reports/{report_id}/assign", response_model=AdminReportDetail)
def assign_report_route(
    report_id: UUID,
    body: AssignRequest,
    user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminReportDetail:
    assign_report(db, report_id, user, team=body.team, deadline=body.deadline, note=body.note)
    db.commit()
    return admin_report_to_detail(_load_detail(db, report_id))


@router.post("/reports/{report_id}/verify", response_model=AdminReportDetail)
def verify_report_route(
    report_id: UUID,
    user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminReportDetail:
    verify_report(db, report_id, user)
    db.commit()
    return admin_report_to_detail(_load_detail(db, report_id))


@router.post("/reports/{report_id}/reject", response_model=AdminReportDetail)
def reject_report_route(
    report_id: UUID,
    body: ReasonRequest,
    user: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminReportDetail:
    reject_report(db, report_id, user, reason=body.reason)
    db.commit()
    return admin_report_to_detail(_load_detail(db, report_id))
