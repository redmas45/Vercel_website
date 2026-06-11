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

function isDeployableApiUrl(raw) {
  try {
    const parsed = new URL((raw || "").trim());
    const host = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === "https:" &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      host !== "0.0.0.0" &&
      host !== "::1"
    );
  } catch (_err) {
    return false;
  }
}

function isPlaceholderUrl(url) {
  return url === "https://placeholder.ngrok-free.app";
}

function isLocalhostUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
  } catch (_err) {
    return false;
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

const apiUrl = resolveApiUrl();

// Handle placeholder URL case
if (isPlaceholderUrl(apiUrl)) {
  console.log(
    "[inject-shopbot] WARNING: Using placeholder URL - voice orb widget will NOT be injected.\n" +
    "[inject-shopbot] Site will deploy without voice functionality.\n" +
    "[inject-shopbot] To enable voice orb, start backend with ngrok and update SHOPBOT_API_URL."
  );
  
  // Inject a stub script that logs warning to console
  const stubScript = `<script>
    console.warn("Voice orb widget disabled: ngrok tunnel not available.\\n" +
                 "Start backend with 'python run.py' and update SHOPBOT_API_URL to enable.");
  </script>`;
  
  const htmlFiles = walkHtml(OUT_DIR);
  let injected = 0;
  
  for (const file of htmlFiles) {
    let html = readFileSync(file, "utf-8");
    
    // Remove any previously injected shopbot script tag
    html = html.replace(/<script\s+src="[^"]*\/shopbot\.js[^"]*">\s*<\/script>\s*/g, "");
    html = html.replace(
      /<script\b(?=[^>]*\bdata-api-url=)(?=[^>]*\bdata-site-id=)[\s\S]*?<\/script>\s*/g,
      ""
    );
    
    // Inject stub script right after </head>
    if (html.includes("</head>")) {
      html = html.replace("</head>", `</head>\n${stubScript}`);
    } else if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>\n${stubScript}`);
    } else {
      html += `\n${stubScript}`;
    }
    writeFileSync(file, html, "utf-8");
    injected++;
  }
  
  console.log(`[inject-shopbot] Done. Injected stub warning into ${injected} files.`);
  process.exit(0);
}

// Handle localhost URL case
if (isLocalhostUrl(apiUrl)) {
  console.log(
    "[inject-shopbot] WARNING: Using localhost URL - voice orb widget will NOT work on deployed site.\n" +
    "[inject-shopbot] Site will deploy without voice functionality.\n" +
    "[inject-shopbot] To enable voice orb, start backend with ngrok tunnel."
  );
  
  // Inject a stub script that logs warning to console
  const stubScript = `<script>
    console.warn("Voice orb widget disabled: using localhost URL.\\n" +
                 "Widget will only work locally. Start ngrok tunnel for public access.");
  </script>`;
  
  const htmlFiles = walkHtml(OUT_DIR);
  let injected = 0;
  
  for (const file of htmlFiles) {
    let html = readFileSync(file, "utf-8");
    
    // Remove any previously injected shopbot script tag
    html = html.replace(/<script\s+src="[^"]*\/shopbot\.js[^"]*">\s*<\/script>\s*/g, "");
    html = html.replace(
      /<script\b(?=[^>]*\bdata-api-url=)(?=[^>]*\bdata-site-id=)[\s\S]*?<\/script>\s*/g,
      ""
    );
    
    // Inject stub script right after </head>
    if (html.includes("</head>")) {
      html = html.replace("</head>", `</head>\n${stubScript}`);
    } else if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>\n${stubScript}`);
    } else {
      html += `\n${stubScript}`;
    }
    writeFileSync(file, html, "utf-8");
    injected++;
  }
  
  console.log(`[inject-shopbot] Done. Injected stub warning into ${injected} files.`);
  process.exit(0);
}

// Validate URL is deployable HTTPS
if (!isDeployableApiUrl(apiUrl)) {
  console.error(
    "[inject-shopbot] ERROR: SHOPBOT_API_URL/PUBLIC_API_URL must be a public HTTPS URL.\n" +
      `  Got: ${apiUrl || "(empty)"}\n` +
    "[inject-shopbot] Using stub script for deployment without voice functionality."
  );
  
  // Inject stub script as fallback
  const stubScript = `<script>
    console.warn("Voice orb widget disabled: invalid SHOPBOT_API_URL.\\n" +
                 "Update SHOPBOT_API_URL with a valid ngrok HTTPS URL to enable.");
  </script>`;
  
  const htmlFiles = walkHtml(OUT_DIR);
  let injected = 0;
  
  for (const file of htmlFiles) {
    let html = readFileSync(file, "utf-8");
    
    // Remove any previously injected shopbot script tag
    html = html.replace(/<script\s+src="[^"]*\/shopbot\.js[^"]*">\s*<\/script>\s*/g, "");
    html = html.replace(
      /<script\b(?=[^>]*\bdata-api-url=)(?=[^>]*\bdata-site-id=)[\s\S]*?<\/script>\s*/g,
      ""
    );
    
    // Inject stub script right after </head>
    if (html.includes("</head>")) {
      html = html.replace("</head>", `</head>\n${stubScript}`);
    } else if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>\n${stubScript}`);
    } else {
      html += `\n${stubScript}`;
    }
    writeFileSync(file, html, "utf-8");
    injected++;
  }
  
  console.log(`[inject-shopbot] Done. Injected stub warning into ${injected} files.`);
  process.exit(0);
}

console.log(`[inject-shopbot] Fetching shopbot.js from ${apiUrl}...`);
let shopbotCode = "";
try {
  // Use AbortSignal.timeout to prevent hanging if the endpoint is completely unresponsive
  const res = await fetch(`${apiUrl}/shopbot.js?site=${SITE_ID}`, {
    headers: { "ngrok-skip-browser-warning": "1" },
    signal: AbortSignal.timeout(6000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  shopbotCode = await res.text();
} catch (err) {
  console.warn(
    `[inject-shopbot] WARNING: Failed to fetch shopbot.js from ${apiUrl}: ${err.message}\n` +
    `[inject-shopbot] Falling back to stub script to allow build to succeed.`
  );

  // Inject stub script warning
  const stubScript = `<script>
    console.warn("Voice orb widget disabled: failed to fetch shopbot.js from ${apiUrl}.\\n" +
                 "Ensure backend is running and reachable to use the voice orb widget.");
  </script>`;

  const htmlFiles = walkHtml(OUT_DIR);
  let injected = 0;

  for (const file of htmlFiles) {
    let html = readFileSync(file, "utf-8");
    html = html.replace(/<script\s+src="[^"]*\/shopbot\.js[^"]*">\s*<\/script>\s*/g, "");
    html = html.replace(
      /<script\b(?=[^>]*\bdata-api-url=)(?=[^>]*\bdata-site-id=)[\s\S]*?<\/script>\s*/g,
      ""
    );
    if (html.includes("</head>")) {
      html = html.replace("</head>", `</head>\n${stubScript}`);
    } else if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>\n${stubScript}`);
    } else {
      html += `\n${stubScript}`;
    }
    writeFileSync(file, html, "utf-8");
    injected++;
  }

  console.log(`[inject-shopbot] Done. Injected stub warning into ${injected} files.`);
  process.exit(0);
}

if (!shopbotCode.includes("voice-orb") || shopbotCode.includes("Visit Site to continue")) {
  console.error("[inject-shopbot] ERROR: fetched shopbot.js does not look like the widget code.");
  process.exit(1);
}

const scriptTag = `<script data-api-url="${apiUrl}" data-site-id="${SITE_ID}">${shopbotCode}</script>`;
console.log("[inject-shopbot] Successfully fetched and inlined shopbot.js");

const htmlFiles = walkHtml(OUT_DIR);
let injected = 0;
let skipped = 0;

for (const file of htmlFiles) {
  let html = readFileSync(file, "utf-8");

  // Remove any previously injected shopbot script tag
  html = html.replace(/<script\s+src="[^"]*\/shopbot\.js[^"]*">\s*<\/script>\s*/g, "");
  html = html.replace(
    /<script\b(?=[^>]*\bdata-api-url=)(?=[^>]*\bdata-site-id=)[\s\S]*?<\/script>\s*/g,
    ""
  );

  // Inject right after </head>
  if (html.includes("</head>")) {
    html = html.replace("</head>", `</head>\n${scriptTag}`);
  } else if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>\n${scriptTag}`);
  } else {
    // If all else fails, append to end of file
    html += `\n${scriptTag}`;
  }
  writeFileSync(file, html, "utf-8");
  injected++;
}

console.log(
  `[inject-shopbot] Done. Injected into ${injected} files, skipped ${skipped}.`
);
