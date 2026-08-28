from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .ai.model import load_model
from .config import get_settings
from .db import ensure_schema, get_db, ping_db
from .ml.lifetime import load_lifetime_model
from .ml.maintenance import load_maintenance
from .routers import admin, ai, auth, detect, geocode, predict, reports, uploads, weather

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_schema()
    load_model()
    load_lifetime_model()
    load_maintenance()
    yield


app = FastAPI(title="RahScan API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detect.router, prefix="/api", tags=["detect"])
app.include_router(predict.router, prefix="/api", tags=["predict"])
app.include_router(weather.router, prefix="/api", tags=["weather"])
app.include_router(geocode.router, prefix="/api", tags=["geocode"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])


@app.get("/health")
def health(db: Annotated[Session, Depends(get_db)]) -> dict:
    ping_db(db)
    return {"ok": True}
