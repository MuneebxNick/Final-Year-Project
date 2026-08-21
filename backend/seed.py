from uuid import UUID

from sqlalchemy.orm import Session

from app.auth import hash_password
from app.config import get_settings
from app.models import User

DEMO_CITIZEN_EMAIL = "demo@rahscan.local"
DEMO_CITIZEN_ID = UUID("11111111-1111-1111-1111-111111111111")
ADMIN_EMAIL = "admin@rahscan.local"
ADMIN_ID = UUID("22222222-2222-2222-2222-222222222222")


def _ensure_demo_user(
    db: Session,
    user_id: UUID,
    name: str,
    email: str,
    password: str,
    role: str,
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
            )
        )
        return
    user.name = name
    user.email = email
    user.password_hash = hashed
    user.role = role


def seed_if_empty(db: Session) -> None:
    """Ensure demo citizen and admin accounts exist. Does not insert sample reports."""
    settings = get_settings()
    _ensure_demo_user(
        db,
        DEMO_CITIZEN_ID,
        "Demo Citizen",
        DEMO_CITIZEN_EMAIL,
        settings.demo_citizen_password,
        "citizen",
    )
    _ensure_demo_user(
        db,
        ADMIN_ID,
        "Municipal Admin",
        ADMIN_EMAIL,
        settings.admin_password,
        "admin",
    )
    db.commit()


if __name__ == "__main__":
    from app import db as database

    database.get_engine()
    assert database.SessionLocal is not None
    with database.SessionLocal() as session:
        seed_if_empty(session)
        print("Seed complete.")
