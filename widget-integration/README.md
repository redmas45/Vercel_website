# AI-KART Widget Integration

AI-KART is a standalone client website. It does not auto-load AI Hub code.

## Connection

Paste the one-line script into `frontend/index.html` only when this website is connected in AI Hub CRM:

```html
<script defer src="http://143.198.5.97/aihub/shopbot.js?site=ai_kart_main" data-site-id="ai_kart_main"></script>
```

If the script is absent, no mic is shown. If AI Hub CRM disables the client, the served script is disabled and no mic is shown.

## Storefront Hooks

The React app exposes generic browser hooks for the Hub script:

- `window.ShopCart.addItem(productId, quantity)`
- `window.ShopCart.open()`
- `window.ShopCart.clear()`
- `window.ShopCart.removeItem(productId)`
- `window.ShopCart.updateQuantity(productId, quantity)`
- `window.ShopCart.showProductDetail(productId)`
- `window.ShopCart.filterProducts(params)`
- `window.ShopBotConfig.onAddToCart(productId, quantity)`
- `window.ShopBotConfig.onOpenCart()`

These hooks do not contain a Hub URL or Hub credentials. The pasted script provides the Hub connection.

If a shopper is logged in, `window.ShopBotConfig.sessionId` is set to a stable website user session such as `user-12`. Anonymous visitors keep the Hub widget's anonymous browser session.

## Catalog API

AI Hub crawler reads:

```text
GET /api/products
```

Response shape:

```json
{ "data": [] }
```
