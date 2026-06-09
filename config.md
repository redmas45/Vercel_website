# Vercel Store Clone Lab Config

This project is a self-hosted clone/lab based on `https://demo.vercel.store/`.
The deployed clone is:

```text
https://vercelclonedwebsite.vercel.app/
```

The site now exposes a clean JSON product catalog API generated from the cloned catalog pages.

## Product List API

Exact API URL:

```text
https://vercelclonedwebsite.vercel.app/api/products
```

HTTP method:

```text
GET
```

Authentication:

```text
No auth required
```

Required headers:

```text
None
```

Recommended headers:

```http
Accept: application/json
```

Query params:

```text
page      optional integer, default 1
limit     optional integer, default 20, max 100
category  optional string, examples: shirts, hoodies, bags
q         optional search string, examples: hoodie, cap
```

POST body:

```text
Not required. This is a GET endpoint.
```

Example URL:

```text
https://vercelclonedwebsite.vercel.app/api/products?page=1&limit=2
```

JSON path containing product list:

```text
data
```

Sample response:

```json
{
  "data": [
    {
      "id": "acme-baby-cap",
      "handle": "acme-baby-cap",
      "title": "Acme Baby Cap",
      "name": "Acme Baby Cap",
      "description": "100% combed ringspun cotton",
      "category": "headwear",
      "categories": ["headwear", "kids"],
      "brand": "Acme",
      "vendor": "Acme",
      "price": 10,
      "original_price": null,
      "currency": "USD",
      "stock": null,
      "in_stock": true,
      "image_url": "https://cdn.shopify.com/s/files/1/0754/3727/7491/files/baby-cap-black.png?v=1690002570",
      "url": "/product/acme-baby-cap/"
    },
    {
      "id": "acme-baby-onesie",
      "handle": "acme-baby-onesie",
      "title": "Acme Baby Onesie",
      "name": "Acme Baby Onesie",
      "description": "Short sleeve 5-oz, 100% combed ringspun cotton onesie",
      "category": "kids",
      "categories": ["kids"],
      "brand": "Acme",
      "vendor": "Acme",
      "price": 10,
      "original_price": null,
      "currency": "USD",
      "stock": null,
      "in_stock": true,
      "image_url": "https://cdn.shopify.com/s/files/1/0754/3727/7491/files/baby-onesie-beige-1.png?v=1690002632",
      "url": "/product/acme-baby-onesie/"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "total": 19,
    "total_pages": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

## Single Product API

Exact API URL:

```text
https://vercelclonedwebsite.vercel.app/api/products/{product_id}
```

Example:

```text
https://vercelclonedwebsite.vercel.app/api/products/acme-hoodie
```

HTTP method:

```text
GET
```

Sample response:

```json
{
  "data": {
    "id": "acme-hoodie",
    "handle": "acme-hoodie",
    "title": "Acme Hoodie",
    "name": "Acme Hoodie",
    "description": "Fabric blend of Supima Cotton and Micromodal.",
    "category": "hoodies",
    "categories": ["hoodies"],
    "brand": "Acme",
    "vendor": "Acme",
    "price": 50,
    "original_price": null,
    "currency": "USD",
    "stock": null,
    "in_stock": true,
    "image_url": "https://cdn.shopify.com/s/files/1/0754/3727/7491/files/hoodie-1.png?v=1690003482",
    "url": "/product/acme-hoodie/"
  }
}
```

## Full Catalog API

Exact API URL:

```text
https://vercelclonedwebsite.vercel.app/api/catalog
```

HTTP method:

```text
GET
```

JSON path containing product list:

```text
products
```

## Field Mapping

```text
id              -> data[].id
name/title      -> data[].title or data[].name
description     -> data[].description
category        -> data[].category
brand/vendor    -> data[].brand or data[].vendor
price           -> data[].price
original_price  -> data[].original_price
stock           -> data[].stock
image_url       -> data[].image_url
```

For `/api/catalog`, use the same fields under:

```text
products[]
```

## Pagination Rules

Pagination applies to:

```text
GET /api/products
```

Rules:

```text
page starts at 1
limit defaults to 20
limit max is 100
total is the filtered product count
total_pages = ceil(total / limit)
has_next is true when another page exists
has_prev is true when page > 1
```

Example:

```text
https://vercelclonedwebsite.vercel.app/api/products?page=1&limit=10
```

## Filters

Category filter:

```text
https://vercelclonedwebsite.vercel.app/api/products?category=shirts
```

Search filter:

```text
https://vercelclonedwebsite.vercel.app/api/products?q=hoodie
```

Combined:

```text
https://vercelclonedwebsite.vercel.app/api/products?category=shirts&q=t-shirt&page=1&limit=10
```

Known categories from the current clone:

```text
bags
drinkware
electronics
footware
headwear
hoodies
jackets
kids
pets
shirts
stickers
```

## Implementation Notes

The original cloned site did not expose a clean public JSON product API for this lab.
The current project extracts product catalog data from the cloned static files during build and writes:

```text
out/api/products.json
```

The FastAPI app in:

```text
api/index.py
```

serves:

```text
/api/products
/api/products/{product_id}
/api/catalog
```

The extractor is:

```text
scripts/extract-catalog.mjs
```

The build command is:

```bash
npm run build
```

which runs:

```bash
node scripts/crawl-static.mjs && node scripts/extract-catalog.mjs
```

## JavaScript Injection Lab

Local injection file:

```text
lab/injection.js
```

Default local env:

```env
LAB_INJECTION_ENABLED=true
LAB_INJECTION_SRC=/lab/injection.js
LAB_SECURITY_MODE=lab
```

Remote server-side injection:

```env
LAB_INJECTION_SRC=/lab/remote.js
LAB_REMOTE_SCRIPT_URL=https://your-other-project.vercel.app/inject.js
LAB_REMOTE_SCRIPT_KEY=shared-secret
LAB_REMOTE_SCRIPT_KEY_HEADER=X-Lab-Api-Key
```

The browser sees only:

```text
/lab/remote.js
```

The clone server fetches the real script server-to-server and sends:

```http
X-Lab-Api-Key: shared-secret
```

## Security Headers

The FastAPI app adds realistic browser-facing headers:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
X-Frame-Options
Permissions-Policy
Access-Control-Allow-Origin
```

CORS for the catalog API is controlled by:

```env
API_CORS_ORIGIN=*
```

## If Asked Whether A JSON Product API Exists

Answer:

```text
Yes. The cloned lab now exposes a JSON product API at:
https://vercelclonedwebsite.vercel.app/api/products
```
