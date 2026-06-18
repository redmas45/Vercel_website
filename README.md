# AI-KART Storefront

AI-KART is a standalone ecommerce storefront used as the active demo/client site for AI Salesman Hub. It contains a React/Vite frontend, a FastAPI backend, a SQLite runtime database, and the shared public Nginx routing for the current single-IP deployment.

AI-KART must work without AI Hub. The AI assistant is an optional hosted script integration, not a hard dependency of the storefront.

## Current Role

AI-KART is the active storefront for tenant:

```text
site_id: ai_kart
```

Current public URL:

```text
http://143.198.5.97/
```

Current server project path:

```text
/var/www/Vercel_website
```

## Public Routing Ownership

On the shared server, AI-KART owns the root public path and the system Nginx edge config.

```text
/                         -> AI-KART frontend on 127.0.0.1:5175
/api/                     -> AI-KART backend on 127.0.0.1:8000
/aihub/                   -> AI Hub Docker app on 127.0.0.1:5176
/client-panel/<client_id> -> Client Panel on 127.0.0.1:5177
```

AI Hub and Client Panel are separate projects. AI-KART only routes public traffic to them through Nginx.

## Architecture

```text
frontend/
  React + Vite storefront
  product listing, cart, account, admin UI, widget bridge hooks

backend/
  FastAPI API
  SQLite runtime database
  auth, users, products, uploads, seed products

widget-integration/
  documentation for the AI Hub script and browser hooks
```

Runtime services on the server:

```text
ai-kart-backend  -> PM2 process running /Data/www/aikartvenv/bin/python -m uvicorn
ai-kart-frontend -> PM2 process running project-local npm preview on 127.0.0.1:5175
system nginx     -> public path routing for AI-KART, AI Hub, and Client Panel
```

## AI Hub Contract

AI Hub integration is manual and explicit. The storefront does not inject Hub code from environment variables.

Current connected script in `frontend/index.html`:

```html
<script defer src="http://143.198.5.97/aihub/shopbot.js?site=ai_kart" data-site-id="ai_kart"></script>
```

Behavior:

- If the script is absent, no AI mic/widget appears.
- If the AI Hub CRM disables the `ai_kart` client, the served widget is disabled.
- The storefront can still run normally without the script.
- Site-specific commerce behavior belongs in the Hub-hosted adapter layer.

## Storefront Browser Hooks

The React app exposes browser hooks for the Hub widget:

```text
window.ShopCart.addItem(productId, quantity)
window.ShopCart.open()
window.ShopCart.clear()
window.ShopCart.removeItem(productId)
window.ShopCart.updateQuantity(productId, quantity)
window.ShopCart.showProductDetail(productId)
window.ShopCart.filterProducts(params)
window.ShopBotConfig.onAddToCart(productId, quantity)
window.ShopBotConfig.onOpenCart()
```

When a shopper logs in, the storefront exposes a stable session ID:

```text
window.ShopBotConfig.sessionId
```

AI Hub can use that session ID for per-shopper/session token limits from Client Panel.

## Backend API

Primary public API routes:

| Endpoint | Purpose |
|---|---|
| `GET /api/products` | Product list for storefront and AI Hub crawler |
| `GET /api/products/{id}` | Product detail by id or handle |
| `POST /api/auth/signup` | Customer signup |
| `POST /api/auth/login` | Customer/admin login |
| `GET /api/auth/me` | Current authenticated user |
| `GET /health` | Backend health check |

Admin API routes live under:

```text
/api/admin/*
```

They require an authenticated admin user.

## Data Ownership

AI-KART owns:

- Storefront products.
- Storefront users.
- Website admin login.
- Product image uploads.
- Runtime SQLite database.

AI Hub owns:

- AI conversations.
- Catalog crawl/vector copy.
- CRM clients.
- AI usage analytics.
- Widget serving and adapter behavior.

## Runtime Database

The SQLite database is runtime state:

```text
backend/aikart.db
```

It is ignored by Git and should not be committed. Deployment backs it up to:

```text
.deploy-backups/aikart-db/
```

Source-controlled dummy products live in:

```text
backend/products.seed.json
```

The seed file is used only when the database is empty.

## Admin Credentials

Website admin credentials belong only in:

```text
backend/.env
```

Example:

```env
AUTH_SECRET_KEY=replace-with-long-random-secret
DEFAULT_ADMIN_EMAIL=admin@aikart.local
DEFAULT_ADMIN_PASSWORD=replace-with-admin-password
UPLOAD_DIR=static/uploads
```

Important behavior:

- `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` seed the first admin only.
- If `backend/aikart.db` already has an admin user, changing `.env` does not update that user's stored password.
- If `/admin` says `Invalid email or password`, use step 10 in [aikart.md](aikart.md) to reset the DB admin row to match `backend/.env`.

Do not put AI-KART admin credentials in AI Hub `.env`.

## Environment Files

Backend server env:

```text
backend/.env
```

Frontend server env:

```text
frontend/.env.local
```

Current frontend env for same-origin public API routing:

```env
VITE_API_BASE_URL=
```

The AI Hub script URL is not configured through frontend env. It lives in `frontend/index.html` when AI-KART is connected to AI Hub.

## Local Development

Backend:

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Server Deployment

Use [aikart.md](aikart.md).

The deployment runbook is split into small controlled steps:

1. Safe Git pull and DB backup.
2. Fast permissions without full-project recursive `chown`.
3. Project-local Node setup.
4. PM2 setup.
5. AI-KART backend venv setup at `/Data/www/aikartvenv`.
6. Environment file creation and secret repair.
7. Backend and frontend build.
8. PM2 restart.
9. Local smoke.
10. Admin login reset if needed.
11. Shared Nginx apply.
12. Public smoke.

Server runtime rules:

- Only AI-KART backend uses the Python venv `/Data/www/aikartvenv`.
- AI-KART frontend is Node/Vite/PM2.
- Client Panel is Node/Vite/PM2.
- AI Hub is Docker and does not use host venv.
- Runtime files remain ignored and local on the server.

## Git And Runtime Safety

Ignored runtime paths include:

```text
backend/.env
backend/aikart.db
backend/static/uploads/
frontend/.env.local
frontend/dist/
frontend/node_modules/
.node/
.deploy-backups/
```

Deployment uses `git pull --ff-only` and stashes only tracked server-local edits. Ignored runtime files are preserved.

Do not run `git stash pop` as part of deployment unless you intentionally inspect and recover a specific stash.

## Build And Quality Checks

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend dependency install:

```bash
cd backend
. /Data/www/aikartvenv/bin/activate
python -m pip install -r requirements.txt
```

Local service checks:

```bash
curl -fsS http://127.0.0.1:5175/ >/dev/null
curl -fsS http://127.0.0.1:8000/health >/dev/null
curl -fsS http://127.0.0.1:8000/api/products >/dev/null
```

Public checks:

```bash
curl -fsS http://143.198.5.97/ >/dev/null
curl -fsS http://143.198.5.97/api/products >/dev/null
```

## Operational Notes

- AI-KART owns shared Nginx on the current server.
- AI Hub CRM changes usually do not require rebuilding AI-KART.
- Client Panel UI changes usually do not require rebuilding AI-KART, unless public routing is broken.
- If public `/aihub/` or `/client-panel/` fails while local services work, reapply the Nginx section in [aikart.md](aikart.md).
- Browser microphone access on public origins requires HTTPS. The current HTTP setup can show the widget but cannot reliably support mic recording in production browsers.

## Troubleshooting

Admin login says `Invalid email or password`:

```text
Run step 10 in aikart.md. Existing admin rows are not changed by editing backend/.env.
```

Public root `/` fails but `127.0.0.1:5175` works:

```text
Reapply shared Nginx from aikart.md.
```

`/api/products` fails locally:

```text
Check PM2 logs: pm2 logs ai-kart-backend --lines 100
```

Frontend shows old UI:

```text
Rebuild frontend and restart PM2 using aikart.md steps 7 and 8.
```

AI mic is missing:

```text
Confirm the script exists in frontend/index.html and the ai_kart client is enabled in AI Hub CRM.
```
