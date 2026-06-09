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
