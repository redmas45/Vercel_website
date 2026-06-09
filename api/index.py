import base64
import hashlib
import hmac
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlparse, urlunparse
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"
ENV_FILE = ROOT / ".env"
LOCAL_INJECTION_FILE = ROOT / "lab" / "injection.js"
CATALOG_FILE = OUT_DIR / "api" / "products.json"

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


@app.middleware("http")
async def add_realistic_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=()",
    )
    response.headers.setdefault("Content-Security-Policy", content_security_policy())
    response.headers.setdefault("Access-Control-Allow-Origin", api_cors_origin())
    response.headers.setdefault("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.setdefault(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Lab-Api-Key",
    )
    response.set_cookie(
        "lab_session",
        "vercel-store-lab",
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24,
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


@app.get("/lab/injection.js")
def local_injection_script():
    if not LOCAL_INJECTION_FILE.is_file():
        return Response("// lab/injection.js not found\n", media_type="application/javascript")
    return FileResponse(LOCAL_INJECTION_FILE, media_type="application/javascript")


@app.get("/lab/remote.js")
def remote_injection_script():
    script_url = os.getenv("LAB_REMOTE_SCRIPT_URL", "").strip()
    if not script_url:
        return Response(
            "console.error('LAB_REMOTE_SCRIPT_URL is not configured');\n",
            media_type="application/javascript",
            status_code=404,
        )

    parsed = urlparse(script_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return Response(
            "console.error('LAB_REMOTE_SCRIPT_URL is invalid');\n",
            media_type="application/javascript",
            status_code=400,
        )

    request = UrlRequest(script_url, headers=remote_script_headers())
    with urlopen(request, timeout=15) as upstream:
        content = upstream.read()

    return Response(content, media_type="application/javascript")


@app.get("/lab/shopbot.js")
def shopbot_script(request: Request):
    auth_error = require_access_key(request)
    if auth_error:
        return javascript_error("[lab] Invalid or missing access key", status_code=401)

    backend_url = os.getenv(
        "SHOPBOT_BACKEND_URL",
        "https://d962-103-97-243-133.ngrok-free.app",
    ).strip()
    site_id = os.getenv("SHOPBOT_SITE_ID", "https_demo_vercel_store").strip()
    base_url = backend_url.rstrip("/")
    upstream_urls = [
        f"{base_url}/shopbot.js?site={quote(site_id)}",
        f"{base_url}/shopbot.js",
    ]

    parsed = urlparse(base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return javascript_error("[lab] SHOPBOT_BACKEND_URL is invalid", status_code=400)

    last_error = None
    for upstream_url in upstream_urls:
        try:
            request = UrlRequest(upstream_url, headers={"User-Agent": "vercel-store-lab/1.0"})
            with urlopen(request, timeout=15) as upstream:
                content = upstream.read()

            return Response(
                content,
                media_type="application/javascript; charset=utf-8",
                headers={"Cache-Control": "no-store, max-age=0"},
            )
        except Exception as exc:
            last_error = exc

    return javascript_error(
        f"[lab] Failed to load ShopBot from {base_url}/shopbot.js: {last_error}",
        status_code=502,
    )


@app.get("/api/shopbot.js")
def shopbot_entry_script(request: Request):
    auth_error = require_access_key(request)
    if auth_error:
        return javascript_error("[lab] Invalid or missing access key", status_code=401)

    provided_key = provided_access_key(request)
    site_id = os.getenv("SHOPBOT_SITE_ID", "https_demo_vercel_store").strip()
    catalog_base_url = os.getenv(
        "CATALOG_BASE_URL",
        "https://vercelclonedwebsite.vercel.app",
    ).strip()
    catalog_api_url = os.getenv(
        "CATALOG_API_URL",
        f"{catalog_base_url.rstrip('/')}/api/products",
    ).strip()
    catalog_api_url = with_access_key(catalog_api_url, provided_key)
    config = {
        "siteId": site_id,
        "catalogBaseUrl": catalog_base_url.rstrip("/"),
        "catalogApiUrl": catalog_api_url,
        "shopbotScriptUrl": f"/lab/shopbot.js?key={quote(provided_key)}",
    }
    js = f"""
(() => {{
  if (window.__SHOPBOT_ENTRY_LOADED__) return;
  window.__SHOPBOT_ENTRY_LOADED__ = true;
  window.__SHOPBOT_CONFIG__ = Object.assign({{}}, window.__SHOPBOT_CONFIG__ || {{}}, {json.dumps(config)});

  if (document.querySelector('script[data-shopbot-loader="1"]')) return;

  const script = document.createElement("script");
  script.src = window.__SHOPBOT_CONFIG__.shopbotScriptUrl;
  script.async = true;
  script.defer = true;
  script.dataset.shopbotLoader = "1";
  document.head.appendChild(script);
}})();
""".lstrip()
    return Response(
        js,
        media_type="application/javascript; charset=utf-8",
        headers={"Cache-Control": "no-store, max-age=0"},
    )


@app.get("/api/products")
def list_products(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: str | None = Query(None),
    q: str | None = Query(None),
):
    auth_error = require_access_key(request)
    if auth_error:
        return auth_error

    products = load_catalog().get("products", [])

    if category:
        normalized_category = category.strip().lower()
        products = [
            product
            for product in products
            if normalized_category in [item.lower() for item in product.get("categories", [])]
        ]

    if q:
        needle = q.strip().lower()
        products = [
            product
            for product in products
            if needle in product.get("title", "").lower()
            or needle in product.get("description", "").lower()
        ]

    total = len(products)
    start = (page - 1) * limit
    end = start + limit

    return JSONResponse(
        {
            "data": products[start:end],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit,
                "has_next": end < total,
                "has_prev": page > 1,
            },
        }
    )


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


@app.get("/api/catalog")
def get_catalog(request: Request):
    auth_error = require_access_key(request)
    if auth_error:
        return auth_error

    return JSONResponse(load_catalog())


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

    position = os.getenv("LAB_INJECTION_POSITION", "body").lower()
    marker = "</head>" if position == "head" else "</body>"

    if marker in html:
        return html.replace(marker, f"{script}\n{marker}", 1)
    return f"{html}\n{script}"


def injection_markup() -> str:
    if os.getenv("LAB_INJECTION_ENABLED", "true").lower() == "false":
        return ""

    default_src = f"/api/shopbot.js?key={quote(raw_access_key())}" if raw_access_key() else ""
    html = os.getenv("LAB_INJECTION_HTML", "").strip()
    src = os.getenv("LAB_INJECTION_SRC", default_src).strip()
    code = os.getenv("LAB_INJECTION_CODE", "").strip()
    encoded_code = os.getenv("LAB_INJECTION_CODE_BASE64", "").strip()

    if html:
        return html
    if src:
        return f'<script src="{escape_attr(src)}" data-lab-injection="external"></script>'
    if encoded_code:
        try:
            decoded = base64.b64decode(encoded_code).decode("utf-8")
            return f"<script data-lab-injection=\"base64\">\n{decoded}\n</script>"
        except Exception:
            return "<script>console.error('Invalid LAB_INJECTION_CODE_BASE64');</script>"
    if code:
        return f"<script data-lab-injection=\"inline\">\n{code}\n</script>"
    return ""


def content_security_policy() -> str:
    mode = os.getenv("LAB_SECURITY_MODE", "lab").lower()
    script_origins = ["'self'"]

    extra_origins = os.getenv("LAB_ALLOWED_SCRIPT_ORIGINS", "").strip()
    if extra_origins:
        script_origins.extend(extra_origins.split())

    if mode == "strict":
        script_policy = " ".join(script_origins)
    else:
        script_policy = " ".join([*script_origins, "'unsafe-inline'", "'unsafe-eval'"])

    return "; ".join(
        [
            "default-src 'self'",
            f"script-src {script_policy}",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "connect-src 'self' https:",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
    )


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
        return None

    provided_key = provided_access_key(request)

    if not provided_key:
        return JSONResponse({"error": "Missing access key"}, status_code=401)

    provided_hash = hashlib.sha256(provided_key.encode("utf-8")).hexdigest()
    if not constant_time_equal(provided_hash, expected_hash):
        return JSONResponse({"error": "Invalid access key"}, status_code=403)

    return None


def access_key_hash() -> str:
    return os.getenv(
        "LAB_ACCESS_KEY_SHA256",
        "754d419d884d379a7d8bd2d8e033c4cac522654b7885222bd2781f4ad2b01e45",
    ).strip().lower()


def raw_access_key() -> str:
    return os.getenv(
        "LAB_ACCESS_KEY",
        "lab_V13Ml2GwTwyYoRXpmIBSovFnJTpbomxW4bKc581G35g",
    ).strip()


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


def with_access_key(url: str, key: str) -> str:
    if not key:
        return url

    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["key"] = key
    return urlunparse(parsed._replace(query=urlencode(query)))


def remote_script_headers() -> dict[str, str]:
    headers = {"User-Agent": "vercel-store-lab/1.0"}
    api_key = os.getenv("LAB_REMOTE_SCRIPT_KEY", "").strip()
    header_name = os.getenv("LAB_REMOTE_SCRIPT_KEY_HEADER", "X-Lab-Api-Key").strip()

    if api_key and header_name:
        headers[header_name] = api_key
    return headers


def javascript_error(message: str, status_code: int = 500):
    return Response(
        f"console.error({json.dumps(message)});\n",
        status_code=status_code,
        media_type="application/javascript; charset=utf-8",
        headers={"Cache-Control": "no-store, max-age=0"},
    )


def escape_attr(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


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
