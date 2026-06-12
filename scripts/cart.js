(function () {
  // --- Cart State Management ---
  const CART_KEY = "shopbot_cart";
  let cart = [];
  let catalog = [];
  let activeResults = [];

  function getShopbotApiBase() {
    const configured = window.ShopBotConfig?.apiUrl;
    if (configured) return String(configured).replace(/\/+$/, "");

    const injectedScript = document.querySelector("script[data-api-url]");
    const fromScript = injectedScript?.getAttribute("data-api-url");
    if (fromScript) return fromScript.replace(/\/+$/, "");

    return window.location.origin;
  }

  function getShopbotSiteId() {
    return (
      window.ShopBotConfig?.siteId ||
      document.querySelector("script[data-site-id]")?.getAttribute("data-site-id") ||
      "ai_kart_main"
    );
  }

  function normalizeProduct(raw) {
    if (!raw) return null;
    const id = String(raw.id || raw.product_id || raw.handle || "").trim();
    const handle = String(raw.handle || raw.id || raw.product_id || "").trim();
    const name = raw.name || raw.title || "Untitled product";
    const price = Number(raw.price || 0);
    if (!id || !name || !Number.isFinite(price)) return null;

    return {
      id,
      handle,
      name,
      title: raw.title || name,
      description: raw.description || "",
      category: raw.category || raw.category_name || null,
      categories: Array.isArray(raw.categories)
        ? raw.categories
        : [raw.category || raw.category_name].filter(Boolean),
      brand: raw.brand || raw.vendor || "NOVA",
      price,
      stock: raw.stock,
      in_stock: raw.in_stock !== false && Number(raw.stock ?? 1) !== 0,
      image_url: raw.image_url || raw.image || raw.thumbnail || "",
      url: raw.url || (handle ? `/product/${handle}/` : "")
    };
  }

  function loadCart() {
    try {
      const stored = localStorage.getItem(CART_KEY);
      cart = stored ? JSON.parse(stored) : [];
    } catch (e) {
      cart = [];
    }
    updateBadge();
    renderCartItems();
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      // Ignored
    }
    updateBadge();
    renderCartItems();
  }

  async function fetchCatalog() {
    try {
      const res = await fetch("/api/products.json");
      if (!res.ok) throw new Error("Catalog fetch failed");
      const data = await res.json();
      catalog = (data.products || []).map(normalizeProduct).filter(Boolean);
    } catch (e) {
      console.warn("[ShopCart] Failed to load product catalog:", e);
    }
  }

  // --- UI Creation & Styling ---
  const styles = `
    /* Cart Overlay */
    #shopbot-cart-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 2147483640;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    #shopbot-cart-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }

    /* Cart Drawer */
    #shopbot-cart-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 420px;
      max-width: 100%;
      background: rgba(10, 10, 10, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 2147483641;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: ui-sans-serif, system-ui, sans-serif;
      color: #ffffff;
    }
    #shopbot-cart-drawer.active {
      transform: translateX(0);
    }

    /* Header & Footer */
    .shopbot-cart-header {
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .shopbot-cart-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.025em;
    }
    .shopbot-cart-close {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 24px;
      cursor: pointer;
      padding: 4px 8px;
      transition: color 0.2s;
    }
    .shopbot-cart-close:hover {
      color: #ffffff;
    }

    /* Scrollable items list */
    .shopbot-cart-items {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .shopbot-cart-item {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .shopbot-cart-item img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .shopbot-cart-item-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .shopbot-cart-item-title {
      font-weight: 500;
      font-size: 14px;
      margin: 0;
      line-height: 1.4;
      color: #ffffff;
    }
    .shopbot-cart-item-price {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }
    .shopbot-cart-item-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 4px;
    }
    .shopbot-qty-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .shopbot-qty-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .shopbot-qty-val {
      font-size: 13px;
      font-weight: 500;
      min-width: 16px;
      text-align: center;
    }
    .shopbot-item-remove {
      background: none;
      border: none;
      color: rgba(239, 68, 68, 0.8);
      cursor: pointer;
      font-size: 12px;
      padding: 4px;
      margin-left: auto;
      transition: color 0.2s;
    }
    .shopbot-item-remove:hover {
      color: #ef4444;
    }

    /* Footer / Checkout area */
    .shopbot-cart-footer {
      padding: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(15, 15, 15, 0.5);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .shopbot-cart-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }
    .shopbot-cart-row.total {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin-top: 4px;
      border-top: 1px dashed rgba(255, 255, 255, 0.15);
      padding-top: 12px;
    }
    .shopbot-checkout-btn {
      width: 100%;
      background: #155dfc;
      color: white;
      border: none;
      padding: 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    .shopbot-checkout-btn:hover {
      background: #104ecc;
    }
    .shopbot-checkout-btn:active {
      transform: scale(0.98);
    }

    /* Active Cart Badge */
    .shopbot-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      background: #155dfc;
      color: white;
      font-size: 10px;
      font-weight: 700;
      width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      pointer-events: none;
      animation: popBadge 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    /* Checkout Modal Overlay */
    #shopbot-checkout-modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      z-index: 2147483645;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
    #shopbot-checkout-modal.active {
      opacity: 1;
      pointer-events: auto;
    }
    .shopbot-modal-content {
      background: #121212;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
      transform: scale(0.9);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      color: white;
    }
    #shopbot-checkout-modal.active .shopbot-modal-content {
      transform: scale(1);
    }
    .shopbot-success-icon {
      font-size: 48px;
      margin-bottom: 16px;
      display: inline-block;
      animation: bounceSuccess 0.6s ease;
    }
    .shopbot-modal-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 12px 0;
    }
    .shopbot-modal-desc {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    .shopbot-modal-ok-btn {
      background: #ffffff;
      color: #000000;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .shopbot-modal-ok-btn:hover {
      opacity: 0.9;
    }

    #shopbot-results-panel {
      position: fixed;
      left: 24px;
      right: 24px;
      bottom: 24px;
      z-index: 2147483638;
      max-width: 980px;
      margin: 0 auto;
      background: rgba(247, 247, 243, 0.97);
      border: 1px solid rgba(22, 22, 21, 0.12);
      border-radius: 8px;
      box-shadow: 0 24px 70px rgba(22, 22, 21, 0.18);
      color: #161615;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      transform: translateY(calc(100% + 32px));
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      max-height: min(70vh, 620px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #shopbot-results-panel.active {
      transform: translateY(0);
    }
    .shopbot-results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 16px 18px;
      border-bottom: 1px solid rgba(22, 22, 21, 0.1);
    }
    .shopbot-results-title {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0;
    }
    .shopbot-results-close {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 1px solid rgba(22, 22, 21, 0.14);
      border-radius: 8px;
      background: #ffffff;
      color: #161615;
      cursor: pointer;
    }
    .shopbot-results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 12px;
      overflow: auto;
      padding: 16px;
    }
    .shopbot-result-card {
      display: grid;
      gap: 10px;
      border: 1px solid rgba(22, 22, 21, 0.1);
      border-radius: 8px;
      background: #ffffff;
      padding: 12px;
      min-width: 0;
    }
    .shopbot-result-card img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: contain;
      border-radius: 8px;
      background: #f1f2ee;
      padding: 8px;
      mix-blend-mode: multiply;
    }
    .shopbot-result-card h3 {
      margin: 0;
      font-size: 14px;
      line-height: 1.3;
      color: #161615;
    }
    .shopbot-result-card p {
      margin: 0;
      color: #686660;
      font-size: 13px;
    }
    .shopbot-result-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .shopbot-result-actions button,
    .shopbot-result-actions a {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      border-radius: 8px;
      border: 1px solid rgba(22, 22, 21, 0.12);
      background: #161615;
      color: #ffffff;
      text-decoration: none;
      font-size: 12px;
      font-weight: 760;
      cursor: pointer;
    }
    .shopbot-result-actions a {
      background: #ffffff;
      color: #161615;
    }
    @media (max-width: 640px) {
      #shopbot-results-panel {
        left: 10px;
        right: 10px;
        bottom: 10px;
        max-height: 76vh;
      }
      .shopbot-results-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        padding: 12px;
      }
    }

    @keyframes popBadge {
      0% { transform: scale(0); }
      100% { transform: scale(1); }
    }
    @keyframes bounceSuccess {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.1); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); opacity: 1; }
    }
    /* Premium cart refresh */
    #shopbot-cart-overlay {
      background: rgba(17, 19, 18, 0.42);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    #shopbot-cart-drawer {
      width: 440px;
      background: rgba(247, 247, 243, 0.97);
      border-left: 1px solid rgba(22, 22, 21, 0.12);
      color: #161615;
      box-shadow: -24px 0 70px rgba(22, 22, 21, 0.18);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .shopbot-cart-header {
      border-bottom: 1px solid rgba(22, 22, 21, 0.1);
    }
    .shopbot-cart-header h2 {
      color: #161615;
      font-size: 18px;
      font-weight: 760;
      letter-spacing: 0;
    }
    .shopbot-cart-close {
      color: rgba(22, 22, 21, 0.54);
    }
    .shopbot-cart-close:hover {
      color: #161615;
    }
    .shopbot-cart-item {
      align-items: flex-start;
      border: 1px solid rgba(22, 22, 21, 0.08);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.78);
      padding: 12px;
    }
    .shopbot-cart-item img {
      background: #f1f2ee;
      border-color: rgba(22, 22, 21, 0.08);
      border-radius: 8px;
      object-fit: contain;
      padding: 6px;
      mix-blend-mode: multiply;
    }
    .shopbot-cart-item-title {
      color: #161615;
      font-weight: 700;
      letter-spacing: 0;
    }
    .shopbot-cart-item-price,
    .shopbot-cart-row {
      color: #686660;
    }
    .shopbot-cart-row.total {
      color: #161615;
      border-top-color: rgba(22, 22, 21, 0.14);
    }
    .shopbot-qty-btn {
      background: #ffffff;
      border-color: rgba(22, 22, 21, 0.14);
      color: #161615;
    }
    .shopbot-qty-btn:hover {
      background: #eef1eb;
    }
    .shopbot-item-remove {
      color: #a76335;
    }
    .shopbot-item-remove:hover {
      color: #7b4726;
    }
    .shopbot-cart-footer {
      background: rgba(255, 255, 255, 0.74);
      border-top-color: rgba(22, 22, 21, 0.1);
    }
    .shopbot-checkout-btn {
      background: #161615;
      border-radius: 8px;
      box-shadow: 0 14px 28px rgba(22, 22, 21, 0.2);
    }
    .shopbot-checkout-btn:hover {
      background: #2a2a27;
    }
    .shopbot-badge {
      background: #155dfc;
      border-color: #f7f7f3;
    }
    #shopbot-checkout-modal {
      background: rgba(17, 19, 18, 0.5);
    }
    .shopbot-modal-content {
      background: #f7f7f3;
      border-color: rgba(22, 22, 21, 0.1);
      border-radius: 8px;
      color: #161615;
      box-shadow: 0 24px 72px rgba(22, 22, 21, 0.22);
    }
    .shopbot-modal-title {
      color: #161615;
      letter-spacing: 0;
    }
    .shopbot-modal-desc {
      color: #686660;
    }
    .shopbot-success-icon {
      width: 52px;
      height: 52px;
      display: inline-grid;
      place-items: center;
      margin-bottom: 16px;
      border-radius: 8px;
      background: #161615;
      color: #ffffff;
    }
    .shopbot-success-icon svg {
      width: 28px;
      height: 28px;
    }
    .shopbot-modal-ok-btn {
      background: #161615;
      color: #ffffff;
      border-radius: 8px;
    }
  `;

  function injectDOM() {
    // Style
    const styleEl = document.createElement("style");
    styleEl.innerHTML = styles;
    document.head.appendChild(styleEl);

    // Overlay
    const overlay = document.createElement("div");
    overlay.id = "shopbot-cart-overlay";
    overlay.addEventListener("click", closeCart);
    document.body.appendChild(overlay);

    // Drawer
    const drawer = document.createElement("div");
    drawer.id = "shopbot-cart-drawer";
    drawer.innerHTML = `
      <div class="shopbot-cart-header">
        <h2>Shopping Cart</h2>
        <button class="shopbot-cart-close" aria-label="Close cart">&times;</button>
      </div>
      <div class="shopbot-cart-items" id="shopbot-items-container">
        <!-- Cart items list dynamically inserted -->
      </div>
      <div class="shopbot-cart-footer">
        <div class="shopbot-cart-row">
          <span>Subtotal</span>
          <span id="shopbot-cart-subtotal">$0.00</span>
        </div>
        <div class="shopbot-cart-row">
          <span>Taxes & Shipping</span>
          <span>Calculated at checkout</span>
        </div>
        <div class="shopbot-cart-row total">
          <span>Total</span>
          <span id="shopbot-cart-total">$0.00</span>
        </div>
        <button class="shopbot-checkout-btn">Proceed to Checkout</button>
      </div>
    `;
    document.body.appendChild(drawer);

    drawer.querySelector(".shopbot-cart-close").addEventListener("click", closeCart);
    drawer.querySelector(".shopbot-checkout-btn").addEventListener("click", runSimulatedCheckout);

    // Checkout Modal
    const modal = document.createElement("div");
    modal.id = "shopbot-checkout-modal";
    modal.innerHTML = `
      <div class="shopbot-modal-content">
        <span class="shopbot-success-icon">🎉</span>
        <h3 class="shopbot-modal-title">Checkout complete</h3>
        <p class="shopbot-modal-desc">Your order is confirmed and the cart has been cleared.</p>
        <button class="shopbot-modal-ok-btn">Done</button>
      </div>
    `;
    document.body.appendChild(modal);
    const successIcon = modal.querySelector(".shopbot-success-icon");
    if (successIcon) {
      successIcon.setAttribute("aria-hidden", "true");
      successIcon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"></path>
        </svg>
      `;
    }

    modal.querySelector(".shopbot-modal-ok-btn").addEventListener("click", () => {
      modal.classList.remove("active");
    });

    const resultsPanel = document.createElement("div");
    resultsPanel.id = "shopbot-results-panel";
    resultsPanel.setAttribute("aria-live", "polite");
    resultsPanel.innerHTML = `
      <div class="shopbot-results-header">
        <h2 class="shopbot-results-title">Recommended products</h2>
        <button class="shopbot-results-close" aria-label="Close recommendations">&times;</button>
      </div>
      <div class="shopbot-results-grid" id="shopbot-results-grid"></div>
    `;
    document.body.appendChild(resultsPanel);
    resultsPanel.querySelector(".shopbot-results-close").addEventListener("click", () => {
      resultsPanel.classList.remove("active");
    });
  }

  // --- Cart Drawer Operations ---
  function openCart() {
    document.getElementById("shopbot-cart-overlay").classList.add("active");
    document.getElementById("shopbot-cart-drawer").classList.add("active");
  }

  function closeCart() {
    document.getElementById("shopbot-cart-overlay").classList.remove("active");
    document.getElementById("shopbot-cart-drawer").classList.remove("active");
  }

  function toggleCart() {
    const drawer = document.getElementById("shopbot-cart-drawer");
    if (drawer.classList.contains("active")) {
      closeCart();
    } else {
      openCart();
    }
  }

  function runSimulatedCheckout(params = {}) {
    if (cart.length === 0) return;
    
    const apiBase = getShopbotApiBase();
    const payload = {
      site_id: getShopbotSiteId(),
      address: params.address || "Not Provided",
      payment_method: params.payment_method || "Not Provided",
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    };

    fetch(`${apiBase}/v1/cart/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(async res => {
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bill.pdf";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    }).catch(err => {
      console.error("[ShopCart] Checkout API error:", err);
    }).finally(() => {
      closeCart();
      cart = [];
      saveCart();
      document.getElementById("shopbot-checkout-modal").classList.add("active");
    });
  }

  function productMatches(product, productId) {
    const target = String(productId || "");
    return [product.id, product.handle, product.product_id].map(value => String(value || "")).includes(target);
  }

  function cartItemMatches(item, productId, product) {
    const target = String(productId || "");
    const known = [item.id, item.handle, product?.id, product?.handle].map(value => String(value || ""));
    return known.includes(target);
  }

  function findLocalProduct(productId) {
    return catalog.find(product => productMatches(product, productId)) || null;
  }

  async function fetchBackendProductsByIds(productIds) {
    const ids = productIds.map(id => String(id || "").trim()).filter(Boolean);
    if (!ids.length) return [];

    try {
      const apiBase = getShopbotApiBase();
      const params = new URLSearchParams({
        ids: ids.join(","),
        site_id: getShopbotSiteId()
      });
      const res = await fetch(`${apiBase}/v1/products/by-ids?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(normalizeProduct).filter(Boolean);
    } catch (error) {
      console.warn("[ShopCart] Backend product lookup failed:", error);
      return [];
    }
  }

  async function resolveProduct(productId) {
    const local = findLocalProduct(productId);
    if (local) return local;

    const [remote] = await fetchBackendProductsByIds([productId]);
    if (remote) {
      catalog.push(remote);
      return remote;
    }
    return null;
  }

  // --- Cart Mutators ---
  async function addItem(productId, quantity = 1) {
    const qty = Math.max(1, Number(quantity) || 1);
    const product = await resolveProduct(productId);
    const existing = cart.find(item => cartItemMatches(item, productId, product));
    if (existing) {
      existing.quantity += qty;
      saveCart();
      return;
    }

    if (product) {
      cart.push({
        id: String(product.id),
        handle: product.handle ? String(product.handle) : String(product.id),
        name: product.name || product.title,
        price: product.price,
        image_url: product.image_url,
        quantity: qty
      });
      saveCart();
    } else {
      console.warn(`[ShopCart] Product ${productId} not found in catalog cache`);
    }
  }

  function updateQuantity(productId, quantity) {
    const idx = cart.findIndex(item => cartItemMatches(item, productId));
    if (idx !== -1) {
      if (quantity <= 0) {
        cart.splice(idx, 1);
      } else {
        cart[idx].quantity = quantity;
      }
      saveCart();
    }
  }

  function removeItem(productId) {
    cart = cart.filter(item => !cartItemMatches(item, productId));
    saveCart();
  }

  function clearCart() {
    cart = [];
    saveCart();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderProductResults(products, title = "Recommended products") {
    const panel = document.getElementById("shopbot-results-panel");
    const grid = document.getElementById("shopbot-results-grid");
    if (!panel || !grid) return;

    // Reset grid styles in case we previously set them for comparison layout
    grid.style.display = "";
    grid.style.flexDirection = "";
    grid.style.overflowX = "";
    grid.style.gap = "";
    grid.style.padding = "";
    grid.style.alignItems = "";

    activeResults = products.filter(Boolean);
    panel.querySelector(".shopbot-results-title").textContent = title;

    if (!activeResults.length) {
      grid.innerHTML = `<p style="grid-column:1/-1;margin:0;color:#686660;">No matching products are currently available.</p>`;
      panel.classList.add("active");
      return;
    }

    grid.innerHTML = activeResults.map(product => {
      const detailUrl = product.url || (product.handle ? `/product/${product.handle}/` : "");
      const safeId = escapeHtml(product.id);
      return `
        <article class="shopbot-result-card" data-id="${safeId}">
          <img src="${escapeHtml(product.image_url || "https://demo.vercel.store/placeholder.png")}" alt="${escapeHtml(product.name)}">
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.brand || "NOVA")} · $${Number(product.price || 0).toFixed(2)} USD</p>
          <div class="shopbot-result-actions">
            <button type="button" data-add="${safeId}">Add</button>
            ${detailUrl ? `<a href="${escapeHtml(detailUrl)}">View</a>` : ""}
          </div>
        </article>
      `;
    }).join("");

    grid.querySelectorAll("[data-add]").forEach(button => {
      button.addEventListener("click", async () => {
        await addItem(button.getAttribute("data-add"), 1);
        openCart();
      });
    });

    panel.classList.add("active");
  }

  function renderComparisonResults(products) {
    const panel = document.getElementById("shopbot-results-panel");
    const grid = document.getElementById("shopbot-results-grid");
    if (!panel || !grid) return;

    activeResults = products.filter(Boolean);
    panel.querySelector(".shopbot-results-title").textContent = "Product Comparison";

    if (!activeResults.length) {
      grid.style.display = "";
      grid.style.flexDirection = "";
      grid.style.overflowX = "";
      grid.style.gap = "";
      grid.style.padding = "";
      grid.style.alignItems = "";
      grid.innerHTML = `<p style="grid-column:1/-1;margin:0;color:#686660;">No products to compare.</p>`;
      panel.classList.add("active");
      return;
    }

    // Set flex layout on the grid element itself
    grid.style.display = "flex";
    grid.style.flexDirection = "row";
    grid.style.overflowX = "auto";
    grid.style.gap = "16px";
    grid.style.padding = "16px";
    grid.style.alignItems = "stretch";

    grid.innerHTML = activeResults.map(product => {
      const detailUrl = product.url || (product.handle ? `/product/${product.handle}/` : "");
      const safeId = escapeHtml(product.id);
      return `
        <div class="shopbot-compare-card" style="display: flex; flex-direction: column; background: #ffffff; border: 1px solid rgba(22, 22, 21, 0.12); border-radius: 12px; padding: 16px; min-width: 240px; max-width: 320px; flex: 1 0 240px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); transition: transform 0.2s ease; box-sizing: border-box;">
          <div style="height: 120px; display: flex; align-items: center; justify-content: center; background: #f1f2ee; border-radius: 8px; padding: 8px; margin-bottom: 12px; flex-shrink: 0;">
            <img src="${escapeHtml(product.image_url || "https://demo.vercel.store/placeholder.png")}" alt="${escapeHtml(product.name)}" style="max-height: 100%; max-width: 100%; object-fit: contain; mix-blend-mode: multiply;">
          </div>
          <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 800; color: #161615; min-height: 40px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex-shrink: 0; line-height: 1.3;">${escapeHtml(product.name)}</h3>
          
          <div class="shopbot-compare-stats" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; font-size: 13px; border-top: 1px solid rgba(22,22,21,0.08); padding-top: 12px; flex-grow: 1;">
            <div style="display: flex; justify-content: space-between;"><span style="color: #686660;">Price:</span><strong style="color: #155dfc;">$${Number(product.price || 0).toFixed(2)}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: #686660;">Brand:</span><span style="font-weight: 600;">${escapeHtml(product.brand || "NOVA")}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: #686660;">Category:</span><span style="font-style: italic;">${escapeHtml(product.category || "General")}</span></div>
            <div style="display: flex; flex-direction: column; gap: 4px; border-top: 1px dashed rgba(22,22,21,0.08); padding-top: 8px;">
              <span style="color: #686660;">Description:</span>
              <p style="margin: 0; color: #222; font-size: 12px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;" title="${escapeHtml(product.description || '')}">
                ${escapeHtml(product.description || 'No description available.')}
              </p>
            </div>
          </div>

          <div class="shopbot-result-actions" style="display: flex; gap: 8px; margin-top: auto; flex-shrink: 0;">
            <button type="button" data-add="${safeId}" style="flex: 1; min-height: 36px; border-radius: 8px; border: 1px solid rgba(22, 22, 21, 0.12); background: #161615; color: #ffffff; font-size: 12px; font-weight: 760; cursor: pointer; outline: none;">Add</button>
            ${detailUrl ? `<a href="${escapeHtml(detailUrl)}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; min-height: 36px; border-radius: 8px; border: 1px solid rgba(22, 22, 21, 0.12); background: #ffffff; color: #161615; text-decoration: none; font-size: 12px; font-weight: 760; cursor: pointer; text-align: center;">View</a>` : ""}
          </div>
        </div>
      `;
    }).join("");

    grid.querySelectorAll("[data-add]").forEach(button => {
      button.addEventListener("click", async () => {
        await addItem(button.getAttribute("data-add"), 1);
        openCart();
      });
    });

    panel.classList.add("active");
  }

  async function showComparison(productIds = []) {
    const ids = Array.isArray(productIds) ? [...productIds] : [];
    
    // Auto-include current product from details page if not already present
    if (window.location.pathname.includes("/product/")) {
      const match = window.location.pathname.split("/").filter(Boolean);
      const currentHandle = match.pop();
      if (currentHandle && !ids.includes(currentHandle)) {
        const currentProd = findLocalProduct(currentHandle);
        if (currentProd) {
          if (!ids.includes(String(currentProd.id))) {
            ids.unshift(String(currentProd.id));
          }
        } else {
          ids.unshift(currentHandle);
        }
      }
    }

    const localMatches = ids.map(findLocalProduct).filter(Boolean);
    const missingIds = ids.filter(id => !findLocalProduct(id));
    const remoteMatches = await fetchBackendProductsByIds(missingIds);
    const byId = new Map([...localMatches, ...remoteMatches].map(product => [String(product.id), product]));

    for (const product of remoteMatches) {
      if (!findLocalProduct(product.id)) catalog.push(product);
    }

    const ordered = ids
      .map(id => byId.get(String(id)) || findLocalProduct(id))
      .filter(Boolean);
    renderComparisonResults(ordered);
  }

  async function showProducts(productIds = [], title = "Recommended products") {
    const ids = Array.isArray(productIds) ? productIds : [];
    const localMatches = ids.map(findLocalProduct).filter(Boolean);
    const missingIds = ids.filter(id => !findLocalProduct(id));
    const remoteMatches = await fetchBackendProductsByIds(missingIds);
    const byId = new Map([...localMatches, ...remoteMatches].map(product => [String(product.id), product]));

    for (const product of remoteMatches) {
      if (!findLocalProduct(product.id)) catalog.push(product);
    }

    const ordered = ids
      .map(id => byId.get(String(id)) || findLocalProduct(id))
      .filter(Boolean);
    renderProductResults(ordered, title);
  }

  function productMatchesFilters(product, filters = {}) {
    const category = String(filters.category || "").toLowerCase();
    const brand = String(filters.brand || "").toLowerCase();
    const maxPrice = filters.max_price != null ? Number(filters.max_price) : null;
    const minPrice = filters.min_price != null ? Number(filters.min_price) : null;
    const minRating = filters.min_rating != null ? Number(filters.min_rating) : null;
    const tags = Array.isArray(filters.tags) ? filters.tags : (filters.tags ? [filters.tags] : []);
    const productCategories = [product.category, ...(product.categories || [])].map(item => String(item || "").toLowerCase());

    if (category && !productCategories.some(item => item.includes(category))) return false;
    if (brand && !String(product.brand || "").toLowerCase().includes(brand)) return false;
    if (Number.isFinite(maxPrice) && product.price > maxPrice) return false;
    if (Number.isFinite(minPrice) && product.price < minPrice) return false;
    if (Number.isFinite(minRating) && Number(product.rating || 0) < minRating) return false;
    if (tags.length) {
      const searchable = [product.name, product.brand, ...productCategories, product.description].join(" ").toLowerCase();
      if (!tags.some(tag => searchable.includes(String(tag).toLowerCase()))) return false;
    }
    return product.in_stock !== false;
  }

  function filterProducts(filters = {}) {
    const matches = catalog.filter(product => productMatchesFilters(product, filters));
    renderProductResults(matches.slice(0, 12), "Filtered products");
  }

  async function showProductDetail(productId) {
    const product = await resolveProduct(productId);
    if (!product) {
      renderProductResults([], "Product detail");
      return;
    }
    const detailUrl = product.url || (product.handle ? `/product/${product.handle}/` : "");
    if (detailUrl) {
      window.location.href = detailUrl;
      return;
    }
    renderProductResults([product], product.name);
  }

  // --- UI Render Helpers ---
  function updateBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Find header cart button
    const cartButton = document.querySelector('button[aria-label="Open cart"]');
    if (!cartButton) return;

    // Check if inner relative wrapper exists
    const container = cartButton.querySelector("div") || cartButton;
    
    // Add position relative to container
    if (container !== cartButton) {
      container.style.position = "relative";
    } else {
      cartButton.style.position = "relative";
    }

    let badge = container.querySelector(".shopbot-badge");
    if (totalItems > 0) {
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "shopbot-badge";
        container.appendChild(badge);
      }
      badge.textContent = totalItems;
    } else {
      if (badge) {
        badge.remove();
      }
    }
  }

  function renderCartItems() {
    const container = document.getElementById("shopbot-items-container");
    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: rgba(255,255,255,0.4); margin-top: 80px;">
          <span style="font-size: 40px; display: block; margin-bottom: 12px;">🛒</span>
          Your cart is empty.
        </div>
      `;
      const emptyIcon = container.querySelector("span");
      if (emptyIcon) {
        emptyIcon.style.fontSize = "0";
        emptyIcon.innerHTML = `
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="20" r="1.5"></circle>
            <circle cx="18" cy="20" r="1.5"></circle>
            <path d="M2 3h3l2.4 11.5a2 2 0 0 0 2 1.5h7.9a2 2 0 0 0 1.9-1.4L21 8H6"></path>
          </svg>
        `;
      }
      document.getElementById("shopbot-cart-subtotal").textContent = "$0.00";
      document.getElementById("shopbot-cart-total").textContent = "$0.00";
      return;
    }

    let html = "";
    let subtotal = 0;

    cart.forEach(item => {
      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;

      html += `
        <div class="shopbot-cart-item" data-id="${escapeHtml(item.id)}">
          <img src="${escapeHtml(item.image_url || 'https://demo.vercel.store/placeholder.png')}" alt="${escapeHtml(item.name)}">
          <div class="shopbot-cart-item-details">
            <h4 class="shopbot-cart-item-title">${escapeHtml(item.name)}</h4>
            <p class="shopbot-cart-item-price">$${item.price.toFixed(2)} USD</p>
            <div class="shopbot-cart-item-controls">
              <button class="shopbot-qty-btn decrease" data-id="${escapeHtml(item.id)}">-</button>
              <span class="shopbot-qty-val">${item.quantity}</span>
              <button class="shopbot-qty-btn increase" data-id="${escapeHtml(item.id)}">+</button>
              <button class="shopbot-item-remove" data-id="${escapeHtml(item.id)}">Remove</button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Subtotal and Total
    document.getElementById("shopbot-cart-subtotal").textContent = `$${subtotal.toFixed(2)} USD`;
    document.getElementById("shopbot-cart-total").textContent = `$${subtotal.toFixed(2)} USD`;

    // Hook buttons
    container.querySelectorAll(".shopbot-qty-btn.decrease").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const item = cart.find(i => i.id === id);
        if (item) updateQuantity(id, item.quantity - 1);
      });
    });

    container.querySelectorAll(".shopbot-qty-btn.increase").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const item = cart.find(i => i.id === id);
        if (item) updateQuantity(id, item.quantity + 1);
      });
    });

    container.querySelectorAll(".shopbot-item-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        removeItem(id);
      });
    });
  }

  // --- Storefront Integration ---
  function hookStorefrontElements() {
    // 1. Hook Header Cart Button Click
    const cartButton = document.querySelector('button[aria-label="Open cart"]');
    if (cartButton) {
      // Create clone or override to prevent Next.js default navigation/action
      const clone = cartButton.cloneNode(true);
      cartButton.parentNode.replaceChild(clone, cartButton);
      clone.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCart();
      });
    }

    // 2. Hook Product Page "Add to Cart" Button
    if (window.location.pathname.includes("/product/")) {
      const match = window.location.pathname.split("/").filter(Boolean);
      const handle = match.pop();

      // Find "Add to Cart" buttons
      const buttons = Array.from(document.querySelectorAll("button"));
      const addToCartBtn = buttons.find(btn => 
        btn.textContent.toLowerCase().includes("add to cart") || 
        btn.textContent.toLowerCase().includes("add to bag")
      );

      if (addToCartBtn) {
        // Enable the button (since hydration is broken and leaves it disabled)
        addToCartBtn.removeAttribute("disabled");
        addToCartBtn.style.opacity = "1";
        addToCartBtn.style.cursor = "pointer";

        // Find the styling variables or force active styles
        addToCartBtn.style.backgroundColor = "#155dfc";
        addToCartBtn.style.color = "white";

        // Hook Click
        const clone = addToCartBtn.cloneNode(true);
        addToCartBtn.parentNode.replaceChild(clone, addToCartBtn);
        
        clone.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          await addItem(handle, 1);
          openCart();
        });
      }
    }
  }

  // --- Init ---
  function init() {
    injectDOM();
    loadCart();
    fetchCatalog().then(() => {
      // Initial hook once catalog is available
      hookStorefrontElements();
      
      // Periodically check/hook elements (covers dynamic SPA routing if it occurs)
      setInterval(hookStorefrontElements, 1500);
    });

    // --- Global APIs for Voice Widget & Host ---
    window.ShopCart = {
      items: () => cart,
      open: openCart,
      close: closeCart,
      addItem: async (productId, qty) => {
        await addItem(productId, qty);
        openCart();
      },
      removeItem: removeItem,
      clear: clearCart,
      updateQuantity: updateQuantity,
      showProducts,
      showComparison,
      filterProducts,
      showProductDetail,
      checkout: runSimulatedCheckout
    };

    // Override or setup ShopBot Config hooks
    window.ShopBotConfig = window.ShopBotConfig || {};
    window.ShopBotConfig.apiUrl = window.ShopBotConfig.apiUrl || getShopbotApiBase();
    window.ShopBotConfig.siteId = window.ShopBotConfig.siteId || getShopbotSiteId();
    window.ShopBotConfig.onAddToCart = async (productId, quantity) => {
      console.log("[ShopCart] Voice assistant requested AddToCart:", productId, quantity);
      await addItem(productId, Number(quantity) || 1);
      openCart();
    };
    window.ShopBotConfig.onFilter = (params = {}) => {
      filterProducts(params);
    };

    // Setup voice actions event listener fallback
    window.addEventListener("shopbot:action", async (e) => {
      const action = e.detail;
      const params = action.params || action.parameters || {};
      if (action.action === "ADD_TO_CART") {
        const pid = params.product_id;
        const qty = Number(params.quantity) || 1;
        if (pid) {
          await addItem(pid, qty);
          openCart();
        }
      } else if (action.action === "SHOW_PRODUCTS") {
        await showProducts(params.product_ids || [], params.search_query || "Recommended products");
      } else if (action.action === "SHOW_COMPARISON") {
        await showComparison(params.product_ids || []);
      } else if (action.action === "FILTER_PRODUCTS") {
        filterProducts(params);
      } else if (action.action === "SHOW_PRODUCT_DETAIL") {
        await showProductDetail(params.product_id);
      } else if (action.action === "SORT_PRODUCTS") {
        const sortBy = params.sort_by;
        const sorted = [...(activeResults.length ? activeResults : catalog)];
        sorted.sort((a, b) => {
          if (sortBy === "price_asc") return a.price - b.price;
          if (sortBy === "price_desc") return b.price - a.price;
          return String(a.name).localeCompare(String(b.name));
        });
        renderProductResults(sorted.slice(0, 12), "Sorted products");
      } else if (action.action === "CLEAR_CART") {
        clearCart();
      } else if (action.action === "NAVIGATE_TO" && (params.page === "cart" || params.page === "/cart")) {
        openCart();
      } else if (action.action === "CHECKOUT") {
        runSimulatedCheckout(params);
      }
    });
  }

  // Run on load
  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
