# Vercel Store Clone Lab

Self-hosted clone of `https://demo.vercel.store/` for testing on infrastructure you own.

## What This App Does

- Serves the static clone from `out/`
- Exposes a keyed product catalog API at `/api/products`
- Injects `LAB_INJECTION_HTML` into every HTML page `<head>` when configured

Legacy ShopBot proxy routes and server-side script proxying are intentionally removed.

## Local Build

```bash
npm install
npm run build
```

Run locally:

```powershell
python -m uvicorn api.index:app --host 127.0.0.1 --port 8000
```

## Required Environment Variables

```env
LAB_ACCESS_KEY=replace_with_raw_key
LAB_ACCESS_KEY_SHA256=replace_with_sha256_of_raw_key
CATALOG_BASE_URL=https://vercelclonedwebsite.vercel.app
CATALOG_API_URL=https://vercelclonedwebsite.vercel.app/api/products?key=replace_with_raw_key
LAB_INJECTION_HTML=<script src="https://fresh-tunnel-url.example.com/shopbot.js?site=https_demo_vercel_store"></script>
LAB_ALLOWED_SCRIPT_ORIGINS=https://fresh-tunnel-url.example.com
API_CORS_ORIGIN=*
IMAGE_PROXY_ALLOWED_HOSTS=cdn.shopify.com demo.vercel.store vercel.com assets.vercel.com
```

`LAB_ALLOWED_SCRIPT_ORIGINS` should include the same origin as the script tag in `LAB_INJECTION_HTML`.
The app also parses `LAB_INJECTION_HTML` and adds any valid script origins to CSP automatically.

## Catalog API

Accepted auth methods:

- `GET /api/products?key=<raw_key>`
- `X-Lab-Api-Key: <raw_key>`
- `Authorization: Bearer <raw_key>`

Responses:

- Success: `{ "data": [ ...products... ] }`
- Missing or invalid key: `401`

Single-product lookup remains available at `GET /api/products/{product_id}` and uses the same auth rules.

## Injection Behavior

- If `LAB_INJECTION_HTML` is set, it is inserted into every served HTML page before `</head>`.
- If `LAB_INJECTION_HTML` is empty or unset, nothing is injected.
- CSP allows `'self'`, the origins in `LAB_ALLOWED_SCRIPT_ORIGINS`, and any valid external script origins parsed from `LAB_INJECTION_HTML`.

## Vercel Settings

```text
Framework Preset: FastAPI
Install Command: python -m pip install -r requirements.txt && npm install
Build Command: npm run build
Output Directory: out
```
