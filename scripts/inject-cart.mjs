import { readFileSync, writeFileSync, readdirSync, statSync, copyFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const OUT_DIR = join(ROOT_DIR, "out");
const CART_SRC = join(__dirname, "cart.js");
const CART_DEST = join(OUT_DIR, "cart.js");

function walkHtml(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        results.push(...walkHtml(full));
      } else if (entry.endsWith(".html")) {
        results.push(full);
      }
    }
  } catch (err) {
    console.error(`[inject-cart] Error reading directory ${dir}:`, err.message);
  }
  return results;
}

function main() {
  console.log("AI Salesman Cart Injector");
  console.log("-" * 40);

  // 1. Copy cart.js to out/cart.js
  try {
    copyFileSync(CART_SRC, CART_DEST);
    console.log(`[inject-cart] Copied cart.js to ${CART_DEST}`);
  } catch (err) {
    console.error(`[inject-cart] ERROR: Failed to copy cart.js: ${err.message}`);
    process.exit(1);
  }

  // 2. Walk HTML files and inject script reference
  const htmlFiles = walkHtml(OUT_DIR);
  let injected = 0;

  const scriptTag = `<script src="/cart.js"></script>`;

  for (const file of htmlFiles) {
    let html = readFileSync(file, "utf-8");

    // Remove any previously injected cart script tags to prevent duplicates
    html = html.replace(/<script\s+src="\/cart\.js">\s*<\/script>\s*/g, "");

    // Inject cart script right after </head>
    if (html.includes("</head>")) {
      html = html.replace("</head>", `</head>\n${scriptTag}`);
    } else if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>\n${scriptTag}`);
    } else {
      html += `\n${scriptTag}`;
    }

    writeFileSync(file, html, "utf-8");
    injected++;
  }

  console.log(`[inject-cart] Done. Injected cart script tag into ${injected} files.`);
}

main();
