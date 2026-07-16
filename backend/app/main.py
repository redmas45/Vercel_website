from __future__ import annotations

from contextlib import asynccontextmanager
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from app.api import admin, auth, cart_suggestions, health, pincode, products, reviews, search, wishlist
from app.core.config import settings
from app.db.models import Base
from app.db.migrate import migrate_existing_schema
from app.db.seed import ensure_default_admin, seed_if_empty
from app.db.session import engine


mimetypes.add_type("image/webp", ".webp")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_existing_schema(engine)
    await seed_if_empty()
    await ensure_default_admin()
    yield


app = FastAPI(
    title="AI-KART Backend",
    version="2.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Lab-Api-Key"],
)


# ─── Security headers middleware ──────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(self), geolocation=(), payment=()",
    )
    response.headers.setdefault("Content-Security-Policy", _build_csp())
    return response


def _build_csp() -> str:
    allowed = list(settings.allowed_script_origins_set)
    script_origins = " ".join(["'self'"] + allowed)
    connect_origins = " ".join(["'self'", "https:"] + allowed)
    return "; ".join(
        [
            "default-src 'self'",
            f"script-src {script_origins} 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data: https:",
            f"connect-src {connect_origins}",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
    )


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(products.router)
app.include_router(reviews.router)
app.include_router(search.router)
app.include_router(wishlist.router)
app.include_router(cart_suggestions.router)
app.include_router(pincode.router)

static_dir = Path(settings.upload_dir).parent
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")
