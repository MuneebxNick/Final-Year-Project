from fastapi import APIRouter, HTTPException, Query, status

from ..ml.lifetime import get_encoders, get_lifetime_model, predict_lifetime
from ..ml.maintenance import list_segments
from ..schemas import (
    LifetimePredictRequest,
    LifetimePredictResponse,
    PredictiveMaintenanceSegment,
)

router = APIRouter()


@router.get(
    "/predictive-maintenance",
    response_model=list[PredictiveMaintenanceSegment],
)
def predictive_maintenance(
    city: str | None = Query(default=None),
    category: str | None = Query(default=None),
) -> list[PredictiveMaintenanceSegment]:
    rows = list_segments(city=city, category=category)
    if rows is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Predictive maintenance models are unavailable.",
        )
    return [PredictiveMaintenanceSegment.model_validate(row) for row in rows]


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
