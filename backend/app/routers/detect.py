from fastapi import APIRouter, File, HTTPException, UploadFile, status

from ..ai.detect import (
    InferenceError,
    InvalidImageError,
    ModelUnavailableError,
    run_detection,
)
from ..schemas import PixelBoundingBox, YoloDetectResponse, YoloDetectionOut

router = APIRouter()


@router.post("/detect", response_model=YoloDetectResponse)
async def detect_potholes(file: UploadFile | None = File(default=None)) -> YoloDetectResponse:
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty image / missing file.",
        )
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty image / missing file.",
        )

    try:
        result = run_detection(image_bytes)
    except InvalidImageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except ModelUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc) or "Pothole model is unavailable.",
        ) from exc
    except InferenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return YoloDetectResponse(
        detections=[
            YoloDetectionOut(
                bounding_box=PixelBoundingBox(
                    x1=item.x1,
                    y1=item.y1,
                    x2=item.x2,
                    y2=item.y2,
                ),
                confidence=item.confidence,
                severity=item.severity,  # type: ignore[arg-type]
                area_percentage=item.area_percentage,
            )
            for item in result.detections
        ],
        highest_severity=result.highest_severity,  # type: ignore[arg-type]
        message=result.message,
    )
