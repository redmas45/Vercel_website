(function () {
  // --- Cart State Management ---
  const CART_KEY = "shopbot_cart";
  let cart = [];
  let catalog = [];

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
      catalog = data.products || [];
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
        <h3 class="shopbot-modal-title">Checkout Successful!</h3>
        <p class="shopbot-modal-desc">Thank you for your order! Your simulated purchase has been completed, and your cart is now empty.</p>
        <button class="shopbot-modal-ok-btn">Awesome</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".shopbot-modal-ok-btn").addEventListener("click", () => {
      modal.classList.remove("active");
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

  function runSimulatedCheckout() {
    if (cart.length === 0) return;
    closeCart();
    cart = [];
    saveCart();
    
    // Open success modal
    document.getElementById("shopbot-checkout-modal").classList.add("active");
  }

  // --- Cart Mutators ---
  function addItem(productId, quantity = 1) {
    const existing = cart.find(item => item.id === productId);
    if (existing) {
      existing.quantity += quantity;
      saveCart();
      return;
    }

    // Find in catalog
    const product = catalog.find(p => String(p.id) === String(productId) || p.handle === productId);
    if (product) {
      cart.push({
        id: String(product.id),
        name: product.name || product.title,
        price: product.price,
        image_url: product.image_url,
        quantity: quantity
      });
      saveCart();
    } else {
      console.warn(`[ShopCart] Product ${productId} not found in catalog cache`);
    }
  }

  function updateQuantity(productId, quantity) {
    const idx = cart.findIndex(item => item.id === productId);
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
    cart = cart.filter(item => item.id !== productId);
    saveCart();
  }

  function clearCart() {
    cart = [];
    saveCart();
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
        <div class="shopbot-cart-item" data-id="${item.id}">
          <img src="${item.image_url || 'https://demo.vercel.store/placeholder.png'}" alt="${item.name}">
          <div class="shopbot-cart-item-details">
            <h4 class="shopbot-cart-item-title">${item.name}</h4>
            <p class="shopbot-cart-item-price">$${item.price.toFixed(2)} USD</p>
            <div class="shopbot-cart-item-controls">
              <button class="shopbot-qty-btn decrease" data-id="${item.id}">-</button>
              <span class="shopbot-qty-val">${item.quantity}</span>
              <button class="shopbot-qty-btn increase" data-id="${item.id}">+</button>
              <button class="shopbot-item-remove" data-id="${item.id}">Remove</button>
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
        
        clone.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          addItem(handle, 1);
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
      addItem: (productId, qty) => {
        addItem(productId, qty);
        openCart();
      },
      removeItem: removeItem,
      clear: clearCart,
      updateQuantity: updateQuantity
    };

    // Override or setup ShopBot Config hooks
    window.ShopBotConfig = window.ShopBotConfig || {};
    window.ShopBotConfig.onAddToCart = (productId, quantity) => {
      console.log("[ShopCart] Voice assistant requested AddToCart:", productId, quantity);
      addItem(productId, Number(quantity) || 1);
      openCart();
    };

    // Setup voice actions event listener fallback
    window.addEventListener("shopbot:action", (e) => {
      const action = e.detail;
      if (action.action === "ADD_TO_CART") {
        const pid = action.parameters?.product_id;
        const qty = Number(action.parameters?.quantity) || 1;
        if (pid) {
          addItem(pid, qty);
          openCart();
        }
      } else if (action.action === "CLEAR_CART") {
        clearCart();
      } else if (action.action === "NAVIGATE_TO" && (action.parameters?.page === "cart" || action.parameters?.page === "/cart")) {
        openCart();
      } else if (action.action === "CHECKOUT") {
        runSimulatedCheckout();
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
