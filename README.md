# Vercel Store Clone Lab

Self-hosted clone of `https://demo.vercel.store/` for testing on infrastructure you own.

## Current Milestone

**L3.5** is the current fallback point for this customer/spoke simulator.

- GitHub sync comment: `L 3.5`
- Date: 2026-06-12
- Meaning: if later changes break standalone storefront/admin/search or AI one-script injection mode, roll back to this synced state.

## What This App Does

- Serves the static clone from `out/`
- Provides the storefront admin panel at `/admin`
- Runs normal storefront search from `out/api/products.json`
- Exposes a keyed product catalog API at `/api/products`
- Injects the AI widget only when explicitly enabled

By default this project behaves like a normal customer website. The AI Salesman HUB is optional and is not baked into the static HTML. Proxy routes are present for local integration tests, but they are unused unless AI injection is enabled or a page explicitly calls them.

## Local Build

```bash
npm install
npm run build
```

Run locally in standalone customer-site mode:

```powershell
python run.py
```

This starts the storefront on `http://127.0.0.1:8584`, keeps `/admin` available, and does not inject `shopbot.js`.

Run with the AI HUB widget only after the HUB server is already running:

```powershell
$env:ENABLE_AI_WIDGET="true"
$env:SHOPBOT_HUB_ORIGIN="http://127.0.0.1:8585"
python run.py
```

That inserts the single client-style script tag at request time:

```html
<script defer src="http://127.0.0.1:8585/shopbot.js?site=ai_kart_main" data-site-id="ai_kart_main" data-brand="AI-KART"></script>
```

## Required Environment Variables

```env
LAB_ACCESS_KEY=replace_with_raw_key
LAB_ACCESS_KEY_SHA256=replace_with_sha256_of_raw_key
CATALOG_BASE_URL=https://vercelclonedwebsite.vercel.app
CATALOG_API_URL=https://vercelclonedwebsite.vercel.app/api/products?key=replace_with_raw_key
LAB_INJECTION_HTML=<script defer src="https://fresh-tunnel-url.example.com/shopbot.js?site=ai_kart_main" data-site-id="ai_kart_main"></script>
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

- If `ENABLE_AI_WIDGET=true`, `run.py` builds the single HUB script tag automatically.
- If `LAB_INJECTION_HTML` is set by another process, it is inserted into every served HTML page before `</head>`.
- If neither is set, nothing is injected and old widget/stub scripts are scrubbed during build.
- CSP allows `'self'`, the origins in `LAB_ALLOWED_SCRIPT_ORIGINS`, and any valid external script origins parsed from `LAB_INJECTION_HTML`.

## Vercel Settings

```text
Framework Preset: FastAPI
Install Command: python -m pip install -r requirements.txt && npm install
Build Command: npm run build
Output Directory: out
```
