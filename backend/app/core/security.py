from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from app.core.config import settings

HASH_ITERATIONS = 210_000
PASSWORD_SALT_BYTES = 16
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7


def hash_password(password: str) -> str:
    clean_password = _required_password(password)
    salt = secrets.token_bytes(PASSWORD_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", clean_password.encode("utf-8"), salt, HASH_ITERATIONS)
    return f"pbkdf2_sha256${HASH_ITERATIONS}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt_text, digest_text = stored_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    salt = _unb64(salt_text)
    expected = _unb64(digest_text)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
    return hmac.compare_digest(actual, expected)


def create_access_token(payload: dict[str, Any]) -> str:
    expires_at = int(time.time()) + TOKEN_TTL_SECONDS
    body = {**payload, "exp": expires_at}
    body_text = _b64(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    signature = _sign(body_text)
    return f"{body_text}.{signature}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    parts = token.split(".", 1)
    if len(parts) != 2:
        return None
    body_text, signature = parts
    if not hmac.compare_digest(_sign(body_text), signature):
        return None
    try:
        payload = json.loads(_unb64(body_text))
    except (ValueError, json.JSONDecodeError):
        return None
    if int(payload.get("exp") or 0) < int(time.time()):
        return None
    return payload if isinstance(payload, dict) else None


def _required_password(password: str) -> str:
    clean = str(password or "")
    if len(clean) < 6:
        raise ValueError("Password must be at least 6 characters.")
    return clean


def _sign(body_text: str) -> str:
    digest = hmac.new(settings.auth_secret_key.encode("utf-8"), body_text.encode("utf-8"), hashlib.sha256).digest()
    return _b64(digest)


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _unb64(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)
