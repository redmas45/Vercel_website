from __future__ import annotations

from fastapi import HTTPException


def clean_email(email: str) -> str:
    clean = str(email or "").strip().lower()
    if "@" not in clean or "." not in clean.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Valid email is required.")
    return clean


def required_text(value: str, message: str) -> str:
    clean = str(value or "").strip()
    if not clean:
        raise HTTPException(status_code=422, detail=message)
    return clean
