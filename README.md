# Vercel Store Clone Lab

Self-hosted clone of `https://demo.vercel.store/` for testing on infrastructure you own.

## Current Milestone

**L5.0** is the current fallback point for this customer/spoke simulator.

- GitHub sync comment: `L 5`
- Date: 2026-06-15
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

First, ensure your `.env` file contains:

```env
ENABLE_AI_WIDGET=true
SHOPBOT_HUB_ORIGIN=https://192.168.68.56:8484
```

Then simply run:

```powershell
python run.py
```

That inserts the single client-style script tag at request time:

```html
<script defer src="http://127.0.0.1:8585/shopbot.js?site=ai_kart_main" data-site-id="ai_kart_main" data-brand="AI-KART"></script>
```

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
