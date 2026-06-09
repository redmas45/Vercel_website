import base64
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, Response


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"
ENV_FILE = ROOT / ".env"
LOCAL_INJECTION_FILE = ROOT / "lab" / "injection.js"

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
    response.set_cookie(
        "lab_session",
        "vercel-store-lab",
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24,
    )
    return response


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

    default_src = "/lab/injection.js" if LOCAL_INJECTION_FILE.is_file() else ""
    src = os.getenv("LAB_INJECTION_SRC", default_src).strip()
    code = os.getenv("LAB_INJECTION_CODE", "").strip()
    encoded_code = os.getenv("LAB_INJECTION_CODE_BASE64", "").strip()

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
