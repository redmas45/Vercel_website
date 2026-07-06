# AI-KART Frontend

React, TypeScript, Vite, and Tailwind frontend for the AI-KART storefront.

## Commands

Run commands from the repository root with pnpm through Corepack:

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm lint
corepack pnpm build
```

The root package delegates to this workspace package with `corepack pnpm --filter frontend`.

## Local API

The Vite dev server proxies `/api` and `/static` to `http://127.0.0.1:8000` by default. Start the FastAPI backend before using product, search, auth, account, wishlist, or admin features.

## Notes

The assistant widget script is configured in `index.html` and is intentionally left in place.
