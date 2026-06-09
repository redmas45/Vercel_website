# Product API Config

Context: This is a cloned ecommerce lab site with a generated product catalog API.

## Product List

API URL:

```text
https://vercelclonedwebsite.vercel.app/api/products
```

Method:

```text
GET
```

Auth required:

```text
No
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
q         optional string, examples: hoodie, cap
```

POST body:

```text
None. This endpoint uses GET.
```

Example:

```text
https://vercelclonedwebsite.vercel.app/api/products?page=1&limit=2
```

Product list JSON path:

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

## Single Product

API URL:

```text
https://vercelclonedwebsite.vercel.app/api/products/{product_id}
```

Example:

```text
https://vercelclonedwebsite.vercel.app/api/products/acme-hoodie
```

Method:

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

## Full Catalog

API URL:

```text
https://vercelclonedwebsite.vercel.app/api/catalog
```

Method:

```text
GET
```

Product list JSON path:

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

For `/api/catalog`, use:

```text
products[].id
products[].title
products[].description
products[].category
products[].brand
products[].vendor
products[].price
products[].original_price
products[].stock
products[].image_url
```

## Pagination

Applies only to:

```text
GET /api/products
```

Rules:

```text
page starts at 1
limit defaults to 20
limit max is 100
total is filtered count
total_pages = ceil(total / limit)
has_next true when another page exists
has_prev true when page > 1
```

## Categories

Known category values:

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

## No-API Condition

There is a valid JSON product API:

```text
https://vercelclonedwebsite.vercel.app/api/products
```
