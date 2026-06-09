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

Preferred local setup:

```env
LAB_INJECTION_SRC=/lab/injection.js
```

Preferred external setup:

```env
LAB_INJECTION_SRC=https://your-other-project.vercel.app/inject.js
LAB_ALLOWED_SCRIPT_ORIGINS=https://your-other-project.vercel.app
```

Use `LAB_SECURITY_MODE=lab` for injection practice.
Use `LAB_SECURITY_MODE=strict` when checking how the clone behaves with tighter CSP.

## Code Guidelines

- Keep the project DB-free unless a real persistence requirement returns.
- Keep generated static output in `out/`.
- Keep deployment settings in `vercel.json` minimal and explicit.
- Avoid adding broad open-proxy behavior. Image proxying should stay restricted by `IMAGE_PROXY_ALLOWED_HOSTS`.
