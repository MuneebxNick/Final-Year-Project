import hashlib
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import require_citizen
from ..config import get_settings
from ..models import User
from ..schemas import UploadSignature

router = APIRouter()

UPLOAD_FOLDER = "rahscan/reports"
UPLOAD_FORMAT = "webp"


def _sign(params: dict[str, str], api_secret: str) -> str:
    payload = "&".join(f"{key}={params[key]}" for key in sorted(params)) + api_secret
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


@router.post("/signature", response_model=UploadSignature)
def signature(_user: Annotated[User, Depends(require_citizen)]) -> UploadSignature:
    settings = get_settings()
    if not settings.cloudinary_cloud_name:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Photo upload is not configured. Set CLOUDINARY_CLOUD_NAME in backend/.env "
                "and restart the API."
            ),
        )
    timestamp = int(time.time())
    if settings.cloudinary_api_key and settings.cloudinary_api_secret:
        preset = settings.cloudinary_upload_preset or "rahscan_reports"
        params = {
            "folder": UPLOAD_FOLDER,
            "format": UPLOAD_FORMAT,
            "timestamp": str(timestamp),
            "upload_preset": preset,
        }
        return UploadSignature(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            timestamp=timestamp,
            signature=_sign(params, settings.cloudinary_api_secret),
            folder=UPLOAD_FOLDER,
            format=UPLOAD_FORMAT,
            upload_preset=preset,
            unsigned=False,
        )
    preset = settings.cloudinary_unsigned_preset or "rahscan_reports_unsigned"
    return UploadSignature(
        cloud_name=settings.cloudinary_cloud_name,
        timestamp=timestamp,
        folder=UPLOAD_FOLDER,
        format=UPLOAD_FORMAT,
        upload_preset=preset,
        unsigned=True,
    )
