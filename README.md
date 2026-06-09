# Vercel Store Clone Lab

Self-hosted clone of `https://demo.vercel.store/` for controlled JavaScript injection practice on your own Vercel project.

Use this only on infrastructure you own or have explicit permission to test.

## Project Layout

- `scripts/crawl-static.mjs` crawls the source site into `out/`.
- `out/` contains the generated static clone.
- `api/index.py` serves the clone on Vercel through FastAPI.
- `lab/injection.js` is the local script you can inject into cloned pages.
- `.env.example` lists local and Vercel environment variables.
- `AGENT.md` documents project rules for future edits.

## Local Build

```bash
npm install
npm run build
```

## Vercel Settings

Keep these settings in Vercel:

```text
Framework Preset: FastAPI
Install Command: python -m pip install -r requirements.txt && npm install
Build Command: npm run build
Output Directory: out
Root Directory: blank/default
```

The current `vercel.json` already contains the install/build/output settings.

## JavaScript Injection

Use one injection mode at a time. Precedence is:

```text
LAB_INJECTION_HTML
LAB_INJECTION_SRC
LAB_INJECTION_CODE_BASE64
LAB_INJECTION_CODE
```

Single-line script tag injection:

```env
LAB_INJECTION_HTML=<script src="https://vercelclonedwebsite.vercel.app/shopbot.js" data-site-id="your_site_id" data-api-url="https://vercelclonedwebsite.vercel.app"></script>
LAB_INJECTION_SRC=
LAB_INJECTION_CODE=
```

Same-origin ShopBot injection:

```env
SHOPBOT_BACKEND_URL=https://d962-103-97-243-133.ngrok-free.app
SHOPBOT_SITE_ID=https_demo_vercel_store
LAB_INJECTION_HTML=
LAB_INJECTION_SRC=/lab/injection.js
```

This loads `/lab/injection.js` from the clone site, then loads `/lab/shopbot.js` from the same origin. The FastAPI route proxies the backend widget server-side.

Local file injection:

```env
LAB_INJECTION_SRC=/lab/injection.js
```

External project injection:

```env
LAB_INJECTION_SRC=https://your-other-project.vercel.app/inject.js
LAB_ALLOWED_SCRIPT_ORIGINS=https://your-other-project.vercel.app
```

Server-side remote injection:

```env
LAB_INJECTION_SRC=/lab/remote.js
LAB_REMOTE_SCRIPT_URL=https://your-other-project.vercel.app/inject.js
LAB_REMOTE_SCRIPT_KEY=your-shared-secret
LAB_REMOTE_SCRIPT_KEY_HEADER=X-Lab-Api-Key
```

In this mode, the browser only sees `/lab/remote.js`.
Your clone server fetches the real script from your other project and sends `X-Lab-Api-Key` server-to-server.

Inline injection:

```env
LAB_INJECTION_CODE=console.log("lab script loaded")
```

Base64 injection:

```env
LAB_INJECTION_CODE_BASE64=Y29uc29sZS5sb2coImxhYiIp
```

For Vercel deployment, set these in **Project Settings -> Environment Variables**.

## Security Controls

`api/index.py` adds realistic browser-facing headers:

- `Content-Security-Policy`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `X-Frame-Options`
- `Permissions-Policy`
- `lab_session` cookie with `HttpOnly`, `Secure`, and `SameSite=Lax`

Use:

```env
LAB_SECURITY_MODE=lab
```

for injection practice. Use:

```env
LAB_SECURITY_MODE=strict
```

to test a tighter CSP that blocks inline/eval style payloads.

## Image Loading

The original site uses Next.js image URLs like `/_next/image?...`.
This project implements a compatible image route in FastAPI and restricts it with:

```env
IMAGE_PROXY_ALLOWED_HOSTS=cdn.shopify.com demo.vercel.store vercel.com assets.vercel.com
```

Add hosts only when your cloned HTML legitimately needs them.

## Product JSON API

Product list:

```text
GET /api/products?page=1&limit=20
```

Filters:

```text
GET /api/products?category=shirts
GET /api/products?q=hoodie
GET /api/products?page=2&limit=10
```

Single product:

```text
GET /api/products/acme-hoodie
```

Full catalog file:

```text
GET /api/catalog
```

No auth is required. The response shape is:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 19,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```
