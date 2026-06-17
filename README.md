# AI-KART

React/Vite storefront plus FastAPI/SQLite backend. This repo is a client/spoke website. It must work without AI Hub.

## Contract With AI Hub

AI Hub connection is manual only. The website does not inject Hub code from environment variables.

When the client is connected in AI Hub CRM, paste one script tag into `frontend/index.html`:

```html
<script defer src="http://143.198.5.97/aihub/shopbot.js?site=ai_kart_main" data-site-id="ai_kart_main"></script>
```

No pasted script means no mic. Disabled client in AI Hub CRM means no mic.

When a shopper logs in, the storefront exposes a stable `window.ShopBotConfig.sessionId` to the pasted Hub script. AI Hub can then enforce per-shopper/session token limits from the client panel.

## Running Locally

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Website Admin

The client website owns users and products. AI Hub CRM does not manage storefront inventory.

Default local admin is created when the backend database is empty:

```text
admin@aikart.local
admin123
```

Change these in `backend/.env`:

```env
AUTH_SECRET_KEY=change-me
DEFAULT_ADMIN_EMAIL=admin@aikart.local
DEFAULT_ADMIN_PASSWORD=admin123
UPLOAD_DIR=static/uploads
```

Admin URL:

```text
/admin
```

Admin can:

- Add/delete website users.
- Add/delete products.
- Upload product images from local files.

## Public API

| Endpoint | Description |
|---|---|
| `GET /api/products` | List products for storefront and Hub crawler |
| `GET /api/products/{id}` | Product by id or handle |
| `POST /api/auth/signup` | Customer signup |
| `POST /api/auth/login` | Customer/admin login |
| `GET /api/auth/me` | Current website user |
| `GET /health` | Health check |
