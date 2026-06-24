from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.validation import clean_email
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.models import User
from app.dependencies import get_user_repository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserSchema

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    req: SignupRequest,
    user_repository: UserRepository = Depends(get_user_repository),
) -> AuthResponse:
    email = clean_email(req.email)
    existing = await user_repository.get_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="Email is already registered.")
    user = await user_repository.create_user(
        email=email,
        name=req.name.strip(),
        password_hash=hash_password(req.password),
        role="customer",
    )
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
async def login(
    req: LoginRequest,
    user_repository: UserRepository = Depends(get_user_repository),
) -> AuthResponse:
    user = await user_repository.get_by_email(clean_email(req.email))
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return _auth_response(user)


async def current_user(
    authorization: str = Header(default=""),
    user_repository: UserRepository = Depends(get_user_repository),
) -> User:
    token = _bearer_token(authorization)
    payload = decode_access_token(token) if token else None
    if not payload:
        raise HTTPException(status_code=401, detail="Sign in required.")
    user_id = int(payload.get("sub") or 0)
    user = await user_repository.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")
    return user


async def current_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


@router.get("/me", response_model=UserSchema)
async def me(user: User = Depends(current_user)) -> User:
    return user


def _auth_response(user: User) -> AuthResponse:
    token = create_access_token({"sub": user.id, "role": user.role})
    return AuthResponse(token=token, user=UserSchema.model_validate(user))


def _bearer_token(authorization: str) -> str:
    if not authorization.lower().startswith("bearer "):
        return ""
    return authorization.split(" ", 1)[1].strip()
