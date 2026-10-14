from uuid import UUID

from sqlalchemy.orm import Session

from app.auth import hash_password
from app.config import get_settings
from app.models import User

DEMO_CITIZEN_EMAIL = "demo@rahscan.local"
DEMO_CITIZEN_ID = UUID("11111111-1111-1111-1111-111111111111")
ADMIN_EMAIL = "admin@rahscan.local"
ADMIN_ID = UUID("22222222-2222-2222-2222-222222222222")
ROAD_TEAM_ID = UUID("33333333-3333-3333-3333-333333333333")
EMERGENCY_TEAM_ID = UUID("44444444-4444-4444-4444-444444444444")
INSPECTION_TEAM_ID = UUID("55555555-5555-5555-5555-555555555555")


def _ensure_demo_user(
    db: Session,
    user_id: UUID,
    name: str,
    email: str,
    password: str,
    role: str,
    team: str | None = None,
) -> None:
    user = db.get(User, user_id)
    hashed = hash_password(password)
    if user is None:
        db.add(
            User(
                id=user_id,
                name=name,
                email=email,
                password_hash=hashed,
                role=role,
                team=team,
            )
        )
        return
    user.name = name
    user.email = email
    user.password_hash = hashed
    user.role = role
    user.team = team


def seed_if_empty(db: Session) -> None:
    """Ensure demo citizen, admin, and team accounts exist. Does not insert sample reports."""
    settings = get_settings()
    _ensure_demo_user(
        db,
        DEMO_CITIZEN_ID,
        "Demo Citizen",
        DEMO_CITIZEN_EMAIL,
        settings.demo_citizen_password,
        "citizen",
        None,
    )
    _ensure_demo_user(
        db,
        ADMIN_ID,
        "Municipal Admin",
        ADMIN_EMAIL,
        settings.admin_password,
        "admin",
        None,
    )
    _ensure_demo_user(
        db,
        ROAD_TEAM_ID,
        "Road Maintenance",
        "road@rahscan.local",
        settings.team_password,
        "team",
        "roadMaintenance",
    )
    _ensure_demo_user(
        db,
        EMERGENCY_TEAM_ID,
        "Emergency Repair",
        "emergency@rahscan.local",
        settings.team_password,
        "team",
        "emergencyRepair",
    )
    _ensure_demo_user(
        db,
        INSPECTION_TEAM_ID,
        "Inspection",
        "inspection@rahscan.local",
        settings.team_password,
        "team",
        "inspection",
    )
    db.commit()


if __name__ == "__main__":
    from app import db as database

    database.ensure_schema()
    assert database.SessionLocal is not None
    with database.SessionLocal() as session:
        seed_if_empty(session)
        print("Seed complete.")
