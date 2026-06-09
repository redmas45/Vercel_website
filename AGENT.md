# Agent Notes

## Project Purpose

This repo is a self-hosted lab clone of `https://demo.vercel.store/`.
It is used for controlled JavaScript injection practice and catalog/API testing on infrastructure owned by the user.

Do not add logic that targets third-party systems, steals credentials, bypasses access controls, or exfiltrates data.

## Current Status

- The cloned site is deployed at `https://vercelclonedwebsite.vercel.app`.
- The app is deployed on Vercel as a Python/FastAPI project.
- Static pages are generated into `out/`.
- Product catalog JSON is generated into `out/api/products.json`.
- The live catalog API requires the lab access key.
- The same key is used for the catalog API and the ShopBot entry script.
- The cloned site currently uses direct `LAB_INJECTION_HTML` widget loading as the primary path.
- `LAB_ALLOWED_SCRIPT_ORIGINS` must match the current backend tunnel origin for each session.
- `SHOPBOT_BACKEND_URL` is legacy-only and is not the normal active widget path.
- Local `.env` contains the active lab configuration and should not be treated as public documentation.

## Architecture

- `api/index.py` is the main FastAPI app for Vercel.
- `scripts/crawl-static.mjs` crawls the source store and writes static files to `out/`.
- `scripts/extract-catalog.mjs` extracts product data and writes `out/api/products.json`.
- `api/index.py` serves static files, product APIs, image compatibility routes, lab injection, and security headers.
- `lab/injection.js` is the local loader used for lab-side script injection.
- `vercel.json` keeps Vercel pointed at the FastAPI app.

## Deployment

Vercel project type: FastAPI/Python.

Keep these files present:

```text
api/index.py
requirements.txt
package.json
vercel.json
scripts/crawl-static.mjs
scripts/extract-catalog.mjs
```

Expected build command:

```bash
npm run build
```

Expected install command:

```bash
python -m pip install -r requirements.txt && npm install
```

Deployments are triggered from GitHub `main`.

## Access Key Model

The project uses one raw lab key for client access and stores/verifies its SHA256 hash server-side.

Share the raw key with trusted lab projects only.

Accepted auth methods:

```text
?key=<raw_key>
X-Lab-Api-Key: <raw_key>
Authorization: Bearer <raw_key>
```

The SHA256 value is for server verification. Do not share only the SHA256 hash with client projects, because clients must send the raw key.

## Catalog API

Primary catalog endpoint:

```text
GET https://vercelclonedwebsite.vercel.app/api/products?key=<raw_key>
```

Also supported:

```text
GET /api/products/{product_id}?key=<raw_key>
GET /api/catalog?key=<raw_key>
```

Use `CATALOG_API_URL` from `.env` when another project needs the exact keyed URL.

## Single Entry ShopBot Script

Primary browser entrypoint:

```html
<script src="https://vercelclonedwebsite.vercel.app/api/shopbot.js?key=<raw_key>"></script>
```

This endpoint:

- validates the lab key
- exposes catalog config to the browser
- points the widget at this site's catalog API
- loads the legacy same-origin ShopBot proxy script

Use `SHOPBOT_ENTRY_URL` from `.env` when another project needs the exact keyed script URL.

## Two Separate Integration Modes

Mode 1: Other project accesses this cloned website.

Use these values from `.env`:

```text
SHOPBOT_ENTRY_URL
CATALOG_API_URL
CATALOG_BASE_URL
LAB_ACCESS_KEY
```

This lets another project access the catalog and load the ShopBot entry script from this site.

Mode 2: This cloned website loads an external script from another project.

Use:

```text
LAB_INJECTION_HTML
LAB_ALLOWED_SCRIPT_ORIGINS
```

This is separate from the catalog API mode. This is the primary widget delivery path for the cloned site. Paste the backend's fresh direct script URL into `LAB_INJECTION_HTML` each session and keep `LAB_ALLOWED_SCRIPT_ORIGINS` aligned to that tunnel origin.

## Lab Injection Precedence

Only one injection mode should be active at a time.

Precedence:

```text
LAB_INJECTION_HTML
LAB_INJECTION_SRC
LAB_INJECTION_CODE_BASE64
LAB_INJECTION_CODE
```

Use `LAB_INJECTION_HTML` for the direct external widget script tag.

Example:

```env
LAB_INJECTION_HTML=<script src="https://fresh-tunnel-url.example.com/shopbot.js?site=https_demo_vercel_store"></script>
LAB_ALLOWED_SCRIPT_ORIGINS=https://fresh-tunnel-url.example.com
```

If `LAB_INJECTION_HTML` is set, the app ignores `LAB_INJECTION_SRC`, `LAB_INJECTION_CODE_BASE64`, and `LAB_INJECTION_CODE`.
Update both values together whenever the backend tunnel URL changes.

## ShopBot Backend Proxy

The cloned website has routes that can proxy a backend widget:

```text
GET /api/shopbot.js?key=<raw_key>
GET /lab/shopbot.js?key=<raw_key>
```

These routes remain in the codebase, but they are no longer the preferred widget delivery path for the cloned site.

Required backend env values:

```text
SHOPBOT_BACKEND_URL
SHOPBOT_SITE_ID
```

Important: this repo is not the ShopBot backend project.

Do not keep `SHOPBOT_BACKEND_URL` as an always-on active env var for normal deployment when using the direct `LAB_INJECTION_HTML` path, because the tunnel URL rotates between backend sessions.

If `/lab/shopbot.js?key=...` returns `502`, the website-side proxy is alive but the external backend is not serving `/shopbot.js`.

The backend must serve:

```text
/health
/shopbot.js
/v1/shop
```

## Security Headers

`api/index.py` adds realistic headers for lab testing:

```text
Content-Security-Policy
X-Frame-Options
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

For lab injection, script sources must be allowed through `LAB_ALLOWED_SCRIPT_ORIGINS` when loading external scripts.

Do not loosen CSP globally unless required for the current lab scenario.

## Local Run

Run the cloned website locally with:

```powershell
python -m uvicorn api.index:app --host 127.0.0.1 --port 8000
```

Local site:

```text
http://127.0.0.1:8000/
```

Local catalog:

```text
http://127.0.0.1:8000/api/products?key=<raw_key>
```

## Code Guidelines

- Keep generated static output in `out/`.
- Keep deployment settings in `vercel.json` minimal and explicit.
- Keep `.env` local and clean, with comments separating the two integration modes.
- Avoid adding broad open-proxy behavior.
- Restrict image proxying with `IMAGE_PROXY_ALLOWED_HOSTS`.
- Do not reintroduce database complexity unless persistence is needed again.
- Do not mix the catalog API mode with external injection mode.
