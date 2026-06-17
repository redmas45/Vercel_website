from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class UserSchema(BaseModel):
    id: int
    email: str = Field(..., min_length=3, max_length=255)
    name: str = ""
    role: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6)


class SignupRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6)
    name: str = Field(default="", max_length=255)


class AuthResponse(BaseModel):
    token: str
    user: UserSchema


class CreateUserRequest(SignupRequest):
    role: str = Field(default="customer", pattern="^(admin|customer)$")
