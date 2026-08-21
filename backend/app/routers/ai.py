from fastapi import APIRouter

from ..ai.detect import mock_detect
from ..schemas import DetectRequest, DetectResponse

router = APIRouter()


@router.post("/detect", response_model=DetectResponse)
def detect(body: DetectRequest) -> DetectResponse:
    result = mock_detect(body.city, body.area.strip())
    return DetectResponse.model_validate(result)
