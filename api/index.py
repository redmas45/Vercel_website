import hashlib
import hmac
import json
import mimetypes
import os
import re
from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"
ENV_FILE = ROOT / ".env"
CATALOG_FILE = OUT_DIR / "api" / "products.json"
SCRIPT_SRC_RE = re.compile(r"<script\b[^>]*\bsrc=(['\"])(.*?)\1", re.IGNORECASE)

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), geolocation=(), payment=()",
    )
    response.headers.setdefault("Content-Security-Policy", content_security_policy())
    response.headers.setdefault("Access-Control-Allow-Origin", api_cors_origin())
    response.headers.setdefault("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.setdefault(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Lab-Api-Key",
    )
    return response


@app.options("/{requested_path:path}")
def options_preflight(requested_path: str = ""):
    return Response(status_code=204)


@app.get("/_next/image")
def proxy_next_image(url: str = Query(...)):
    parsed = urlparse(url)
    allowed_hosts = allowed_image_hosts()

    if parsed.scheme not in {"http", "https"} or parsed.hostname not in allowed_hosts:
        return Response("Image host is not allowed.", status_code=403)

    request = UrlRequest(url, headers={"User-Agent": "vercel-store-lab/1.0"})
    with urlopen(request, timeout=15) as upstream:
        content = upstream.read()
        content_type = upstream.headers.get_content_type() or "application/octet-stream"

    return Response(content, media_type=content_type)


@app.get("/api/products")
def list_products(request: Request):
    auth_error = require_access_key(request)
    if auth_error:
        return auth_error

    products = load_catalog().get("products", [])
    return JSONResponse({"data": products})


@app.get("/api/products/{product_id}")
def get_product(product_id: str, request: Request):
    auth_error = require_access_key(request)
    if auth_error:
        return auth_error

    products = load_catalog().get("products", [])
    for product in products:
        if product.get("id") == product_id or product.get("handle") == product_id:
            return JSONResponse({"data": product})

    return JSONResponse({"error": "Product not found"}, status_code=404)


@app.get("/{requested_path:path}")
def serve_static_clone(requested_path: str = ""):
    requested_path = unquote(requested_path).strip("/")

    for candidate in static_candidates(requested_path):
        if candidate.is_file():
            return serve_file(candidate)

    fallback = OUT_DIR / "index.html"
    if fallback.is_file():
        return serve_file(fallback)

    return HTMLResponse("<h1>Static clone output not found.</h1>", status_code=404)


def serve_file(path: Path):
    if path.suffix.lower() in {".html", ".htm"}:
        html = path.read_text(encoding="utf-8")
        return HTMLResponse(inject_lab_script(html))

    content_type, _ = mimetypes.guess_type(path.name)
    return FileResponse(path, media_type=content_type)


def static_candidates(requested_path: str):
    raw_candidates = []
    if requested_path:
        raw_candidates.append(OUT_DIR / requested_path)
        raw_candidates.append(OUT_DIR / requested_path / "index.html")
        if not Path(requested_path).suffix:
            raw_candidates.append(OUT_DIR / f"{requested_path}.html")
    else:
        raw_candidates.append(OUT_DIR / "index.html")

    safe_candidates = []
    out_root = OUT_DIR.resolve()
    for candidate in raw_candidates:
        resolved = candidate.resolve()
        if str(resolved).startswith(str(out_root)):
            safe_candidates.append(resolved)
    return safe_candidates


def inject_lab_script(html: str) -> str:
    script = injection_markup()
    if not script:
        return html

    marker = "</head>"
    if marker in html:
        return html.replace(marker, f"{script}\n{marker}", 1)
    return f"{script}\n{html}"


def injection_markup() -> str:
    return os.getenv("LAB_INJECTION_HTML", "").strip()


def content_security_policy() -> str:
    script_origins = ["'self'"]
    script_origins.extend(sorted(allowed_script_origins()))
    script_policy = " ".join(dict.fromkeys(script_origins))

    return "; ".join(
        [
            "default-src 'self'",
            f"script-src {script_policy} 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "media-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "connect-src 'self' https:",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
    )


def allowed_script_origins() -> set[str]:
    configured = {
        origin.strip()
        for origin in os.getenv("LAB_ALLOWED_SCRIPT_ORIGINS", "").split()
        if origin.strip()
    }
    return configured | script_origins_from_markup(injection_markup())


def script_origins_from_markup(markup: str) -> set[str]:
    origins = set()
    for _, src in SCRIPT_SRC_RE.findall(markup):
        parsed = urlparse(src.strip())
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            origins.add(f"{parsed.scheme}://{parsed.netloc}")
    return origins


def allowed_image_hosts() -> set[str]:
    configured = os.getenv(
        "IMAGE_PROXY_ALLOWED_HOSTS",
        "cdn.shopify.com demo.vercel.store vercel.com assets.vercel.com",
    )
    return {host.strip().lower() for host in configured.split() if host.strip()}


def load_catalog():
    if not CATALOG_FILE.is_file():
        return {"source": "https://demo.vercel.store/", "count": 0, "products": []}

    return json.loads(CATALOG_FILE.read_text(encoding="utf-8"))


def api_cors_origin() -> str:
    return os.getenv("API_CORS_ORIGIN", "*").strip() or "*"


def require_access_key(request: Request):
    expected_hash = access_key_hash()
    if not expected_hash:
        return JSONResponse({"error": "Access key is not configured"}, status_code=503)

    provided_key = provided_access_key(request)
    if not provided_key:
        return JSONResponse({"error": "Missing access key"}, status_code=401)

    provided_hash = hashlib.sha256(provided_key.encode("utf-8")).hexdigest()
    if not constant_time_equal(provided_hash, expected_hash):
        return JSONResponse({"error": "Invalid access key"}, status_code=401)

    return None


def access_key_hash() -> str:
    return os.getenv("LAB_ACCESS_KEY_SHA256", "").strip().lower()


def provided_access_key(request: Request) -> str:
    return (
        request.query_params.get("key")
        or request.headers.get("x-lab-api-key")
        or bearer_token(request.headers.get("authorization", ""))
        or ""
    ).strip()


def bearer_token(value: str) -> str:
    prefix = "Bearer "
    return value[len(prefix):].strip() if value.startswith(prefix) else ""


def constant_time_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(left, right)


def load_dotenv_file():
    if not ENV_FILE.is_file():
        return

    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_dotenv_file()
