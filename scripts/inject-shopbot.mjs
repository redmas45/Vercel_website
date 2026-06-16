/**
 * inject-shopbot.mjs
 *
 * Optionally injects the AI Salesman shopbot <script> tag into every HTML file under out/.
 *
 * Usage:
 *   SHOPBOT_SCRIPT_SRC=/shopbot.js?site=ai_kart_main node scripts/inject-shopbot.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "out");
const SITE_ID = "ai_kart_main";
const SCRIPT_SRC = (process.env.SHOPBOT_SCRIPT_SRC || `/shopbot.js?site=${SITE_ID}`).trim();
const USER_SCRIPT = `<script defer src="${SCRIPT_SRC}" data-site-id="${SITE_ID}"></script>`;
const SHOPBOT_SCRIPT_RE = /<script\b[^>]*\bsrc=(['"])[^'"]*\/shopbot\.js(?:\?[^'"]*)?\1[^>]*>\s*<\/script>\s*/gi;

function stripGeneratedShopbot(html) {
  return html
    .replace(/<script\b(?=[^>]*\bdata-api-url=)(?=[^>]*\bdata-site-id=)[\s\S]*?<\/script>\s*/g, "")
    .replace(/<script>\s*console\.warn\("Voice orb widget disabled:[\s\S]*?<\/script>\s*/g, "");
}

function injectUserShopbot(html) {
  if (html.includes(USER_SCRIPT)) {
    return html;
  }
  if (html.includes("</head>")) {
    return html.replace("</head>", `</head>\n${USER_SCRIPT}`);
  } else if (html.includes("<head>")) {
    return html.replace("<head>", `<head>\n${USER_SCRIPT}`);
  } else {
    return `${html}\n${USER_SCRIPT}`;
  }
}

function walkHtml(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walkHtml(full));
    } else if (entry.endsWith(".html")) {
      results.push(full);
    }
  }
  return results;
}

function scrubShopbotInjection() {
  const htmlFiles = walkHtml(OUT_DIR);
  let changed = 0;
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf-8");
    let next = stripGeneratedShopbot(html);
    if (!SHOPBOT_SCRIPT_RE.test(next)) {
      next = injectUserShopbot(next);
    }
    SHOPBOT_SCRIPT_RE.lastIndex = 0;
    if (next !== html) {
      writeFileSync(file, next, "utf-8");
      changed++;
    }
  }
  console.log(`[inject-shopbot] Shopbot script ensured/injected in ${changed} files.`);
}

// Always run the injection script to ensure the user's hardcoded script tag is present on all static files
scrubShopbotInjection();
process.exit(0);
