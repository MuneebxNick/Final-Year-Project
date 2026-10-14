from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..models import Report, ReportEvent, User

TEAM_KEYS = frozenset({"roadMaintenance", "emergencyRepair", "inspection"})

ILLEGAL_TRANSITION = "Illegal status transition"
WRONG_TEAM = "Report is not assigned to your team"

# action, current status -> next status
TRANSITIONS: dict[tuple[str, str], str] = {
    ("assign", "pending"): "assigned",
    ("assign", "escalated"): "assigned",
    ("assign", "assigned"): "assigned",
    ("assign", "inProgress"): "assigned",
    ("accept", "assigned"): "inProgress",
    ("escalate", "assigned"): "escalated",
    ("escalate", "inProgress"): "escalated",
    ("complete", "inProgress"): "completed",
    ("verify", "completed"): "resolved",
    ("reject", "completed"): "inProgress",
}

_EVENT_TYPE = {
    "assign": "assigned",
    "accept": "accepted",
    "complete": "completed",
    "verify": "verified",
    "reject": "rejected",
    "escalate": "escalated",
}

# Citizen-facing labels. Staff reasons are never copied onto these entries.
PUBLIC_EVENT_LABELS = {
    "submitted": "Submitted",
    "assigned": "Repair Assigned",
    "accepted": "In Progress",
    "completed": "Repair done, being verified",
    "verified": "Resolved",
    "rejected": "In Progress",
    "escalated": "Under Review",
}

LEGACY_LADDER: tuple[tuple[str, str], ...] = (
    ("submitted", "Submitted"),
    ("underReview", "Under Review"),
    ("repairAssigned", "Repair Assigned"),
    ("inProgress", "In Progress"),
    ("resolved", "Resolved"),
)

_NOT_OVERDUE = frozenset({"completed", "resolved"})


@dataclass(frozen=True)
class PublicTimelineEntry:
    label: str
    at: datetime
    note: str | None


def timeline_stage_for(status: str) -> str:
    """Legacy ladder column. Completed stays off Resolved until an admin verifies."""
    if status == "resolved":
        return "resolved"
    if status in ("inProgress", "completed"):
        return "inProgress"
    if status == "assigned":
        return "repairAssigned"
    return "underReview"


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _require_text(value: str | None, detail: str) -> str:
    cleaned = _blank_to_none(value)
    if cleaned is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
    return cleaned


def _require_https_photo(url: str) -> str:
    cleaned = url.strip()
    if not cleaned.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="photoUri must be an HTTPS Cloudinary URL",
        )
    return cleaned


def is_overdue(report: Report, now: datetime | None = None) -> bool:
    """Deadline is set, it is in the past, and the report is not completed or resolved."""
    if report.deadline_at is None or report.status in _NOT_OVERDUE:
        return False
    current = _aware(now or datetime.now(timezone.utc))
    return _aware(report.deadline_at) < current


def legacy_timeline(report: Report) -> list[PublicTimelineEntry]:
    stages = [stage for stage, _label in LEGACY_LADDER]
    current = report.timeline_stage if report.timeline_stage in stages else "submitted"
    end = stages.index(current) + 1
    return [
        PublicTimelineEntry(label=label, at=report.created_at, note=None)
        for _stage, label in LEGACY_LADDER[:end]
    ]


def _public_note(event: ReportEvent) -> str | None:
    if event.event_type != "completed":
        return None
    return _blank_to_none(event.note)


def latest_rejection_reason(report: Report) -> str | None:
    """Reason from the newest event, only while that event is a rejection.

    A later completion replaces the latest event, so the reason disappears
    without a stored flag.
    """
    events = list(report.events or [])
    if not events:
        return None
    latest = max(events, key=lambda event: (_aware(event.created_at), str(event.id)))
    if latest.event_type != "rejected":
        return None
    return _blank_to_none(latest.note)


def public_timeline(report: Report) -> list[PublicTimelineEntry]:
    events = list(report.events or [])
    if not events:
        return legacy_timeline(report)
    events.sort(key=lambda event: (_aware(event.created_at), str(event.id)))
    return [
        PublicTimelineEntry(
            label=PUBLIC_EVENT_LABELS.get(event.event_type, event.event_type),
            at=event.created_at,
            note=_public_note(event),
        )
        for event in events
    ]


def team_stats(db: Session, team: str, now: datetime | None = None) -> dict[str, int]:
    """Four independent counts. Overdue can overlap assigned and in progress."""
    current = _aware(now or datetime.now(timezone.utc))
    assigned, in_progress, completed, overdue = db.execute(
        select(
            func.count().filter(Report.status == "assigned"),
            func.count().filter(Report.status == "inProgress"),
            func.count().filter(Report.status == "completed"),
            func.count().filter(
                Report.deadline_at.is_not(None),
                Report.deadline_at < current,
                Report.status.notin_(tuple(_NOT_OVERDUE)),
            ),
        ).where(Report.assigned_team == team)
    ).one()
    return {
        "assigned": int(assigned or 0),
        "in_progress": int(in_progress or 0),
        "completed": int(completed or 0),
        "overdue": int(overdue or 0),
    }


def record_submitted(db: Session, report: Report, actor_id: uuid.UUID) -> None:
    if report.id is None:
        raise RuntimeError("report must be flushed before recording submission")
    db.add(
        ReportEvent(
            report_id=report.id,
            actor_id=actor_id,
            event_type="submitted",
            from_status=None,
            to_status="pending",
            note=None,
            photo_url=None,
            assigned_team="unassigned",
            deadline_at=None,
            created_at=report.created_at,
        )
    )


def _get_report(db: Session, report_id: uuid.UUID) -> Report:
    row = db.get(Report, report_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return row


def _require_admin(actor: User) -> None:
    if actor.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def _team_key(actor: User) -> str:
    team = actor.team
    if actor.role != "team" or team not in TEAM_KEYS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Team access required")
    return team


def _cas_update(
    db: Session,
    report_id: uuid.UUID,
    expected_status: str,
    values: dict,
    *,
    expected_team: str | None,
) -> uuid.UUID | None:
    conditions = [Report.id == report_id, Report.status == expected_status]
    if expected_team is not None:
        conditions.append(Report.assigned_team == expected_team)
    stmt = (
        update(Report)
        .where(*conditions)
        .values(**values)
        .returning(Report.id)
        .execution_options(synchronize_session=False)
    )
    return db.execute(stmt).scalar_one_or_none()


def _ensure_transition(report: Report, action: str, expected_team: str | None) -> None:
    if expected_team is not None and report.assigned_team != expected_team:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=WRONG_TEAM)
    if (action, report.status) not in TRANSITIONS:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ILLEGAL_TRANSITION)


def _apply(
    db: Session,
    report: Report,
    *,
    actor: User,
    action: str,
    expected_team: str | None,
    column_values: dict,
    note: str | None,
    photo_url: str | None,
    event_team: str | None,
    event_deadline: datetime | None,
) -> None:
    to_status = TRANSITIONS.get((action, report.status))
    if to_status is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ILLEGAL_TRANSITION)
    if expected_team is not None and report.assigned_team != expected_team:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=WRONG_TEAM)
    previous = report.status
    report_id = report.id
    values = {
        **column_values,
        "status": to_status,
        "timeline_stage": timeline_stage_for(to_status),
    }
    updated = _cas_update(
        db,
        report_id,
        previous,
        values,
        expected_team=expected_team,
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ILLEGAL_TRANSITION)
    db.expire(report)
    db.add(
        ReportEvent(
            report_id=report_id,
            actor_id=actor.id,
            event_type=_EVENT_TYPE[action],
            from_status=previous,
            to_status=to_status,
            note=note,
            photo_url=photo_url,
            assigned_team=event_team,
            deadline_at=event_deadline,
            created_at=datetime.now(timezone.utc),
        )
    )


def assign_report(
    db: Session,
    report_id: uuid.UUID,
    actor: User,
    *,
    team: str,
    deadline: datetime,
    note: str | None,
) -> None:
    _require_admin(actor)
    if team not in TEAM_KEYS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="team must be a field team")
    report = _get_report(db, report_id)
    cleaned_note = _blank_to_none(note)
    deadline_at = _aware(deadline)
    _apply(
        db,
        report,
        actor=actor,
        action="assign",
        expected_team=None,
        column_values={
            "assigned_team": team,
            "deadline_at": deadline_at,
            "assignment_note": cleaned_note,
            "completion_photo_url": None,
            "completion_photo_public_id": None,
            "completion_note": None,
        },
        note=cleaned_note,
        photo_url=None,
        event_team=team,
        event_deadline=deadline_at,
    )


def verify_report(db: Session, report_id: uuid.UUID, actor: User) -> None:
    _require_admin(actor)
    report = _get_report(db, report_id)
    _apply(
        db,
        report,
        actor=actor,
        action="verify",
        expected_team=None,
        column_values={},
        note=None,
        photo_url=None,
        event_team=report.assigned_team,
        event_deadline=report.deadline_at,
    )


def reject_report(db: Session, report_id: uuid.UUID, actor: User, *, reason: str) -> None:
    _require_admin(actor)
    report = _get_report(db, report_id)
    _ensure_transition(report, "reject", None)
    cleaned = _require_text(reason, "reason is required")
    photo = report.completion_photo_url
    _apply(
        db,
        report,
        actor=actor,
        action="reject",
        expected_team=None,
        column_values={
            "completion_photo_url": None,
            "completion_photo_public_id": None,
            "completion_note": None,
        },
        note=cleaned,
        photo_url=photo,
        event_team=report.assigned_team,
        event_deadline=report.deadline_at,
    )


def accept_report(db: Session, report_id: uuid.UUID, actor: User) -> None:
    team = _team_key(actor)
    report = _get_report(db, report_id)
    _apply(
        db,
        report,
        actor=actor,
        action="accept",
        expected_team=team,
        column_values={},
        note=None,
        photo_url=None,
        event_team=team,
        event_deadline=report.deadline_at,
    )


def complete_report(
    db: Session,
    report_id: uuid.UUID,
    actor: User,
    *,
    photo_uri: str,
    photo_public_id: str,
    note: str,
) -> None:
    team = _team_key(actor)
    report = _get_report(db, report_id)
    _ensure_transition(report, "complete", team)
    photo = _require_https_photo(photo_uri)
    public_id = _require_text(photo_public_id, "photoPublicId is required")
    cleaned = _require_text(note, "note is required")
    _apply(
        db,
        report,
        actor=actor,
        action="complete",
        expected_team=team,
        column_values={
            "completion_photo_url": photo,
            "completion_photo_public_id": public_id,
            "completion_note": cleaned,
        },
        note=cleaned,
        photo_url=photo,
        event_team=team,
        event_deadline=report.deadline_at,
    )


def escalate_report(db: Session, report_id: uuid.UUID, actor: User, *, reason: str) -> None:
    team = _team_key(actor)
    report = _get_report(db, report_id)
    _ensure_transition(report, "escalate", team)
    cleaned = _require_text(reason, "reason is required")
    previous_team = report.assigned_team
    deadline = report.deadline_at
    _apply(
        db,
        report,
        actor=actor,
        action="escalate",
        expected_team=team,
        column_values={"assigned_team": "unassigned"},
        note=cleaned,
        photo_url=None,
        event_team=previous_team,
        event_deadline=deadline,
    )
