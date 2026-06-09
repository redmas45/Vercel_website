# Agent Notes

## Project Purpose

This repo is a self-hosted lab clone of `https://demo.vercel.store/`.
It is intended for controlled JavaScript injection practice on infrastructure owned by the user.

Do not add logic that targets third-party systems, steals credentials, bypasses access controls, or exfiltrates data.

## Architecture

- `scripts/crawl-static.mjs` crawls the source site and writes a static snapshot to `out/`.
- `api/index.py` is the Vercel FastAPI entrypoint.
- `api/index.py` serves files from `out/`, injects optional lab JavaScript into HTML, adds realistic security headers, and handles `/_next/image` compatibility.
- `lab/injection.js` is the local plug-and-play script target.

## Deployment

Vercel is currently configured as a Python/FastAPI project.
Keep `api/index.py` and `requirements.txt` present unless the Vercel project is recreated as a pure static/Node project.

Expected build command:

```bash
npm run build
```

Expected install command:

```bash
python -m pip install -r requirements.txt && npm install
```

## Lab Injection

Use one injection mode at a time. Precedence is:

```text
LAB_INJECTION_HTML
LAB_INJECTION_SRC
LAB_INJECTION_CODE_BASE64
LAB_INJECTION_CODE
```

Use `LAB_INJECTION_HTML` for one-line script tags with data attributes.

For ShopBot, prefer same-origin delivery:

```env
SHOPBOT_BACKEND_URL=https://d962-103-97-243-133.ngrok-free.app
SHOPBOT_SITE_ID=https_demo_vercel_store
LAB_ACCESS_KEY_SHA256=sha256_of_raw_key
LAB_INJECTION_HTML=
LAB_INJECTION_SRC=/api/shopbot.js?key=raw_key
```

`/api/shopbot.js` sets catalog config and loads `/lab/shopbot.js`, and `/lab/shopbot.js` proxies the external backend server-side.

For external projects that want one integration URL, use:

```html
<script src="https://vercelclonedwebsite.vercel.app/api/shopbot.js?key=raw_key"></script>
```

`/api/shopbot.js` sets `window.__SHOPBOT_CONFIG__` and loads `/lab/shopbot.js`.

Preferred local setup:

```env
LAB_INJECTION_SRC=/lab/injection.js
```

Preferred external setup:

```env
LAB_INJECTION_SRC=https://your-other-project.vercel.app/inject.js
LAB_ALLOWED_SCRIPT_ORIGINS=https://your-other-project.vercel.app
```

Preferred server-side remote setup:

```env
LAB_INJECTION_SRC=/lab/remote.js
LAB_REMOTE_SCRIPT_URL=https://your-other-project.vercel.app/inject.js
LAB_REMOTE_SCRIPT_KEY=shared-secret
LAB_REMOTE_SCRIPT_KEY_HEADER=X-Lab-Api-Key
```

The remote mode keeps the key out of browser-visible HTML by having the FastAPI app fetch the script server-side.

Use `LAB_SECURITY_MODE=lab` for injection practice.
Use `LAB_SECURITY_MODE=strict` when checking how the clone behaves with tighter CSP.

## Code Guidelines

- Keep the project DB-free unless a real persistence requirement returns.
- Keep generated static output in `out/`.
- Keep deployment settings in `vercel.json` minimal and explicit.
- Avoid adding broad open-proxy behavior. Image proxying should stay restricted by `IMAGE_PROXY_ALLOWED_HOSTS`.
