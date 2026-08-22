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
    # Client-side uploads must use the unsigned preset. Signed uploads 401 when
    # CLOUDINARY_API_SECRET does not match the Cloudinary dashboard secret.
    return UploadSignature(
        cloud_name=settings.cloudinary_cloud_name,
        timestamp=int(time.time()),
        folder=UPLOAD_FOLDER,
        format=UPLOAD_FORMAT,
        upload_preset=settings.cloudinary_unsigned_preset or "rahscan_reports_unsigned",
        unsigned=True,
    )
