from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import create_token, get_current_user, hash_password, verify_password
from ..db import get_db
from ..models import User
from ..schemas import AuthUser, LoginRequest, MeResponse, SignupRequest, user_to_auth

router = APIRouter()


def _authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return user


@router.post("/signup", response_model=AuthUser)
def signup(body: SignupRequest, db: Annotated[Session, Depends(get_db)]) -> AuthUser:
    email = body.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email")
    exists = db.scalar(select(User).where(User.email == email))
    if exists is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    user = User(
        name=body.name.strip(),
        email=email,
        password_hash=hash_password(body.password),
        role="citizen",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_to_auth(user, create_token(user))


@router.post("/login", response_model=AuthUser)
def login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> AuthUser:
    user = _authenticate(db, body.email, body.password)
    return user_to_auth(user, create_token(user))


@router.post("/admin/login", response_model=AuthUser)
def admin_login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> AuthUser:
    user = _authenticate(db, body.email, body.password)
    return user_to_auth(user, create_token(user))


@router.get("/me", response_model=MeResponse)
def me(user: Annotated[User, Depends(get_current_user)]) -> MeResponse:
    return MeResponse(name=user.name, email=user.email, role=user.role)  # type: ignore[arg-type]
