from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from ..schemas import ReverseGeocodeOut
from ..services.geocode_service import ReverseGeocodeError, reverse_geocode as lookup

router = APIRouter()


@router.get("/geocode/reverse", response_model=ReverseGeocodeOut)
def reverse_geocode(
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
) -> ReverseGeocodeOut:
    try:
        result = lookup(lat, lng)
    except ReverseGeocodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc) or "Could not look up this location.",
        ) from exc
    return ReverseGeocodeOut.model_validate(result)
