# AI-KART Widget Integration

AI-KART is a standalone client website. It does not auto-load AI Hub code.

## Connection

Paste the one-line script into `frontend/index.html` only when this website is connected in AI Hub CRM:

```html
<script defer src="http://143.198.5.97/aihub/install.js?site=ai_kart" data-site-id="ai_kart"></script>
```

If the script is absent, no mic is shown. If AI Hub CRM disables the client, the served script is disabled and no mic is shown.

The installer loads AI Hub's hosted adapter runtime first, then the mic/widget bundle. AI-KART does not need to ship Hub credentials or Hub-owned logic.

## Storefront Contract

The React app does not expose Hub-specific browser globals. The old storefront-owned cart/config bridge has been removed.

The pasted installer script is the only connection to AI Hub. The Hub-hosted runtime discovers routes, buttons, forms, catalog APIs, and safe actions from the rendered website.

## Catalog API

AI Hub crawler reads:

```text
GET /api/products
```

Response shape:

```json
{ "data": [] }
```
