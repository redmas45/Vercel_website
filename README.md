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

Primary widget delivery path for this cloned site:

```env
LAB_INJECTION_HTML=<script src="https://fresh-tunnel-url.example.com/shopbot.js?site=https_demo_vercel_store"></script>
LAB_ALLOWED_SCRIPT_ORIGINS=https://fresh-tunnel-url.example.com
LAB_INJECTION_SRC=
LAB_INJECTION_CODE=
```

`api/index.py` injects `LAB_INJECTION_HTML` directly into served page HTML before `</body>`. When this value is set, it takes priority over `LAB_INJECTION_SRC`, `LAB_INJECTION_CODE_BASE64`, and `LAB_INJECTION_CODE`.

Because the external backend tunnel URL changes per session, update both `LAB_INJECTION_HTML` and `LAB_ALLOWED_SCRIPT_ORIGINS` each time the backend restarts.

Example session value:

```env
LAB_INJECTION_HTML=<script src="https://example.ngrok-free.app/shopbot.js?site=https_demo_vercel_store"></script>
```

Legacy same-origin ShopBot entry path:

```env
SHOPBOT_SITE_ID=https_demo_vercel_store
LAB_ACCESS_KEY_SHA256=sha256_of_raw_key
LAB_INJECTION_HTML=
LAB_INJECTION_SRC=/api/shopbot.js?key=raw_key
```

This loads `/api/shopbot.js` from the clone site. That entrypoint sets catalog config and then loads `/lab/shopbot.js` from the same origin.
The proxy route remains in the codebase, but it is no longer the preferred widget delivery path for this cloned site because `SHOPBOT_BACKEND_URL` rotates with each tunnel session.

If you keep the legacy path available for troubleshooting, do not treat `SHOPBOT_BACKEND_URL` as an always-on env var in normal deployment config.

Single public entrypoint:

```html
<script src="https://vercelclonedwebsite.vercel.app/api/shopbot.js?key=raw_key"></script>
```

This script sets `window.__SHOPBOT_CONFIG__` with `catalogBaseUrl` and `catalogApiUrl`, then loads `/lab/shopbot.js`.

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

Catalog and ShopBot use the same raw access key. Vercel stores only:

```env
LAB_ACCESS_KEY_SHA256=sha256_of_raw_key
```

Give other projects:

```env
CATALOG_API_URL=https://vercelclonedwebsite.vercel.app/api/products?key=raw_key
SHOPBOT_ENTRY_URL=https://vercelclonedwebsite.vercel.app/api/shopbot.js?key=raw_key
```

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
