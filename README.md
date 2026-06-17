# AI-KART

A premium voice-powered e-commerce storefront — React/Vite SPA + FastAPI/SQLite backend.

---

## Running locally

### 1. Backend (FastAPI + SQLite)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On first run, the backend creates an SQLite database (`aikart.db`) and seeds it from `products.seed.json` automatically. Subsequent runs are idempotent — the seed runs only if the products table is empty.

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` calls to the backend at `http://127.0.0.1:8000`.

---

## Configuration

### Backend — `backend/.env`

Copy `backend/.env.example` to `backend/.env`:

```env
DATABASE_URL=sqlite+aiosqlite:///./aikart.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SHOPBOT_HUB_ORIGIN=           # e.g. https://192.168.68.51:8484
LAB_ALLOWED_SCRIPT_ORIGINS=   # space-separated extra CSP origins
```

### Frontend — `frontend/.env.local`

Copy `frontend/.env.example` to `frontend/.env.local`:

```env
VITE_API_BASE_URL=            # leave empty for Vite proxy; set to backend URL in production
VITE_SHOPBOT_HUB_ORIGIN=      # e.g. https://192.168.68.51:8484
VITE_SHOPBOT_SITE_ID=ai_kart_main
```

---

## Pointing frontend at a different API

In production (or when not using the Vite proxy), set `VITE_API_BASE_URL` in `frontend/.env.local`:

```env
VITE_API_BASE_URL=https://your-backend-host.com
```

---

## Testing the Voice Orb

1. Start the hub server (external — not part of this repo).
2. Set `VITE_SHOPBOT_HUB_ORIGIN` to the hub's address.
3. Run the frontend.
4. The orb loads `shopbot.js` from the hub. The hub drives orb state via:

```js
window.dispatchEvent(new CustomEvent('shopbot:orb-state', {
  detail: { state: 'listening' } // or 'speaking', 'idle'
}));
```

See `widget-integration/README.md` for the full contract.

---

## API

| Endpoint | Description |
|---|---|
| `GET /api/products` | List all products (supports `?category=`, `?q=`, `?min_price=`, `?max_price=`) |
| `GET /api/products/{id}` | Single product by id or handle |
| `GET /health` | Health check |
