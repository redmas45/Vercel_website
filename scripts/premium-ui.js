(function () {
  const BRAND_NAME = "AI-KART";
  const PRODUCT_BRAND = "NOVA";
  const FOOTER_YEAR = "2026";

  function replaceCopy(value) {
    return String(value || "")
      .replace(/Acme Store/g, BRAND_NAME)
      .replace(/ACME, Inc\./g, `${BRAND_NAME} Labs`)
      .replace(/\bACME\b/g, BRAND_NAME)
      .replace(/\bAcme\b/g, PRODUCT_BRAND)
      .replace(/Created by\s+.*?Vercel/g, `Built for ${BRAND_NAME}`)
      .replace(/View the source/g, "Customer Care")
      .replace(/Deploy/g, "Studio");
  }

  function replaceTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const next = replaceCopy(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  function updateAttributes() {
    document.title = replaceCopy(document.title);
    const attrNames = ["alt", "aria-label", "title", "placeholder", "content"];
    for (const element of document.querySelectorAll("*")) {
      for (const attr of attrNames) {
        if (!element.hasAttribute(attr)) continue;
        const current = element.getAttribute(attr);
        const next = replaceCopy(current);
        if (next !== current) element.setAttribute(attr, next);
      }
    }

    for (const input of document.querySelectorAll("input")) {
      if (!input.getAttribute("placeholder")) {
        input.setAttribute("placeholder", "Search products...");
      }
    }
  }

  function updateNav() {
    const nav = document.querySelector("nav");
    if (!nav || nav.dataset.premiumReady === "true") return;
    nav.dataset.premiumReady = "true";

    const homeLink = nav.querySelector('a[href="/"]');
    if (homeLink) {
      homeLink.className = "premium-brand";
      homeLink.innerHTML = `
        <span class="premium-brand-mark">AK</span>
        <span class="premium-brand-copy">
          <span class="premium-brand-name">${BRAND_NAME}</span>
          <span class="premium-brand-note">Curated Commerce</span>
        </span>
      `;
    }

    const searchInput = nav.querySelector('input[name="q"], form input');
    if (searchInput) {
      searchInput.setAttribute("placeholder", "Search the collection");
    }
  }

  function addMasthead() {
    if (document.querySelector(".premium-masthead")) return;
    if (window.location.pathname !== "/" && window.location.pathname !== "/index.html") return;

    const main = document.querySelector("main");
    if (!main) return;

    const section = document.createElement("section");
    section.className = "premium-masthead";
    section.innerHTML = `
      <div class="premium-masthead-inner">
        <div>
          <p class="premium-kicker">New Collection</p>
          <h1 class="premium-title">Refined essentials for everyday shopping.</h1>
          <p class="premium-copy">A focused storefront for apparel, desk gear, accessories, and home goods.</p>
        </div>
        <div class="premium-stats" aria-label="Store highlights">
          <div class="premium-stat"><strong>19</strong><span>Active products</span></div>
          <div class="premium-stat"><strong>5</strong><span>Collections</span></div>
          <div class="premium-stat"><strong>24h</strong><span>Order window</span></div>
        </div>
      </div>
    `;
    main.prepend(section);
  }

  function decorateProducts() {
    for (const link of document.querySelectorAll('a[href^="/product/"]')) {
      const card = link.firstElementChild;
      if (card) card.dataset.premiumProductCard = "true";

      const label = link.querySelector(".absolute.bottom-0 .flex.items-center");
      if (label) label.classList.add("premium-product-label");
    }
  }

  function updateFooter() {
    const footer = document.querySelector("footer");
    if (!footer || footer.dataset.premiumReady === "true") return;
    footer.dataset.premiumReady = "true";
    footer.innerHTML = `
      <div class="premium-footer-inner">
        <div class="premium-footer-brand">
          <strong>${BRAND_NAME}</strong>
          <span>Copyright ${FOOTER_YEAR} ${BRAND_NAME} Labs. All rights reserved.</span>
        </div>
        <div class="premium-footer-links">
          <a href="/search/">Shop All</a>
          <a href="/frequently-asked-questions/">Support</a>
          <a href="/shipping-return-policy/">Shipping</a>
          <a href="/privacy-policy/">Privacy</a>
        </div>
      </div>
    `;
  }

  function ensureAdminLink() {
    if (document.querySelector('a[aria-label="Admin Panel"]')) return;

    const link = document.createElement("a");
    link.href = "/admin";
    link.title = "Admin Panel";
    link.setAttribute("aria-label", "Admin Panel");
    link.className = "premium-admin-link";
    link.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
    document.body.appendChild(link);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function fetchCatalog() {
    try {
      const response = await fetch("/api/products.json", { cache: "no-store" });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.products) ? data.products.filter(product => product.in_stock !== false) : [];
    } catch (_error) {
      return [];
    }
  }

  function shouldShowLiveCatalog() {
    const path = window.location.pathname;
    return path === "/" || path === "/index.html" || path.startsWith("/search");
  }

  function hideStaticCatalog() {
    for (const link of document.querySelectorAll('a[href^="/product/"]')) {
      const wrapper = link.closest("li") || link;
      wrapper.dataset.premiumStaticProduct = "hidden";
      wrapper.style.display = "none";
    }
  }

  async function renderLiveCatalog() {
    if (!shouldShowLiveCatalog()) return;
    if (document.querySelector(".premium-live-catalog")) return;

    const products = await fetchCatalog();
    if (!products.length) return;

    hideStaticCatalog();
    const main = document.querySelector("main");
    if (!main) return;

    const section = document.createElement("section");
    section.className = "premium-live-catalog";
    section.innerHTML = `
      <div class="premium-live-head">
        <div>
          <p class="premium-kicker">Live Catalog</p>
          <h2>Current inventory</h2>
        </div>
        <span>${products.length} products</span>
      </div>
      <div class="premium-live-grid">
        ${products.map(product => {
          const id = product.id || product.handle;
          const image = product.image_url || "https://demo.vercel.store/placeholder.png";
          return `
            <article class="premium-live-card" data-product-id="${escapeHtml(id)}">
              <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name || product.title)}">
              <div>
                <h3>${escapeHtml(product.name || product.title)}</h3>
                <p>${escapeHtml(product.brand || product.vendor || PRODUCT_BRAND)} · ${escapeHtml(product.category || "products")}</p>
              </div>
              <div class="premium-live-card-foot">
                <strong>$${Number(product.price || 0).toFixed(2)}</strong>
                <button type="button" data-add-product="${escapeHtml(id)}">Add</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;

    const masthead = document.querySelector(".premium-masthead");
    if (masthead?.nextSibling) {
      main.insertBefore(section, masthead.nextSibling);
    } else {
      main.prepend(section);
    }

    section.querySelectorAll("[data-add-product]").forEach(button => {
      button.addEventListener("click", () => {
        const productId = button.getAttribute("data-add-product");
        if (window.ShopCart?.addItem) {
          window.ShopCart.addItem(productId, 1);
        } else {
          window.dispatchEvent(new CustomEvent("shopbot:action", {
            detail: { action: "ADD_TO_CART", parameters: { product_id: productId, quantity: 1 } }
          }));
        }
      });
    });
  }

  function run() {
    document.documentElement.dataset.premiumUi = "true";
    replaceTextNodes(document.body || document.documentElement);
    updateAttributes();
    updateNav();
    addMasthead();
    decorateProducts();
    updateFooter();
    ensureAdminLink();
    renderLiveCatalog();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
