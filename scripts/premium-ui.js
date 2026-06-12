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

  function applyThemeMode() {
    if (window.location.pathname.startsWith("/product/")) {
      document.documentElement.classList.add("dark");
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
        </span>
      `;
    }

    const searchInput = nav.querySelector('input[name="q"], form input');
    const searchForm = searchInput ? searchInput.closest("form") : null;

    if (searchInput) {
      searchInput.setAttribute("placeholder", "Search the collection");
    }

    if (searchForm && searchInput) {
      searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        dispatchSearchResults(searchInput.value);
      });
    } else if (searchInput) {
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          dispatchSearchResults(searchInput.value);
        }
      });
    }

    // Hide unwanted category links
    const links = nav.querySelectorAll("a");
    links.forEach(link => {
      const text = link.textContent.trim().toLowerCase();
      if (["shirts", "stickers", "shopall", "apparel", "all", "shop all"].includes(text)) {
        link.style.display = "none";
      }
    });
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
          <a href="/support/">Support</a>
          <a href="/frequently-asked-questions/">FAQ</a>
          <a href="/shipping-policy/">Shipping Policy</a>
          <a href="/return-policy/">Return Policy</a>
        </div>
      </div>
    `;
  }

  function ensureAdminLink() {
    if (document.querySelector(".premium-admin-link, a[aria-label='Admin Panel']")) return;

    const link = document.createElement("a");
    link.className = "premium-admin-link";
    link.href = "/admin";
    link.setAttribute("aria-label", "Admin Panel");
    link.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"></path>
        <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.16 2.16 0 0 1-3.05 3.05l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21.5a2.16 2.16 0 0 1-4.32 0v-.08a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05a2.16 2.16 0 0 1-3.05-3.05l.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.1H2.87a2.16 2.16 0 0 1 0-4.32h.08A1.8 1.8 0 0 0 4.6 8a1.8 1.8 0 0 0-.36-1.98l-.05-.05a2.16 2.16 0 0 1 3.05-3.05l.05.05A1.8 1.8 0 0 0 9.27 3.33a1.8 1.8 0 0 0 1.1-1.65V1.6a2.16 2.16 0 0 1 4.32 0v.08a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.16 2.16 0 0 1 3.05 3.05l-.05.05A1.8 1.8 0 0 0 19.4 8a1.8 1.8 0 0 0 1.65 1.1h.08a2.16 2.16 0 0 1 0 4.32h-.08A1.8 1.8 0 0 0 19.4 15Z"></path>
      </svg>
      <span>Admin</span>
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

  function labelize(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function productCategories(product) {
    return [product.category, ...(Array.isArray(product.categories) ? product.categories : [])]
      .map(item => String(item || "").trim().toLowerCase())
      .filter(Boolean);
  }

  function sortCatalogProducts(products, sortBy) {
    const sorted = [...products];
    sorted.sort((a, b) => {
      if (sortBy === "price_asc") return Number(a.price || 0) - Number(b.price || 0);
      if (sortBy === "price_desc") return Number(b.price || 0) - Number(a.price || 0);
      if (sortBy === "latest") return String(b.id || b.handle || "").localeCompare(String(a.id || a.handle || ""));
      if (sortBy === "name") return String(a.name || a.title || "").localeCompare(String(b.name || b.title || ""));
      return 0;
    });
    return sorted;
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

  function searchableProductText(product) {
    return [
      product.name,
      product.title,
      product.brand,
      product.vendor,
      product.description,
      product.category,
      ...(Array.isArray(product.categories) ? product.categories : [])
    ].join(" ").toLowerCase();
  }

  function productMatchesSearch(product, query) {
    const tokens = String(query || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (!tokens.length) return false;
    const searchable = searchableProductText(product);
    return tokens.every(token => searchable.includes(token));
  }

  async function dispatchSearchResults(query) {
    const searchQuery = String(query || "").trim();
    if (!searchQuery) return;

    const url = new URL(window.location.href);
    url.pathname = "/search";
    url.search = "";
    url.searchParams.set("q", searchQuery);
    window.history.pushState({ searchQuery }, "", url);
    await renderLiveCatalog({ query: searchQuery });
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

  async function renderLiveCatalog(options = {}) {
    if (!shouldShowLiveCatalog()) return;

    const searchQuery = String(
      options.query || new URLSearchParams(window.location.search).get("q") || ""
    ).trim();
    const existing = document.querySelector(".premium-live-catalog");
    if (existing?.__premiumRenderCatalog) {
      existing.__premiumSearchQuery = searchQuery;
      existing.__premiumRenderCatalog();
      return;
    }

    const products = await fetchCatalog();
    if (!products.length) return;

    hideStaticCatalog();
    const main = document.querySelector("main");
    if (!main) return;

    const section = document.createElement("section");
    section.className = "premium-live-catalog";
    section.__premiumSearchQuery = searchQuery;
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

    const categories = Array.from(new Set(products.flatMap(productCategories))).sort();
    const toolbar = document.createElement("div");
    toolbar.className = "premium-catalog-toolbar";
    toolbar.setAttribute("aria-label", "Catalog filters");
    toolbar.innerHTML = `
      <div class="premium-category-tabs" role="tablist" aria-label="Collections">
        <button type="button" class="active" data-category="all">All</button>
        ${categories.map(category => `<button type="button" data-category="${escapeHtml(category)}">${escapeHtml(labelize(category))}</button>`).join("")}
      </div>
      <label class="premium-sort-control">
        <span>Sort</span>
        <select data-catalog-sort>
          <option value="relevance">Relevance</option>
          <option value="latest">Latest arrivals</option>
          <option value="price_asc">Price: Low to high</option>
          <option value="price_desc">Price: High to low</option>
          <option value="name">Name</option>
        </select>
      </label>
    `;
    section.querySelector(".premium-live-head")?.insertAdjacentElement("afterend", toolbar);

    const renderGrid = () => {
      const selectedCategory = section.querySelector("[data-category].active")?.getAttribute("data-category") || "all";
      const sortBy = section.querySelector("[data-catalog-sort]")?.value || "relevance";
      const query = String(section.__premiumSearchQuery || "").trim();
      let filtered = query
        ? products.filter(product => productMatchesSearch(product, query))
        : products;
      filtered = selectedCategory === "all"
        ? filtered
        : filtered.filter(product => productCategories(product).includes(selectedCategory));
      const visible = sortCatalogProducts(filtered, sortBy);
      const grid = section.querySelector(".premium-live-grid");
      if (!grid) return;
      const heading = section.querySelector(".premium-live-head h2");
      const count = section.querySelector(".premium-live-head span");
      if (heading) heading.textContent = query ? `Search results for "${query}"` : "Current inventory";
      if (count) count.textContent = `${visible.length} ${visible.length === 1 ? "product" : "products"}`;
      if (!visible.length) {
        grid.innerHTML = `
          <div class="premium-live-empty">
            <h3>No matching products</h3>
            <p>Try a different product name, category, or brand.</p>
          </div>
        `;
        return;
      }
      grid.innerHTML = visible.map(product => {
        const id = product.id || product.handle;
        const handle = product.handle || id;
        const detailUrl = product.url || (handle ? `/product/${handle}/` : "");
        const image = product.image_url || "https://demo.vercel.store/placeholder.png";
        return `
          <article class="premium-live-card" data-product-id="${escapeHtml(id)}" data-detail-url="${escapeHtml(detailUrl)}" tabindex="0" role="link" aria-label="${escapeHtml(product.name || product.title)}">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name || product.title)}">
            <div>
              <h3>${escapeHtml(product.name || product.title)}</h3>
              <p>${escapeHtml(product.brand || product.vendor || PRODUCT_BRAND)} - ${escapeHtml(labelize(product.category || "products"))}</p>
            </div>
            <div class="premium-live-card-foot">
              <strong>$${Number(product.price || 0).toFixed(2)}</strong>
              <button type="button" data-add-product="${escapeHtml(id)}">Add</button>
            </div>
          </article>
        `;
      }).join("");

      grid.querySelectorAll("[data-add-product]").forEach(button => {
        button.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
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

      grid.querySelectorAll("[data-detail-url]").forEach(card => {
        const open = () => {
          const detailUrl = card.getAttribute("data-detail-url");
          if (detailUrl) window.location.href = detailUrl;
        };
        card.addEventListener("click", open);
        card.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
          }
        });
      });
    };

    toolbar.querySelectorAll("[data-category]").forEach(button => {
      button.addEventListener("click", () => {
        toolbar.querySelectorAll("[data-category]").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        renderGrid();
      });
    });
    toolbar.querySelector("[data-catalog-sort]")?.addEventListener("change", renderGrid);
    section.__premiumRenderCatalog = renderGrid;
    renderGrid();
  }

  function run() {
    applyThemeMode();
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

  function applyStaticSearchFilter() {
    const isSearchPage = window.location.pathname.startsWith("/search");
    if (!isSearchPage) return;

    // 1. Hide sidebars
    const sidebars = document.querySelectorAll(".order-first, .order-none.md\\:order-last");
    sidebars.forEach(sidebar => {
      if (sidebar) sidebar.style.display = "none";
    });

    // 2. Filter products based on ?q=
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (!q) return;

    const term = q.toLowerCase();
    const products = document.querySelectorAll("ul.grid li");
    products.forEach(product => {
      const text = product.textContent.toLowerCase();
      if (!text.includes(term)) {
        product.style.display = "none";
      } else {
        product.style.display = "";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyStaticSearchFilter);
  } else {
    applyStaticSearchFilter();
  }
})();
