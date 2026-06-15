# Agent Notes

## Project Purpose

This repo is a self-hosted lab clone of `https://demo.vercel.store/`.
It is used for controlled JavaScript injection practice and catalog/API testing on infrastructure owned by the user.

Do not add logic that targets third-party systems, steals credentials, bypasses access controls, or exfiltrates data.

## Current Status

- The cloned site is deployed locally on your intranet.
- The app runs via FastAPI locally using `python run.py`.
- Static pages are generated into `out/`.
- Product catalog JSON is generated into `out/api/products.json`.
- The live catalog API requires the lab access key.
- The access key is verified server-side using `LAB_ACCESS_KEY_SHA256`.
- The cloned site injects `LAB_INJECTION_HTML` into page `<head>` when configured.
- `LAB_ALLOWED_SCRIPT_ORIGINS` must include the current external script origin.
- Local `.env` contains the active lab configuration and should not be treated as public documentation.

## Architecture

- `api/index.py` is the main FastAPI app for Vercel.
- `scripts/crawl-static.mjs` crawls the source store and writes static files to `out/`.
- `scripts/extract-catalog.mjs` extracts product data and writes `out/api/products.json`.
- `api/index.py` serves static files, product APIs, image compatibility routes, lab injection, and security headers.
- `api/index.py` serves static files, product APIs, image compatibility routes, lab injection, and security headers.

## Deployment

Vercel project type: FastAPI/Python.

Keep these files present:

```text
api/index.py
requirements.txt
package.json
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

If the key is missing or invalid, the API returns `401`.

## Catalog API

Primary catalog endpoint:

```text
GET http://127.0.0.1:8584/api/products?key=<raw_key>
```

Response shape:

```json
{ "data": [ ...products... ] }
```

Single-product lookup is also available:

```text
GET /api/products/{product_id}?key=<raw_key>
```

Use `CATALOG_API_URL` from `.env` when another project needs the exact keyed URL.

## Injection Model

The only supported injection mode is direct external script tag injection through:

```text
LAB_INJECTION_HTML
LAB_ALLOWED_SCRIPT_ORIGINS
```

Example:

```env
LAB_INJECTION_HTML=<script src="http://127.0.0.1:8585/shopbot.js?site=ai_kart_main"></script>
LAB_ALLOWED_SCRIPT_ORIGINS=http://127.0.0.1:8585
```

If `LAB_INJECTION_HTML` is set, the app injects it into every served HTML page before `</head>`.
If it is empty or unset, the app injects nothing.

## Security Headers

`api/index.py` adds:

```text
Content-Security-Policy
X-Frame-Options
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

For lab injection, script sources must be allowed through `LAB_ALLOWED_SCRIPT_ORIGINS`.
The app also derives script origins from `LAB_INJECTION_HTML` and adds them to CSP automatically.

## Local Run

Run the cloned website locally using the built-in runner, which automatically loads your `.env` file:

```powershell
python run.py
```

Local site:

```text
http://192.168.68.56:8584/
```

Local catalog:

```text
http://192.168.68.56:8584/api/products?key=<raw_key>
```

## Code Guidelines

- Keep generated static output in `out/`.
- Keep `.env` local and clean.
- Avoid adding broad open-proxy behavior.
- Restrict image proxying with `IMAGE_PROXY_ALLOWED_HOSTS`.
- Database state (SQLite) lives locally inside the app directory.
