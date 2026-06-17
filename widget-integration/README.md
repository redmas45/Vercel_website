# AI-KART Widget Integration

This document explains how the `shopbot.js` hub script connects to the AI-KART React storefront.

## Script injection

The frontend loads the hub's script dynamically via `useVoiceWidget.ts` on app mount. Set the hub origin in the frontend `.env.local`:

```env
VITE_SHOPBOT_HUB_ORIGIN=https://192.168.68.51:8484
VITE_SHOPBOT_SITE_ID=ai_kart_main
```

The injected script tag will look like:

```html
<script defer
  src="https://192.168.68.51:8484/shopbot.js?site=ai_kart_main"
  data-site-id="ai_kart_main"
  data-shopbot-hub="true">
</script>
```

## Orb attachment

The Voice Orb element has a stable DOM id and data attribute for the hub to attach to:

```html
<div id="shopbot-voice-orb" data-shopbot-trigger="true" ...>
```

## Orb state contract (Option A)

The hub script drives the orb's visual state by dispatching a `CustomEvent` on `window`:

```js
window.dispatchEvent(new CustomEvent('shopbot:orb-state', {
  detail: { state: 'idle' | 'listening' | 'speaking' }
}));
```

The React `useVoiceWidget` hook listens for this event and updates the orb's CSS class accordingly.

## Storefront → Hub: action event bus

The storefront dispatches `CustomEvent("shopbot:action", ...)` for hub-triggered actions (mirrors the existing `cart.js` pattern):

```js
window.dispatchEvent(new CustomEvent('shopbot:action', {
  detail: {
    action: 'ADD_TO_CART',
    params: { product_id: 'acme-mug', quantity: 1 }
  }
}));
```

Supported actions: `ADD_TO_CART`, `SHOW_PRODUCTS`, `FILTER_PRODUCTS`, `OPEN_CART`, `CHECKOUT`.

## Hub → Storefront: window.ShopBotConfig

`useVoiceWidget` sets up `window.ShopBotConfig` so the hub can read site config and trigger storefront callbacks:

| Property | Value |
|---|---|
| `window.ShopBotConfig.siteId` | `ai_kart_main` |
| `window.ShopBotConfig.apiUrl` | `window.location.origin` |
| `window.ShopBotConfig.onOpenCart` | Opens the cart drawer |
| `window.ShopBotConfig.onAddToCart(id, qty)` | Adds item and opens cart |

## Catalog API

The hub fetches the product catalog from the same endpoint shape it already expects:

```
GET /api/products
→ { "data": [ ...products... ] }

GET /api/products/{id}
→ { "data": { ...product } }
```

Run the backend on port 8000 (default) — the Vite dev server proxies `/api` to it automatically.
