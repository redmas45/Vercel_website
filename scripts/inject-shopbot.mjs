/**
 * inject-shopbot.mjs
 *
 * Injects the AI Salesman shopbot <script> tag into every HTML file under out/.
 *
 * Usage:
 *   SHOPBOT_API_URL=https://xxxx.ngrok-free.app  node scripts/inject-shopbot.mjs
 *
 * If SHOPBOT_API_URL is not set, the script reads PUBLIC_API_URL from
 * ../AI_salesman_plugin/.env automatically.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "out");
const SITE_ID = "https_demo_vercel_store";

function readEnvValue(envPath, key) {
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const k = trimmed.slice(0, eqIdx).trim();
      if (k === key) {
        return trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch (_err) {
    // File not found — fine.
  }
  return "";
}

function resolveApiUrl() {
  if (process.env.SHOPBOT_API_URL) {
    return process.env.SHOPBOT_API_URL.trim().replace(/\/+$/, "");
  }
  // Fallback: read from AI_salesman_plugin .env
  const pluginEnv = resolve(__dirname, "..", "..", "AI_salesman_plugin", ".env");
  const url = readEnvValue(pluginEnv, "PUBLIC_API_URL");
  if (url) return url.replace(/\/+$/, "");
  return "";
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

const apiUrl = resolveApiUrl();
if (!apiUrl) {
  console.warn(
    "[inject-shopbot] SKIP: No API URL found.\n" +
      "  Set SHOPBOT_API_URL env var, or make sure AI_salesman_plugin/.env has PUBLIC_API_URL.\n" +
      "  Skipping injection (build will succeed without it)."
  );
  process.exit(0);
}

const scriptTag = `<script src="${apiUrl}/shopbot.js?site=${SITE_ID}"></script>`;
console.log(`[inject-shopbot] Using script tag:\n  ${scriptTag}\n`);

const htmlFiles = walkHtml(OUT_DIR);
let injected = 0;
let skipped = 0;

for (const file of htmlFiles) {
  let html = readFileSync(file, "utf-8");

  // Remove any previously injected shopbot script tag
  html = html.replace(/<script\s+src="[^"]*\/shopbot\.js[^"]*">\s*<\/script>\s*/g, "");

  // Inject right before </body>
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${scriptTag}\n</body>`);
    writeFileSync(file, html, "utf-8");
    injected++;
  } else {
    console.warn(`[inject-shopbot] WARN: No </body> in ${file}`);
    skipped++;
  }
}

console.log(
  `[inject-shopbot] Done. Injected into ${injected} files, skipped ${skipped}.`
);
