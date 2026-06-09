import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";

const SOURCE_URL = new URL(process.env.SOURCE_URL || "https://demo.vercel.store/");
const OUT_DIR = path.resolve(process.env.MIRROR_DIR || "out");
const MAX_PAGES = Number(process.env.MAX_PAGES || 80);
const MAX_ASSETS = Number(process.env.MAX_ASSETS || 300);
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY || 6);
const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 20000);
const USER_AGENT = process.env.USER_AGENT || "vercel-static-mirror/1.0";

const pageQueue = [SOURCE_URL.href];
const seenPages = new Set();
const seenAssets = new Map();
const pageLimit = pLimit(CONCURRENCY);
const assetLimit = pLimit(CONCURRENCY);

let assetCount = 0;

await fs.rm(OUT_DIR, { recursive: true, force: true });
await fs.mkdir(OUT_DIR, { recursive: true });

while (pageQueue.length && seenPages.size < MAX_PAGES) {
  const batch = [];

  while (pageQueue.length && batch.length < CONCURRENCY && seenPages.size + batch.length < MAX_PAGES) {
    const nextUrl = normalizeUrl(pageQueue.shift());
    if (!nextUrl || seenPages.has(nextUrl) || !isSameHost(nextUrl)) continue;

    seenPages.add(nextUrl);
    batch.push(pageLimit(() => crawlPage(nextUrl)));
  }

  const results = await Promise.allSettled(batch);
  for (const result of results) {
    if (result.status !== "fulfilled") {
      console.error(result.reason?.message || result.reason);
      continue;
    }

    for (const link of result.value) {
      if (!seenPages.has(link) && pageQueue.length < MAX_PAGES * 3) {
        pageQueue.push(link);
      }
    }
  }
}

await writeFallbackIndex();
console.log(`Static mirror complete: ${seenPages.size} pages, ${assetCount} assets.`);

async function crawlPage(pageUrl) {
  const response = await axios.get(pageUrl, {
    timeout: TIMEOUT_MS,
    maxRedirects: 4,
    responseType: "text",
    validateStatus: () => true,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,*/*"
    }
  });

  const contentType = String(response.headers["content-type"] || "").toLowerCase();
  if (response.status >= 400 || !contentType.includes("text/html")) {
    return [];
  }

  const $ = cheerio.load(String(response.data), { decodeEntities: false });
  const links = [];
  const assetTasks = [];

  $("a[href], form[action]").each((_, element) => {
    const attr = element.name === "form" ? "action" : "href";
    const raw = $(element).attr(attr);
    const resolved = resolveSameHost(raw, pageUrl);
    if (!resolved) return;

    links.push(resolved);
    $(element).attr(attr, prettyRoute(resolved));
  });

  $("img[src], script[src], link[href], source[src], video[src], audio[src]").each((_, element) => {
    const attr = $(element).attr("src") ? "src" : "href";
    const raw = $(element).attr(attr);
    const resolved = resolveSameHost(raw, pageUrl);
    if (!resolved) return;

    assetTasks.push(
      cacheAsset(resolved).then((localPath) => {
        if (localPath) $(element).attr(attr, localPath);
      })
    );
  });

  await Promise.allSettled(assetTasks);

  const html = $.html();
  await writeText(pagePath(pageUrl), html);
  return [...new Set(links)];
}

async function cacheAsset(assetUrl) {
  const normalized = normalizeUrl(assetUrl);
  if (!normalized || !isSameHost(normalized)) return null;

  if (seenAssets.has(normalized)) {
    return seenAssets.get(normalized);
  }

  if (assetCount >= MAX_ASSETS) {
    return null;
  }

  assetCount += 1;
  seenAssets.set(normalized, null);

  return assetLimit(async () => {
    const response = await axios.get(normalized, {
      timeout: TIMEOUT_MS,
      maxRedirects: 3,
      responseType: "arraybuffer",
      validateStatus: () => true,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*"
      }
    });

    if (response.status >= 400) return null;

    const contentType = String(response.headers["content-type"] || "");
    const localPath = assetPath(normalized, contentType);
    await writeBinary(localPath, Buffer.from(response.data));

    const publicPath = `/${localPath}`;
    seenAssets.set(normalized, publicPath);
    return publicPath;
  });
}

async function writeFallbackIndex() {
  const indexPath = path.join(OUT_DIR, "index.html");
  try {
    await fs.access(indexPath);
  } catch {
    await writeText(
      "index.html",
      "<!doctype html><html><head><meta charset=\"utf-8\"><title>Clone</title></head><body><h1>Clone build finished without a homepage.</h1></body></html>"
    );
  }
}

function normalizeUrl(raw) {
  try {
    const url = new URL(raw, SOURCE_URL);
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function resolveSameHost(raw, base) {
  if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) {
    return null;
  }

  try {
    const resolved = normalizeUrl(new URL(raw, base).href);
    return resolved && isSameHost(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

function isSameHost(urlString) {
  try {
    return new URL(urlString).hostname === SOURCE_URL.hostname;
  } catch {
    return false;
  }
}

function pagePath(urlString) {
  const url = new URL(urlString);
  let pathname = url.pathname;
  if (!pathname || pathname === "/") return "index.html";
  if (pathname.endsWith("/")) return `${pathname.slice(1)}index.html`;
  if (!path.extname(pathname)) return `${pathname.slice(1)}/index.html`;
  return pathname.slice(1);
}

function prettyRoute(urlString) {
  const route = "/" + pagePath(urlString).replace(/\\/g, "/");
  return route.replace(/\/index\.html$/, "/");
}

function assetPath(urlString, contentType) {
  const url = new URL(urlString);
  const ext = path.extname(url.pathname) || contentTypeExtension(contentType);
  const cleanName = url.pathname.replace(/[^a-z0-9._-]/gi, "_").replace(/^_+|_+$/g, "") || "asset";
  const hash = crypto.createHash("sha1").update(urlString).digest("hex").slice(0, 10);
  return `assets/${cleanName}_${hash}${ext}`;
}

function contentTypeExtension(contentType) {
  if (contentType.includes("javascript")) return ".js";
  if (contentType.includes("css")) return ".css";
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("woff2")) return ".woff2";
  if (contentType.includes("woff")) return ".woff";
  return ".bin";
}

async function writeText(localPath, content) {
  const fullPath = path.join(OUT_DIR, localPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf8");
}

async function writeBinary(localPath, content) {
  const fullPath = path.join(OUT_DIR, localPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content);
}
