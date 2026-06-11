import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const OUT_DIR = join(ROOT_DIR, "out");
const CSS_SRC = join(__dirname, "premium-ui.css");
const JS_SRC = join(__dirname, "premium-ui.js");
const CSS_DEST = join(OUT_DIR, "premium-ui.css");
const JS_DEST = join(OUT_DIR, "premium-ui.js");
const CATALOG_FILE = join(OUT_DIR, "api", "products.json");

const BRAND_NAME = "AI-KART";
const PRODUCT_BRAND = "NOVA";

function walk(dir, predicate) {
  const results = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walk(full, predicate));
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

function replaceCopy(value) {
  return String(value || "")
    .replace(/Acme Store/g, BRAND_NAME)
    .replace(/ACME, Inc\./g, `${BRAND_NAME} Labs`)
    .replace(/\bACME\b/g, BRAND_NAME)
    .replace(/\bAcme\b/g, PRODUCT_BRAND)
    .replace(/High-performance ecommerce store built with Next\.js, Vercel, and Shopify\./g, "Premium AI assisted shopping experience.")
    .replace(/Created by\s+.*?Vercel/g, `Built for ${BRAND_NAME}`)
    .replace(/View the source/g, "Customer Care")
    .replace(/Deploy/g, "Studio");
}

function stripPreviousPremiumAssets(html) {
  return html
    .replace(/<link\s+rel="stylesheet"\s+href="\/premium-ui\.css">\s*/g, "")
    .replace(/<script\s+src="\/premium-ui\.js">\s*<\/script>\s*/g, "");
}

function stripStaleWidget(html) {
  return html
    .replace(/<script\s+src="[^"]*\/shopbot\.js[^"]*">\s*<\/script>\s*/g, "")
    .replace(/<script\b(?=[^>]*\bdata-api-url=)(?=[^>]*\bdata-site-id=)[\s\S]*?<\/script>\s*/g, "");
}

function injectAssets(html) {
  const styleTag = '<link rel="stylesheet" href="/premium-ui.css">';
  const scriptTag = '<script src="/premium-ui.js"></script>';

  if (html.includes("</head>")) {
    html = html.replace("</head>", `${styleTag}\n</head>`);
  } else {
    html = `${styleTag}\n${html}`;
  }

  if (html.includes("</body>")) {
    html = html.replace("</body>", `${scriptTag}\n</body>`);
  } else {
    html = `${html}\n${scriptTag}`;
  }

  return html;
}

function updateHtmlFiles() {
  const htmlFiles = walk(OUT_DIR, (file) => file.endsWith(".html"));
  let updated = 0;

  for (const file of htmlFiles) {
    let html = readFileSync(file, "utf8");
    html = stripPreviousPremiumAssets(html);
    html = stripStaleWidget(html);
    html = replaceCopy(html);
    html = injectAssets(html);
    writeFileSync(file, html, "utf8");
    updated += 1;
  }

  return updated;
}

function updateCatalog() {
  if (!existsSync(CATALOG_FILE)) return false;

  const catalog = JSON.parse(readFileSync(CATALOG_FILE, "utf8"));
  catalog.brand = BRAND_NAME;
  catalog.display_name = BRAND_NAME;

  for (const product of catalog.products || []) {
    for (const field of ["title", "name", "description"]) {
      if (product[field]) product[field] = replaceCopy(product[field]);
    }
    product.brand = PRODUCT_BRAND;
    product.vendor = PRODUCT_BRAND;
  }

  writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), "utf8");
  return true;
}

function main() {
  if (!existsSync(OUT_DIR)) {
    console.error(`[premium-ui] Missing output directory: ${OUT_DIR}`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  copyFileSync(CSS_SRC, CSS_DEST);
  copyFileSync(JS_SRC, JS_DEST);

  const htmlCount = updateHtmlFiles();
  const catalogUpdated = updateCatalog();

  console.log(`[premium-ui] Applied premium UI to ${htmlCount} HTML files.`);
  console.log(`[premium-ui] Catalog branding ${catalogUpdated ? "updated" : "skipped"}.`);
}

main();
