from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.post("/detect")
def detect() -> None:
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This dummy detector has been retired. Use POST /api/detect with an image.",
    )
