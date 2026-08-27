from fastapi import APIRouter, HTTPException, status

from ..ml.lifetime import get_encoders, get_lifetime_model, predict_lifetime
from ..schemas import LifetimePredictRequest, LifetimePredictResponse

router = APIRouter()


@router.post("/predict/lifetime", response_model=LifetimePredictResponse)
def predict_pothole_lifetime(body: LifetimePredictRequest) -> LifetimePredictResponse:
    if get_lifetime_model() is None or get_encoders() is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Lifetime model is unavailable.",
        )
    try:
        result = predict_lifetime(
            severity=body.severity,
            bounding_box_percentage=body.bounding_box_percentage,
            road_type=body.road_type,
            traffic_density=body.traffic_density,
            location=body.location,
        )
    except Exception as exc:
        detail = str(exc).strip() or "Lifetime prediction failed."
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail[:200],
        ) from exc
    return LifetimePredictResponse.model_validate(result)
