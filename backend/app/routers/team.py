from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..auth import require_team
from ..db import get_db
from ..models import Report, User
from ..schemas import CompleteRequest, ReasonRequest, TeamReportOut, TeamStatsOut, team_report_to_out
from ..services.workflow import WRONG_TEAM, accept_report, complete_report, escalate_report, team_stats

router = APIRouter()


def _team_or_404(db: Session, report_id: UUID, team: str) -> Report:
    row = db.scalar(
        select(Report).options(selectinload(Report.events)).where(Report.id == report_id)
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    if row.assigned_team != team:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=WRONG_TEAM)
    return row


@router.get("/stats", response_model=TeamStatsOut)
def stats(
    user: Annotated[User, Depends(require_team)],
    db: Annotated[Session, Depends(get_db)],
) -> TeamStatsOut:
    assert user.team is not None
    return TeamStatsOut(**team_stats(db, user.team))


@router.get("/reports", response_model=list[TeamReportOut])
def list_reports(
    user: Annotated[User, Depends(require_team)],
    db: Annotated[Session, Depends(get_db)],
) -> list[TeamReportOut]:
    rows = db.scalars(
        select(Report)
        .options(selectinload(Report.events))
        .where(Report.assigned_team == user.team)
        .order_by(Report.created_at.desc())
    ).all()
    return [team_report_to_out(row) for row in rows]


@router.get("/reports/{report_id}", response_model=TeamReportOut)
def get_report(
    report_id: UUID,
    user: Annotated[User, Depends(require_team)],
    db: Annotated[Session, Depends(get_db)],
) -> TeamReportOut:
    assert user.team is not None
    return team_report_to_out(_team_or_404(db, report_id, user.team))


@router.post("/reports/{report_id}/accept", response_model=TeamReportOut)
def accept_report_route(
    report_id: UUID,
    user: Annotated[User, Depends(require_team)],
    db: Annotated[Session, Depends(get_db)],
) -> TeamReportOut:
    accept_report(db, report_id, user)
    db.commit()
    assert user.team is not None
    return team_report_to_out(_team_or_404(db, report_id, user.team))


@router.post("/reports/{report_id}/complete", response_model=TeamReportOut)
def complete_report_route(
    report_id: UUID,
    body: CompleteRequest,
    user: Annotated[User, Depends(require_team)],
    db: Annotated[Session, Depends(get_db)],
) -> TeamReportOut:
    complete_report(
        db,
        report_id,
        user,
        photo_uri=body.photo_uri,
        photo_public_id=body.photo_public_id,
        note=body.note,
    )
    db.commit()
    assert user.team is not None
    return team_report_to_out(_team_or_404(db, report_id, user.team))


@router.post("/reports/{report_id}/escalate", response_model=TeamReportOut)
def escalate_report_route(
    report_id: UUID,
    body: ReasonRequest,
    user: Annotated[User, Depends(require_team)],
    db: Annotated[Session, Depends(get_db)],
) -> TeamReportOut:
    escalate_report(db, report_id, user, reason=body.reason)
    db.commit()
    row = db.get(Report, report_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return team_report_to_out(row)
