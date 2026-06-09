# Local clone lab for https://demo.vercel.store (self-hosted practice environment)

⚠️ Use this only for your own legal security practice on systems you own.  
Do **not** deploy this as a deceptive copy of another site or target it for unauthorized testing.

## What this project contains

- `scripts/crawl.mjs`  
  - Crawls `SOURCE_URL`
  - Rewrites internal links/assets for local usage
  - Stores pages and assets in PostgreSQL
  - Writes a local static mirror under `out/`

- `scripts/export-static.mjs`  
  - Rebuilds static mirror from DB tables

- `scripts/init-db.mjs`  
  - Applies schema in `db/schema.sql`

- `scripts/clean-mirror.mjs`  
  - Clears `out/` mirror directory

- `db/schema.sql`  
  - Table definitions for `clone_pages` and `clone_assets`

- `docker-compose.yml`  
  - Optional local PostgreSQL instance

- `vercel.json`  
  - Vercel config for deploying generated static files in `out/`

## 1) Setup local DB

```bash
cp .env.example .env
docker compose up -d
```

Update `.env` if you changed DB credentials.

## 2) Install dependencies

```bash
npm install
```

## 3) Initialize DB schema

```bash
npm run db:init
```

## 4) Crawl target and build mirror + DB records

```bash
npm run clean:mirror
npm run crawl
```

The following are generated:

- `out/` → static files for deployment
- `clone_pages` and `clone_assets` in PostgreSQL

## 5) If needed, rebuild mirror from DB

```bash
npm run export:static
```

## 6) Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --yes
vercel --prod
```

Important deployment notes:

- Build step is disabled (`buildCommand` in `vercel.json`), so ensure `out/` already contains files.
- If you prefer automatic CI deployment from GitHub:
  - Commit this repo
  - Import into Vercel
  - Use **Framework Preset: Other**
  - Set **Output Directory** to `out`
  - Disable install/build steps or keep defaults if you already committed `out`

## Notes and limits

- This is a **snapshot-style crawler**; highly dynamic content loaded only after heavy JS execution may be incomplete.
- Third-party scripts/CDNs may still be referenced externally if not captured by crawler (for example, strict CORS/CDN behavior).
- Use a local throwaway environment for JS-injection training (e.g., intentionally vulnerable apps like DVWA/OWASP Juice Shop) instead of cloned production systems.
- If you need full JS-rendered capture, add a browser crawler in a second pass (Playwright) and run it in your own lab.

## 7) Useful env vars

| variable | purpose |
|---|---|
| `SOURCE_URL` | target root URL |
| `MAX_PAGES` | upper limit of page requests |
| `MAX_ASSETS` | upper limit of asset downloads |
| `CRAWL_CONCURRENCY` | parallel request limit |
| `MIRROR_DIR` | static output folder (`out` by default) |
