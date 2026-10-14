from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


engine: Engine | None = None
SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global engine, SessionLocal
    if engine is None:
        settings = get_settings()
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL is not set")
        engine = create_engine(
            settings.sqlalchemy_url,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={"sslmode": "require", "prepare_threshold": None},
        )
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return engine


def get_db() -> Generator[Session, None, None]:
    get_engine()
    assert SessionLocal is not None
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ping_db(db: Session) -> None:
    db.execute(text("SELECT 1"))


def ensure_schema() -> None:
    """Add columns introduced after the first reports table was created."""
    get_engine()
    assert engine is not None
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS detections JSONB"))
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS ref_number INTEGER"))
        conn.execute(
            text(
                """
                UPDATE reports
                SET ref_number = numbered.rn
                FROM (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
                    FROM reports
                ) AS numbered
                WHERE reports.id = numbered.id
                  AND reports.ref_number IS NULL
                """
            )
        )
        conn.execute(text("CREATE SEQUENCE IF NOT EXISTS reports_ref_number_seq"))
        conn.execute(
            text(
                """
                SELECT setval(
                    'reports_ref_number_seq',
                    COALESCE((SELECT MAX(ref_number) FROM reports), 0)
                )
                """
            )
        )
        conn.execute(
            text(
                "ALTER TABLE reports ALTER COLUMN ref_number SET DEFAULT nextval('reports_ref_number_seq')"
            )
        )
        conn.execute(text("ALTER TABLE reports ALTER COLUMN ref_number SET NOT NULL"))
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_reports_ref_number ON reports (ref_number)"
            )
        )
        # Workflow columns. Do not backfill or rewrite existing report statuses.
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS team VARCHAR(40)"))
        conn.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check"))
        conn.execute(
            text(
                "ALTER TABLE users ADD CONSTRAINT users_role_check "
                "CHECK (role IN ('citizen', 'admin', 'team'))"
            )
        )
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ"))
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS assignment_note TEXT"))
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS completion_photo_url TEXT"))
        conn.execute(
            text(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS completion_photo_public_id VARCHAR(255)"
            )
        )
        conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS completion_note TEXT"))
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS report_events (
                    id UUID PRIMARY KEY,
                    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    event_type VARCHAR(40) NOT NULL,
                    from_status VARCHAR(40),
                    to_status VARCHAR(40) NOT NULL,
                    note TEXT,
                    photo_url TEXT,
                    assigned_team VARCHAR(40),
                    deadline_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS id UUID"))
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS report_id UUID"))
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS actor_id UUID"))
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(40)"))
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS from_status VARCHAR(40)"))
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS to_status VARCHAR(40)"))
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS note TEXT"))
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS photo_url TEXT"))
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS assigned_team VARCHAR(40)"))
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ"))
        conn.execute(text("ALTER TABLE report_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ"))
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_report_events_report_id ON report_events (report_id)"
            )
        )
