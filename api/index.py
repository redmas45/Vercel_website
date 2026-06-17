import hashlib
import hmac
import html
import json
import mimetypes
import os
import re
import time
from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.request import Request as UrlRequest
from urllib.error import HTTPError
from urllib.request import urlopen
from contextlib import asynccontextmanager

from api.database import (
    init_db,
    get_all_products,
    get_product as db_get_product,
    upsert_product,
    delete_product as db_delete_product,
    replenish_stock as db_replenish_stock
)

from fastapi import FastAPI, Query, Request, Depends, Form, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.security import HTTPBasic, HTTPBasicCredentials


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"
ENV_FILE = ROOT / ".env"
CATALOG_FILE = OUT_DIR / "api" / "products.json"
SCRIPT_SRC_RE = re.compile(r"<script\b[^>]*\bsrc=(['\"])(.*?)\1", re.IGNORECASE)
SHOPBOT_DISABLED_RE = re.compile(
    r"<script>\s*console\.warn\(\"Voice orb widget disabled:[\s\S]*?</script>\s*",
    re.IGNORECASE,
)
SHOPBOT_SCRIPT_TAG_RE = re.compile(
    r"<script\b[^>]*\bsrc=(['\"])[^'\"]*/shopbot\.js(?:\?[^'\"]*)?\1[^>]*>\s*</script>\s*",
    re.IGNORECASE,
)
SHOPBOT_INLINE_SCRIPT_TAG_RE = re.compile(
    r"<script\b(?=[^>]*\bdata-api-url=)(?=[^>]*\bdata-site-id=)[\s\S]*?</script>\s*",
    re.IGNORECASE,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)

security = HTTPBasic()
FAILED_ADMIN_LOGINS: dict[str, list[float]] = {}
ADMIN_LOGIN_WINDOW_SECONDS = 300
ADMIN_LOGIN_MAX_FAILURES = 8


def verify_admin(request: Request, credentials: HTTPBasicCredentials = Depends(security)):
    client_key = request.client.host if request.client else "unknown"
    if admin_login_limited(client_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts.",
            headers={"Retry-After": "300"},
        )

    expected_user = os.getenv("ADMIN_USERNAME", "admin")
    expected_password = os.getenv("ADMIN_PASSWORD", "admin")
    username_ok = hmac.compare_digest(credentials.username, expected_user)
    password_ok = hmac.compare_digest(credentials.password, expected_password)
    if not (username_ok and password_ok):
        record_failed_admin_login(client_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    clear_failed_admin_logins(client_key)
    return credentials.username


def verify_admin_mutation(request: Request, username: str = Depends(verify_admin)):
    if not same_origin_mutation(request):
        raise HTTPException(status_code=403, detail="Cross-origin admin mutation blocked.")
    return username


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    https_redirect = maybe_https_redirect(request)
    if https_redirect:
        return https_redirect

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(self), geolocation=(), payment=()",
    )
    response.headers.setdefault("Content-Security-Policy", content_security_policy())
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
    if is_secure_request(request):
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
    if request.url.path.startswith("/admin"):
        response.headers.setdefault("Cache-Control", "no-store")
    cors_origin = api_cors_origin()
    if cors_origin:
        response.headers.setdefault("Access-Control-Allow-Origin", cors_origin)
        response.headers.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.headers.setdefault(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Lab-Api-Key",
    )
    return response


@app.options("/{requested_path:path}")
def options_preflight(requested_path: str = ""):
    return Response(status_code=204)


@app.api_route("/health", methods=["GET", "HEAD"])
async def proxy_backend_health(request: Request):
    return await proxy_backend_request(request, "health")


@app.api_route("/shopbot.js", methods=["GET"])
async def proxy_shopbot_script(request: Request):
    return await proxy_backend_request(request, "shopbot.js")


@app.api_route("/shopbot-widget.js", methods=["GET"])
async def proxy_shopbot_widget(request: Request):
    return await proxy_backend_request(request, "shopbot-widget.js")


@app.api_route("/shopbot-frame", methods=["GET"])
async def proxy_shopbot_frame(request: Request):
    return await proxy_backend_request(request, "shopbot-frame")


@app.api_route("/v1/{backend_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_backend_api(backend_path: str, request: Request):
    return await proxy_backend_request(request, f"v1/{backend_path}")


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
def list_products(request: Request) -> JSONResponse:
    products = get_all_products()
    return JSONResponse({"data": products})


@app.get("/api/products/{product_id}")
def get_product(product_id: str, request: Request) -> JSONResponse:
    product = db_get_product(product_id)
    if product:
        return JSONResponse({"data": product})

    return JSONResponse({"error": "Product not found"}, status_code=404)


@app.get("/admin", response_class=HTMLResponse)
def admin_panel(username: str = Depends(verify_admin)) -> str:
    products = get_all_products()
    rows = "\n".join(render_admin_product_row(product) for product in products)
    site_id = html.escape(os.getenv("AI_DEFAULT_SITE_ID", "ai_kart_main"))

    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AI-KART Admin</title>
    <style>
      :root {{
        color-scheme: light;
        --ink: #161615;
        --muted: #67645f;
        --line: rgba(22, 22, 21, 0.12);
        --surface: #f7f7f3;
        --panel: #ffffff;
        --accent: #155dfc;
        --copper: #a76335;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        background: var(--surface);
        color: var(--ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }}
      header {{
        position: sticky;
        top: 0;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px clamp(18px, 4vw, 44px);
        border-bottom: 1px solid var(--line);
        background: rgba(247, 247, 243, 0.92);
        backdrop-filter: blur(14px);
      }}
      a {{ color: inherit; }}
      .brand {{ display: flex; align-items: center; gap: 12px; font-weight: 800; letter-spacing: 0; }}
      .brand-mark {{
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 8px;
        background: var(--ink);
        color: white;
        font-size: 13px;
      }}
      main {{ width: min(1180px, calc(100% - 32px)); margin: 28px auto 56px; display: grid; gap: 22px; }}
      .grid {{ display: grid; grid-template-columns: minmax(280px, 380px) minmax(0, 1fr); gap: 22px; align-items: start; }}
      .panel {{
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 8px;
        box-shadow: 0 18px 48px rgba(22, 22, 21, 0.06);
      }}
      .panel h1, .panel h2 {{ margin: 0; letter-spacing: 0; }}
      .panel-head {{ padding: 20px; border-bottom: 1px solid var(--line); }}
      .panel-head p {{ margin: 8px 0 0; color: var(--muted); line-height: 1.45; }}
      form {{ display: grid; gap: 14px; padding: 20px; }}
      label {{ display: grid; gap: 7px; color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }}
      input, textarea {{
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fff;
        color: var(--ink);
        font: inherit;
        padding: 11px 12px;
        outline: none;
      }}
      textarea {{ min-height: 96px; resize: vertical; }}
      input:focus, textarea:focus {{ border-color: rgba(21, 93, 252, 0.55); box-shadow: 0 0 0 3px rgba(21, 93, 252, 0.1); }}
      .row {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
      button {{
        border: 0;
        border-radius: 8px;
        background: var(--ink);
        color: #fff;
        min-height: 42px;
        padding: 0 16px;
        font-weight: 760;
        cursor: pointer;
      }}
      button.secondary {{ background: #eef1eb; color: var(--ink); }}
      button.danger {{ background: #8b2f22; }}
      .toolbar {{ display: flex; gap: 10px; flex-wrap: wrap; padding: 16px 20px; border-bottom: 1px solid var(--line); }}
      .status-grid {{ display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 10px; padding: 20px; }}
      .metric {{ border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: #fbfbf7; }}
      .metric strong {{ display: block; font-size: 24px; }}
      .metric span {{ color: var(--muted); font-size: 12px; }}
      .table-wrap {{ overflow-x: auto; }}
      table {{ width: 100%; border-collapse: collapse; min-width: 760px; }}
      th, td {{ padding: 13px 16px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }}
      th {{ color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }}
      td img {{ width: 52px; height: 52px; object-fit: contain; border-radius: 8px; background: #f1f2ee; border: 1px solid var(--line); }}
      .product-cell {{ display: flex; gap: 12px; align-items: center; min-width: 260px; }}
      .product-cell strong {{ display: block; }}
      .product-cell span {{ color: var(--muted); font-size: 13px; }}
      .actions {{ display: flex; gap: 8px; align-items: center; }}
      .actions form {{ padding: 0; display: contents; }}
      .muted {{ color: var(--muted); }}
      @media (max-width: 840px) {{
        .grid {{ grid-template-columns: 1fr; }}
        .status-grid {{ grid-template-columns: 1fr 1fr; }}
      }}
    </style>
  </head>
  <body>
    <header>
      <div class="brand"><span class="brand-mark">AK</span><span>AI-KART Admin</span></div>
      <a href="/">Back to storefront</a>
    </header>
    <main>
      <section class="panel">
        <div class="panel-head">
          <h1>Catalog Control</h1>
          <p>Add, update, delete, and restock storefront products. The backend crawler reads this catalog on the next sync and updates RAG from there.</p>
        </div>
        <div class="status-grid" id="sync-status" data-site-id="{site_id}">
          <div class="metric"><strong>{len(products)}</strong><span>Storefront products</span></div>
          <div class="metric"><strong>-</strong><span>RAG active products</span></div>
          <div class="metric"><strong>-</strong><span>Missing embeddings</span></div>
          <div class="metric"><strong>-</strong><span>Last crawler sync</span></div>
        </div>
      </section>

      <section class="grid">
        <aside class="panel">
          <div class="panel-head">
            <h2>Add or Update Product</h2>
            <p>Use the same ID to update an existing product.</p>
          </div>
          <form method="post" action="/admin/products" id="product-form">
            <label>Product ID / Handle <input name="product_id" placeholder="nova-premium-mug"></label>
            <label>Name <input name="name" required placeholder="NOVA Premium Mug"></label>
            <label>Description <textarea name="description" id="product-description" placeholder="Short customer-facing description"></textarea></label>
            <button type="button" class="secondary" id="generate-description">Generate Description with AI</button>
            <div class="row">
              <label>Category <input name="category" required placeholder="drinkware"></label>
              <label>Brand <input name="brand" value="NOVA"></label>
            </div>
            <div class="row">
              <label>Price <input name="price" required type="number" min="0" step="0.01" value="25"></label>
              <label>Stock <input name="stock" required type="number" min="0" step="1" value="100"></label>
            </div>
            <label>Image URL <input name="image_url" id="image-url-input" placeholder="https://..."></label>
            <input type="file" id="local-image-upload" accept="image/*" style="display: none;">
            <button type="button" class="secondary" id="trigger-upload">Upload Local Image</button>
            <button type="submit">Save Product</button>
          </form>
        </aside>

        <section class="panel">
          <div class="panel-head">
            <h2>Products</h2>
            <p>{len(products)} products in the storefront catalog.</p>
          </div>
          <div class="toolbar">
            <input type="text" id="admin-search" placeholder="Search products by name or category..." style="width: 300px;">
            <form method="post" action="/admin/replenish"><button class="secondary" type="submit">Replenish All Stock</button></form>
            <form method="post" action="/v1/catalog/crawler/run" style="display:inline;" target="crawler-frame" onsubmit="this.querySelector('button').textContent='Running...'; setTimeout(() => this.querySelector('button').textContent='Run Crawler', 3000);"><button class="secondary" type="submit">Run Crawler</button></form>
            <iframe name="crawler-frame" style="display:none;"></iframe>
          </div>
          <div class="table-wrap">
            <table id="product-table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
              <tbody>{rows}</tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
    <script>
      const statusEl = document.getElementById("sync-status");
      async function loadStatus() {{
        try {{
          const siteId = statusEl.dataset.siteId || "ai_kart_main";
          const res = await fetch(`/v1/catalog/status?site_id=${{encodeURIComponent(siteId)}}`);
          if (!res.ok) throw new Error(`HTTP ${{res.status}}`);
          const data = await res.json();
          const catalog = data.catalog || {{}};
          const recent = (data.recent_sync_runs || [])[0];
          statusEl.innerHTML = `
            <div class="metric"><strong>{len(products)}</strong><span>Storefront products</span></div>
            <div class="metric"><strong>${{catalog.active_products ?? "-"}}</strong><span>RAG active products</span></div>
            <div class="metric"><strong>${{catalog.missing_embeddings ?? "-"}}</strong><span>Missing embeddings</span></div>
            <div class="metric"><strong>${{recent ? recent.created_at.split(".")[0] : "-"}}</strong><span>Last crawler sync</span></div>
          `;
        }} catch (err) {{
          statusEl.querySelectorAll(".metric")[1].querySelector("strong").textContent = "Offline";
        }}
      }}
      loadStatus();

      document.getElementById('trigger-upload')?.addEventListener('click', () => {{
        document.getElementById('local-image-upload')?.click();
      }});
      document.getElementById('local-image-upload')?.addEventListener('change', async (e) => {{
        const file = e.target.files[0];
        if (!file) return;
        const btn = document.getElementById('trigger-upload');
        const origText = btn.textContent;
        btn.textContent = 'Uploading...';
        btn.disabled = true;
        const fd = new FormData();
        fd.append('file', file);
        try {{
          const res = await fetch('/admin/upload-image', {{ method: 'POST', body: fd }});
          const data = await res.json();
          if (res.ok) {{
            document.getElementById('image-url-input').value = data.url;
          }} else {{
            alert('Upload failed: ' + (data.error || res.statusText));
          }}
        }} catch(err) {{
          alert('Upload error: ' + err.message);
        }} finally {{
          btn.textContent = origText;
          btn.disabled = false;
        }}
      }});

      document.getElementById('admin-search')?.addEventListener('input', (e) => {{
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#product-table tbody tr');
        rows.forEach(row => {{
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(term) ? '' : 'none';
        }});
      }});

      document.getElementById("generate-description")?.addEventListener("click", async () => {{
        const form = document.getElementById("product-form");
        const button = document.getElementById("generate-description");
        const description = document.getElementById("product-description");
        if (!form || !button || !description) return;
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "Writing...";
        try {{
          const res = await fetch("/admin/description", {{
            method: "POST",
            body: new FormData(form),
            credentials: "same-origin"
          }});
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || data.error || "Description generation failed");
          description.value = data.description || "";
        }} catch (err) {{
          alert(err.message || String(err));
        }} finally {{
          button.disabled = false;
          button.textContent = originalText;
        }}
      }});
    </script>
  </body>
</html>"""


@app.post("/admin/upload-image")
async def admin_upload_image(
    file: UploadFile = File(...),
    username: str = Depends(verify_admin_mutation)
):
    assets_dir = OUT_DIR / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{int(time.time())}_{file.filename.replace(' ', '_')}"
    file_path = assets_dir / filename
    with open(file_path, "wb") as f:
        f.write(await file.read())
    return JSONResponse({"url": f"/assets/{filename}"})

@app.post("/admin/description")
def admin_generate_description(
    request: Request,
    name: str = Form(""),
    category: str = Form(""),
    brand: str = Form("NOVA"),
    price: str = Form(""),
    username: str = Depends(verify_admin_mutation),
):
    if not os.getenv("OPENAI_API_KEY", "").strip():
        return JSONResponse({"error": "OPENAI_API_KEY is not configured."}, status_code=400)

    product_name = (name or "").strip()
    if not product_name:
        return JSONResponse({"error": "Enter a product name first."}, status_code=400)

    try:
        from openai import OpenAI

        client = OpenAI()
        model = os.getenv("LLM_MODEL", "gpt-4.1")
        prompt = (
            "Write one polished ecommerce product description for AI-KART. "
            "Use 1 short paragraph, 35-65 words, no markdown, no emojis, no claims about warranties or shipping. "
            f"Product name: {product_name}. Brand: {(brand or 'NOVA').strip()}. "
            f"Category: {(category or 'products').strip()}. Price: {(price or '').strip()}."
        )
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You write accurate, concise product descriptions for an ecommerce catalog."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.45,
            max_tokens=140,
        )
        description = (response.choices[0].message.content or "").strip()
        return JSONResponse({"description": description})
    except Exception as exc:
        return JSONResponse({"error": f"Description generation failed: {exc}"}, status_code=500)


@app.post("/admin/products")
def admin_save_product(
    product_id: str = Form(""),
    name: str = Form(...),
    description: str = Form(""),
    category: str = Form(...),
    brand: str = Form("NOVA"),
    price: float = Form(...),
    stock: int = Form(100),
    image_url: str = Form(""),
    username: str = Depends(verify_admin_mutation),
) -> RedirectResponse:
    product = normalize_admin_product(
        product_id=product_id,
        name=name,
        description=description,
        category=category,
        brand=brand,
        price=price,
        stock=stock,
        image_url=image_url,
    )
    upsert_product(product)
    return RedirectResponse("/admin", status_code=303)


@app.post("/admin/products/{product_id}/delete")
def admin_delete_product(product_id: str, username: str = Depends(verify_admin_mutation)) -> RedirectResponse:
    db_delete_product(product_id)
    return RedirectResponse("/admin", status_code=303)


@app.post("/admin/replenish")
def admin_replenish(username: str = Depends(verify_admin_mutation)) -> RedirectResponse:
    db_replenish_stock(100)
    return RedirectResponse("/admin", status_code=303)


@app.get("/{requested_path:path}")
def serve_static_clone(requested_path: str = ""):
    requested_path = unquote(requested_path).strip("/")

    for candidate in static_candidates(requested_path):
        if candidate.is_file():
            return serve_file(candidate)

    if requested_path.startswith("product/"):
        product_page = render_dynamic_product_page(requested_path)
        if product_page:
            return HTMLResponse(inject_lab_script(product_page))

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


def render_dynamic_product_page(requested_path: str) -> str:
    handle = requested_path.split("/", 1)[1].strip("/")
    if not handle:
        return ""

    product = find_catalog_product(handle)
    if not product:
        return ""

    name = html.escape(str(product.get("name") or product.get("title") or "Product"))
    brand = html.escape(str(product.get("brand") or product.get("vendor") or "NOVA"))
    category = html.escape(labelize(product.get("category") or "products"))
    description = html.escape(str(product.get("description") or "A curated AI-KART product, ready for your next order."))
    image_url = html.escape(str(product.get("image_url") or "https://demo.vercel.store/placeholder.png"))
    product_id = html.escape(str(product.get("id") or product.get("handle") or handle))
    price = float(product.get("price") or 0)

    return f"""<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{name} | AI-KART</title>
    <link rel="stylesheet" href="/premium-ui.css">
    <style>
      .dynamic-product {{
        max-width: 1180px;
        margin: 0 auto;
        padding: 86px 28px 48px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 0.75fr);
        gap: 42px;
      }}
      .dynamic-product-media {{
        min-height: 460px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(22, 22, 21, 0.1);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.82);
      }}
      .dynamic-product-media img {{
        width: min(78%, 560px);
        max-height: 560px;
        object-fit: contain;
        mix-blend-mode: multiply;
      }}
      .dynamic-product-info {{
        align-self: center;
      }}
      .dynamic-product-kicker {{
        margin: 0 0 10px;
        color: var(--ak-copper, #a76335);
        font-size: 12px;
        font-weight: 760;
        text-transform: uppercase;
      }}
      .dynamic-product-info h1 {{
        margin: 0;
        color: var(--ak-ink, #161615);
        font-size: clamp(34px, 5vw, 62px);
        font-weight: 780;
        line-height: 0.98;
      }}
      .dynamic-product-price {{
        margin: 18px 0;
        color: var(--ak-ink, #161615);
        font-size: 22px;
        font-weight: 780;
      }}
      .dynamic-product-description {{
        color: var(--ak-muted, #686660);
        font-size: 15px;
        line-height: 1.7;
      }}
      .dynamic-product-actions {{
        display: flex;
        gap: 10px;
        margin-top: 26px;
      }}
      .dynamic-product-actions button,
      .dynamic-product-actions a {{
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        padding: 0 18px;
        font-weight: 760;
        text-decoration: none;
      }}
      .dynamic-product-actions button {{
        border: 0;
        background: var(--ak-ink, #161615);
        color: #fff;
        cursor: pointer;
      }}
      .dynamic-product-actions a {{
        border: 1px solid rgba(22, 22, 21, 0.14);
        color: var(--ak-ink, #161615);
        background: rgba(255, 255, 255, 0.78);
      }}
      @media (max-width: 820px) {{
        .dynamic-product {{
          grid-template-columns: 1fr;
          padding: 76px 16px 36px;
        }}
        .dynamic-product-media {{
          min-height: 320px;
        }}
      }}
    </style>
  </head>
  <body>
    <main>
      <section class="dynamic-product">
        <div class="dynamic-product-media">
          <img src="{image_url}" alt="{name}">
        </div>
        <div class="dynamic-product-info">
          <p class="dynamic-product-kicker">{brand} / {category}</p>
          <h1>{name}</h1>
          <p class="dynamic-product-price">${price:.2f} USD</p>
          <p class="dynamic-product-description">{description}</p>
          <div class="dynamic-product-actions">
            <button type="button" data-dynamic-add="{product_id}">Add to cart</button>
            <a href="/">Back to catalog</a>
          </div>
        </div>
      </section>
    </main>
    <script src="/cart.js"></script>
    <script src="/premium-ui.js"></script>
    <script>
      document.addEventListener("click", function (event) {{
        var button = event.target.closest("[data-dynamic-add]");
        if (!button) return;
        var productId = button.getAttribute("data-dynamic-add");
        if (window.ShopCart && window.ShopCart.addItem) {{
          window.ShopCart.addItem(productId, 1);
        }}
      }});
    </script>
  </body>
</html>"""


def find_catalog_product(product_id: str) -> dict | None:
    return db_get_product(product_id)


def labelize(value: object) -> str:
    text = re.sub(r"[-_]+", " ", str(value or "")).strip()
    return re.sub(r"\s+", " ", text).title()


def static_candidates(requested_path: str):
    raw_candidates = []
    if requested_path:
        raw_candidates.append(OUT_DIR / requested_path)
        raw_candidates.append(OUT_DIR / requested_path / "index.html")
        if not Path(requested_path).suffix:
            raw_candidates.append(OUT_DIR / f"{requested_path}.html")
        mirrored_asset = mirrored_next_asset(requested_path)
        if mirrored_asset:
            raw_candidates.append(mirrored_asset)
    else:
        raw_candidates.append(OUT_DIR / "index.html")

    safe_candidates = []
    out_root = OUT_DIR.resolve()
    for candidate in raw_candidates:
        resolved = candidate.resolve()
        if str(resolved).startswith(str(out_root)):
            safe_candidates.append(resolved)
    return safe_candidates


def mirrored_next_asset(requested_path: str) -> Path | None:
    if not requested_path.startswith("_next/"):
        return None

    assets_dir = OUT_DIR / "assets"
    if not assets_dir.is_dir():
        return None

    clean_name = re.sub(r"[^a-z0-9._-]", "_", requested_path, flags=re.IGNORECASE)
    clean_name = clean_name.strip("_")
    matches = sorted(assets_dir.glob(f"{clean_name}_*"))
    return matches[0] if matches else None


async def proxy_backend_request(request: Request, backend_path: str) -> Response:
    backend_url = backend_request_url(backend_path, str(request.url.query or ""))
    body = await request.body()
    headers = backend_request_headers(request)

    try:
        upstream_request = UrlRequest(
            backend_url,
            data=body if request.method not in {"GET", "HEAD"} else None,
            headers=headers,
            method=request.method,
        )
        with urlopen(upstream_request, timeout=60) as upstream:
            content = upstream.read()
            status_code = upstream.status
            response_headers = backend_response_headers(upstream.headers.items())
    except HTTPError as exc:
        content = exc.read()
        status_code = exc.code
        response_headers = backend_response_headers(exc.headers.items())
    except Exception as exc:
        return JSONResponse(
            {"error": f"Backend proxy unavailable: {exc}"},
            status_code=502,
        )

    return Response(
        content=content,
        status_code=status_code,
        headers=response_headers,
        media_type=response_headers.get("content-type"),
    )


def backend_request_url(path: str, query: str) -> str:
    origin = os.getenv("SHOPBOT_BACKEND_ORIGIN", "http://127.0.0.1:8011").strip().rstrip("/")
    clean_path = path.strip("/")
    url = f"{origin}/{clean_path}"
    return f"{url}?{query}" if query else url


def backend_request_headers(request: Request) -> dict[str, str]:
    blocked = {
        "host",
        "connection",
        "content-length",
        "accept-encoding",
        "proxy-authenticate",
        "proxy-authorization",
        "upgrade",
    }
    return {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in blocked
    }


def backend_response_headers(items) -> dict[str, str]:
    blocked = {
        "connection",
        "content-encoding",
        "content-length",
        "transfer-encoding",
        "server",
        "date",
    }
    return {
        key: value
        for key, value in items
        if key.lower() not in blocked
    }


def admin_login_limited(client_key: str) -> bool:
    now = time.time()
    attempts = [
        timestamp
        for timestamp in FAILED_ADMIN_LOGINS.get(client_key, [])
        if now - timestamp < ADMIN_LOGIN_WINDOW_SECONDS
    ]
    FAILED_ADMIN_LOGINS[client_key] = attempts
    return len(attempts) >= ADMIN_LOGIN_MAX_FAILURES


def record_failed_admin_login(client_key: str) -> None:
    attempts = FAILED_ADMIN_LOGINS.setdefault(client_key, [])
    attempts.append(time.time())


def clear_failed_admin_logins(client_key: str) -> None:
    FAILED_ADMIN_LOGINS.pop(client_key, None)


def same_origin_mutation(request: Request) -> bool:
    expected_host = forwarded_host(request)
    for header_name in ("origin", "referer"):
        header_value = request.headers.get(header_name)
        if not header_value:
            continue
        parsed = urlparse(header_value)
        if parsed.netloc and parsed.netloc != expected_host:
            return False
    return True


def forwarded_host(request: Request) -> str:
    return request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc


def forwarded_proto(request: Request) -> str:
    return (request.headers.get("x-forwarded-proto") or request.url.scheme or "http").split(",", 1)[0].strip().lower()


def is_secure_request(request: Request) -> bool:
    return forwarded_proto(request) == "https"


def inject_lab_script(html: str) -> str:
    html = SHOPBOT_DISABLED_RE.sub("", html)
    html = SHOPBOT_INLINE_SCRIPT_TAG_RE.sub("", html)

    if SHOPBOT_SCRIPT_TAG_RE.search(html):
        return html

    script = injection_markup() or default_shopbot_script()
    if script and script not in html:
        head_marker = "</head>"
        if head_marker in html:
            html = html.replace(head_marker, f"{script}\n{head_marker}", 1)
        elif "<head>" in html:
            html = html.replace("<head>", f"<head>\n{script}", 1)
        else:
            html = f"{html}\n{script}"
    return html


def injection_markup() -> str:
    return os.getenv("LAB_INJECTION_HTML", "").strip()


def default_shopbot_script() -> str:
    site_id = os.getenv("SHOPBOT_SITE_ID", "ai_kart_main").strip() or "ai_kart_main"
    brand = os.getenv("SHOPBOT_BRAND", "AI-KART").strip() or "AI-KART"
    script_src = os.getenv("SHOPBOT_SCRIPT_SRC", f"/shopbot.js?site={site_id}").strip()
    if not script_src:
        return ""
    safe_src = html.escape(script_src, quote=True)
    safe_site_id = html.escape(site_id, quote=True)
    safe_brand = html.escape(brand, quote=True)
    return (
        f'<script defer src="{safe_src}" '
        f'data-site-id="{safe_site_id}" data-brand="{safe_brand}"></script>'
    )


def maybe_https_redirect(request: Request) -> Response | None:
    if is_secure_request(request) or is_local_request(request):
        return None

    https_origin = os.getenv("PUBLIC_HTTPS_ORIGIN", "").strip().rstrip("/")
    force_https = os.getenv("FORCE_HTTPS", "").strip().lower() in {"1", "true", "yes", "on"}
    if not https_origin and not force_https:
        return None

    target = f"{https_origin or ('https://' + forwarded_host(request))}{request.url.path}"
    if request.url.query:
        target = f"{target}?{request.url.query}"
    return RedirectResponse(target, status_code=308)


def is_local_request(request: Request) -> bool:
    host = forwarded_host(request).split(":", 1)[0].lower()
    return host in {"127.0.0.1", "localhost", "::1"}


def content_security_policy() -> str:
    script_origins = ["'self'"]
    script_origins.extend(sorted(allowed_script_origins()))
    script_policy = " ".join(dict.fromkeys(script_origins))
    connect_origins = ["'self'", "https:"]
    connect_origins.extend(sorted(allowed_script_origins()))
    connect_policy = " ".join(dict.fromkeys(connect_origins))
    media_origins = ["'self'", "data:", "blob:", "https:"]
    media_origins.extend(sorted(allowed_script_origins()))
    media_policy = " ".join(dict.fromkeys(media_origins))

    return "; ".join(
        [item for item in [
            "default-src 'self'",
            f"script-src {script_policy} 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            f"media-src {media_policy}",
            "font-src 'self' data:",
            f"connect-src {connect_policy}",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests" if os.getenv("PUBLIC_HTTPS_ORIGIN", "").strip() else "",
        ] if item]
    )


def allowed_script_origins() -> set[str]:
    configured = {
        origin.strip()
        for origin in os.getenv("LAB_ALLOWED_SCRIPT_ORIGINS", "").split()
        if origin.strip()
    }
    hub_origin = os.getenv("SHOPBOT_HUB_ORIGIN", "").strip().rstrip("/")
    parsed = urlparse(hub_origin)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        configured.add(hub_origin)
    return configured | script_origins_from_markup(injection_markup() or default_shopbot_script())


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


def render_admin_product_row(product: dict) -> str:
    product_id = html.escape(str(product.get("id") or product.get("handle") or ""))
    name = html.escape(str(product.get("name") or product.get("title") or "Untitled product"))
    category = html.escape(str(product.get("category") or "products"))
    price = float(product.get("price") or 0)
    stock = product.get("stock")
    stock_label = "In stock" if product.get("in_stock", True) and stock in (None, "") else str(stock or 0)
    image_url = html.escape(str(product.get("image_url") or ""))
    safe_description = html.escape(str(product.get("description") or ""))

    return f"""
      <tr>
        <td>
          <div class="product-cell">
            <img src="{image_url}" alt="">
            <div><strong>{name}</strong><span>{product_id}</span><span class="muted">{safe_description[:80]}</span></div>
          </div>
        </td>
        <td>{category}</td>
        <td>${price:.2f}</td>
        <td>{html.escape(stock_label)}</td>
        <td>
          <div class="actions">
            <form method="post" action="/admin/products">
              <input type="hidden" name="product_id" value="{product_id}">
              <input type="hidden" name="name" value="{name}">
              <input type="hidden" name="description" value="{safe_description}">
              <input type="hidden" name="category" value="{category}">
              <input type="hidden" name="brand" value="{html.escape(str(product.get("brand") or "NOVA"))}">
              <input type="hidden" name="price" value="{price:.2f}">
              <input type="hidden" name="stock" value="100">
              <input type="hidden" name="image_url" value="{image_url}">
              <button class="secondary" type="submit">Restock</button>
            </form>
            <form method="post" action="/admin/products/{product_id}/delete">
              <button class="danger" type="submit">Delete</button>
            </form>
          </div>
        </td>
      </tr>
    """


def normalize_admin_product(
    *,
    product_id: str,
    name: str,
    description: str,
    category: str,
    brand: str,
    price: float,
    stock: int,
    image_url: str,
) -> dict:
    safe_name = clean_text(name)
    if not safe_name:
        raise HTTPException(status_code=400, detail="Product name is required.")

    handle = slugify(product_id or safe_name)
    safe_category = slugify(category or "products")
    safe_brand = clean_text(brand) or "NOVA"
    safe_stock = max(0, int(stock))
    safe_price = max(0.0, float(price))

    return {
        "id": handle,
        "handle": handle,
        "title": safe_name,
        "name": safe_name,
        "description": clean_text(description) or safe_name,
        "category": safe_category,
        "categories": [safe_category],
        "brand": safe_brand,
        "vendor": safe_brand,
        "price": safe_price,
        "original_price": None,
        "currency": "USD",
        "stock": safe_stock,
        "in_stock": safe_stock > 0,
        "image_url": clean_text(image_url) or default_product_image(),
        "url": f"/product/{handle}/",
    }


def slugify(value: str) -> str:
    text = clean_text(value).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "product"


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def default_product_image() -> str:
    return "https://cdn.shopify.com/s/files/1/0754/3727/7491/files/mug-1.png?v=1690003527"


def api_cors_origin() -> str:
    return os.getenv("API_CORS_ORIGIN", "").strip()
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
