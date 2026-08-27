from fastapi import APIRouter

from ..schemas import WeatherOut
from ..services.weather_service import get_weather

router = APIRouter()


@router.get("/weather/{location}", response_model=WeatherOut)
def weather(location: str) -> WeatherOut:
    return WeatherOut.model_validate(get_weather(location))
