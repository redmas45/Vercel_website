# Project: Rebuild AI-KART storefront — React/Vite + FastAPI

## Context

This is a full rebuild of an existing self-hosted e-commerce lab project. The current version is a Python-only setup: a crawler generates static HTML into an `out/` folder, FastAPI serves those static files plus a keyed product API, and an external AI voice-shopping widget (`shopbot.js`) gets injected into the page via a `<script>` tag. That architecture works but isn't a real frontend app — there's no component model, no client-side routing, no proper build pipeline for the storefront itself.

The goal of this rebuild: replace the static-generation approach with a real React (Vite) frontend and a clean FastAPI backend, while keeping the existing AI Salesman widget integration model intact (it connects over WebSocket to a separate hub service — this storefront is one "spoke" client of that hub). Treat the current `products.json` as seed data only; design the backend so it can be swapped for a real database (SQLite first, Postgres later) without changing any API contracts or frontend code.

The visual design must be premium and intentional — not a generic AI-generated template look. Specifics are in the Design System section below; follow them precisely rather than defaulting to common UI-library patterns.

---

## 1. Tech stack

**Frontend**
- React 18 + Vite
- TypeScript (strict mode on)
- Tailwind CSS for styling — configure the custom tokens in section 4, don't use default Tailwind palette/spacing where a custom token exists
- React Router for client-side routing (home, product listing, product detail, cart, checkout-stub)
- Zustand (or React Context if you prefer, but keep state management minimal — this doesn't need Redux) for cart state and voice-widget connection state
- No server-side rendering needed for this phase — client-rendered SPA is fine

**Backend**
- FastAPI (Python 3.11+)
- Pydantic v2 models for all request/response schemas
- A repository pattern for data access (see section 3) — routes must never read `products.json` directly
- uvicorn for local dev server

**Data**
- `products.json` becomes seed data, loaded into SQLite on first run via a seed script
- SQLite via SQLAlchemy (async, using `aiosqlite`) as the actual runtime data store
- Schema should be designed so a future swap to Postgres only requires changing the SQLAlchemy connection string — don't use SQLite-specific features

**Real-time / widget**
- The AI Salesman widget connects over WebSocket to a separate hub backend (already exists, not part of this rebuild) running on its own port
- This storefront only needs to: (a) load the widget's client script via a single `<script>` tag injection point, (b) expose a voice-orb UI trigger that the widget's own JS hooks into, (c) pass the product catalog API so the widget/hub can query it
- Don't build the WebSocket server itself here — that's the hub's job. This app is a client/spoke.

---

## 2. Project structure

```
/frontend
  /src
    /components
      /layout        — Header, Footer, VoiceOrb
      /product       — ProductCard, ProductGrid, ProductDetail
      /cart          — CartDrawer, CartItem
      /ui            — shared primitives (Button, Badge, Pill)
    /pages
      Home.tsx
      ShopListing.tsx
      ProductDetail.tsx
      Cart.tsx
    /hooks
      useCart.ts
      useVoiceWidget.ts   — manages orb state + script injection
    /lib
      api.ts              — typed fetch wrapper for backend API
      types.ts             — shared TS types matching backend Pydantic schemas
    /styles
      tailwind.config.ts   — custom tokens from section 4
  index.html
  vite.config.ts

/backend
  /app
    main.py                — FastAPI app instance, CORS, startup seeding
    /api
      products.py           — GET /api/products, GET /api/products/{id}
      health.py
    /core
      config.py             — env-driven settings (pydantic-settings)
      security.py           — API key verification (SHA256 hash check, same model as current)
    /db
      models.py             — SQLAlchemy models
      session.py             — async session factory
      seed.py                 — one-time seed from products.json on first boot
    /repositories
      product_repository.py  — ALL data access goes through here. Routes call this, never the DB session directly.
    /schemas
      product.py             — Pydantic request/response models
  requirements.txt
  products.seed.json          — the existing products.json, renamed to make clear it's seed-only

/widget-integration
  README.md                  — notes on how the hub's shopbot.js connects (script tag pattern, allowed origins, etc — port from existing AGENT.md/README.md)
```

---

## 3. Backend requirements (be specific, don't improvise)

### Repository pattern — non-negotiable

All product data access must go through `ProductRepository`. Define it with an interface-like shape (even without a formal ABC, keep methods consistent) so a future Postgres-backed implementation is a drop-in replacement:

```python
class ProductRepository:
    async def list_products(self, filters: ProductFilters) -> list[Product]: ...
    async def get_product(self, product_id: str) -> Product | None: ...
    async def search_products(self, query: str) -> list[Product]: ...
```

Routes call the repository. The repository calls SQLAlchemy. Nothing in `/api` imports SQLAlchemy directly.

### Database

- On startup, check if the products table is empty. If empty, run `seed.py`, which reads `products.seed.json` and inserts rows. This makes local dev painless (clone repo, run once, DB populates itself) without making the JSON file the live source of truth.
- Model fields should match whatever fields exist in the current `products.json` (id, name, price, description, image_url, category, stock, etc — inspect the actual file and mirror its shape; don't invent fields that don't exist in the source data).
- Use async SQLAlchemy throughout — don't mix sync and async sessions.

### No API key auth (for now)

This phase does not need API key protection on `/api/products`. The catalog is populated via the existing crawler (`scripts/crawl-static.mjs` / `scripts/extract-catalog.mjs` equivalents) and the endpoints should be open/public reads — no `LAB_ACCESS_KEY_SHA256`, no key headers, no 401s. Keep the dependency injection structure clean enough that auth could be added back later as a FastAPI dependency on specific routes, but don't build or wire up any key-checking logic right now.

### CORS

Configure CORS to allow the Vite dev server origin in development and the production frontend origin in prod, read from env vars — don't hardcode `*`.

### Security headers

Port the existing header set from the current `api/index.py`: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. CSP must allow the widget hub's script origin — read allowed script origins from an env var (`LAB_ALLOWED_SCRIPT_ORIGINS` equivalent) rather than hardcoding.

---

## 4. Design system — follow exactly, this is the premium look

The brand is "AI-KART." Visual direction: warm duotone (coral + near-black), generous whitespace, flat surfaces with soft rounded cards, no heavy gradients or drop shadows except where specified. The personality is "confident, calm, a little playful" — not corporate, not loud.

### Color tokens (add to `tailwind.config.ts`)

```js
colors: {
  ink: '#2A2622',        // primary text, dark surfaces
  paper: '#FDF8F4',       // page background (warm off-white, not pure white)
  surface: '#FFFFFF',     // card backgrounds
  border: '#EDE2D8',      // hairline borders
  muted: '#8A7E73',       // secondary text
  accent: {
    DEFAULT: '#D85A30',   // primary coral — CTAs, prices, active states
    light: '#F5C4B3',     // light coral — image placeholders, subtle fills
    dark: '#993C1D',       // dark coral — text on light coral backgrounds
    contrast: '#FAECE7',   // text on top of accent-colored surfaces
  },
}
```

Rules:
- Only ever use TWO colors as structural surfaces: `ink` (dark sections — hero, footer, orb) and `paper`/`surface` (everything else). The accent color is used sparingly: CTA buttons, prices, active filter pills, the hero band, the orb's icon glow. Never use a third hue.
- No gradients anywhere except the hero band may use a subtle single-hue gradient (`accent` to a 10% darker shade) if you want depth — flat `accent` is also fine and simpler.
- Cards: `surface` background, `0.5px solid border`, `border-radius: 10px` (slightly tighter than typical 12-16px — this reads more premium/precise than overly rounded corners).
- Product image placeholders before real images load: `accent.light` or a neutral `#EFEEE9` — alternate or pick contextually, don't make every card identical.

### Typography

- Font: a clean grotesk/sans (Inter, or "Geist" if available via Google Fonts/self-hosted) — NOT a default system font stack, that's the single biggest tell of an unstyled AI-generated app.
- Two weights only: 400 (body) and 500 (everything that needs emphasis — headings, prices, nav). Never use 600/700/bold — it reads heavy and generic.
- Headings: hero h1 ~36px desktop / 23px mobile, section headings ~16px, both weight 500.
- Body: 13-14px for UI copy, not 16px — this is a dense product-grid app, not an editorial blog. Line height 1.5.
- Sentence case everywhere. No ALL CAPS except tiny eyebrow labels (e.g. "New season") at 9-10px with letter-spacing 0.06-0.08em — that's the one place caps + tracking earns its keep.

### Layout patterns

**Header**: sticky, `paper` background, hairline bottom border. Logo left, nav center (Shop / New / Sale / About), icons right (search, bag). Active nav item gets weight 500 + `ink` color, inactive items get `muted`.

**Hero (homepage)**: full-width `accent` colored band. Headline + subtext + (optionally) small floating product cards at slight rotation (-5deg to +3deg range) to create visual energy without needing real photographed product cutouts — see reference mood below. On mobile, floating cards shrink and the headline drops to ~23px.

**Product grid**: 
- Desktop: persistent left filter rail (~130px, category list + price range, simple text links not heavy buttons) + 4-column grid.
- Mobile: filter rail collapses into a horizontal-scrolling row of pill chips just below the hero. Grid drops to 2 columns.
- Each product card: image area (4:3 or square, your call, pick one and be consistent), name (11px/500), price (11px/500, in `accent.dark`).

**Voice orb** (critical — read carefully):
- Do NOT build a text chat input, a "Ask AI" button, or a chat bubble launcher. The only widget entry point visible on the page is a circular voice orb, fixed bottom-right, all breakpoints.
- Orb: ~56px diameter desktop / ~48px mobile, `ink` background, microphone icon in `accent.light` or similar, a `paper`-colored ring/halo around it (`box-shadow: 0 0 0 4px var(--paper-color)` or similar) so it floats clearly above whatever's behind it.
- The orb needs three distinct visual states, driven by the widget's WebSocket connection status (the actual connection logic lives in the hub's injected script — this app just needs to expose CSS classes/states the script can toggle, or accept postMessage events from the injected widget to drive local React state):
  - `idle` — subtle slow pulse/breathing animation (scale 1 → 1.04 → 1, ~3s loop), muted color.
  - `listening` — faster pulse, brighter accent ring, maybe a couple of concentric rings expanding outward to suggest audio input.
  - `speaking` — different animation pattern (e.g. a gentle waveform-like scale wobble) while the hub is playing TTS audio back.
- Build this as a self-contained `VoiceOrb.tsx` component with the animation states stubbed via CSS classes (`orb--idle`, `orb--listening`, `orb--speaking`) so wiring it to the real hub's events later is just toggling a class/state value, not redesigning the component.
- Do not put the orb inside the hero or footer as a section — it's a persistent fixed-position overlay, independent of scroll position, present on every page (home, listing, detail, cart).

### Reference mood (do not copy literally, use as a vibe anchor)

The desired feel is closer to a duotone coral/charcoal lifestyle app — think a warm, photographic, slightly playful product reveal — rather than a flat corporate SaaS dashboard. Since this is a coded app (not a generated illustration), achieve the "premium" feeling through: confident single-accent color use, tight corner radii, restrained type weights, generous spacing, and the rotated floating-card hero treatment described above — not through gradients, shadows, or stock icon packs.

---

## 5. Widget integration requirements

- Add a single injection point in `index.html` (or dynamically via a `<script>` tag inserted in `useVoiceWidget.ts` on app mount) that loads the hub's `shopbot.js` from an env-configurable origin (`VITE_SHOPBOT_HUB_ORIGIN`).
- The hub script should attach itself to the orb element (give the orb a stable `id="shopbot-voice-orb"` or a `data-shopbot-trigger` attribute) — coordinate the exact contract (what attribute/global the hub script expects) with whatever the hub side already defines; don't invent a new contract if `window.ShopbotAdapter` or similar already exists from the current project.
- The frontend must work and look complete with the widget script absent or failing to load (e.g. hub not running locally) — the orb should still render in its `idle` state, just non-functional, rather than breaking the page.
- Expose the product catalog through the same `/api/products` endpoint the hub already expects (same response shape: `{ "data": [...] }`), so the hub's existing catalog-fetching logic doesn't need to change.

---

## 6. What NOT to do

- Don't reintroduce static site generation / crawler-based HTML output — this is a real SPA now.
- Don't let routes touch the database session or `products.json` directly — repository pattern only.
- Don't use Tailwind's default color palette for brand colors — use the custom tokens in section 4.
- Don't build a chat-bubble or text-input widget UI — voice orb only.
- Don't hardcode the hub origin or any environment-specific URLs in committed code — everything env-driven, with a `.env.example` documenting required vars.
- Don't use bold (600/700) font weights or default system fonts.
- Don't add gradients, drop shadows, or glow effects beyond what's explicitly described above.

---

## 7. Deliverable expectations

- Working `npm run dev` for frontend (Vite) and `uvicorn app.main:app --reload` for backend, runnable side by side locally.
- A `.env.example` for both frontend and backend listing every required variable (API origin, hub origin, CORS origins).
- Seed script that populates SQLite from `products.seed.json` on first run, idempotent on subsequent runs (don't re-seed if data already exists).
- Basic README covering: how to run both services locally, how to point the frontend at a different API origin, how to test the voice orb integration once the hub is running.

If anything in this prompt is ambiguous or conflicts with constraints in the existing codebase you're working from, stop and ask rather than guessing — especially around the exact widget script contract (`window.ShopbotAdapter` or equivalent), since it needs to match what the hub backend already expects.
