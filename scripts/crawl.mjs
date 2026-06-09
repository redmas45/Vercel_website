import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import axios from "axios";
import pLimit from "p-limit";
import * as cheerio from "cheerio";
import { Client } from "pg";

dotenv.config();

const SOURCE_URL = new URL(process.env.SOURCE_URL || "https://demo.vercel.store/");
const MIRROR_DIR = path.resolve(process.env.MIRROR_DIR || "out");
const MAX_PAGES = Number(process.env.MAX_PAGES || 200);
const MAX_ASSETS = Number(process.env.MAX_ASSETS || 500);
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY || 6);
const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 20000);
const USER_AGENT = process.env.USER_AGENT || "vercel-lab-crawler/1.0";
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  throw new Error("DATABASE_URL is required in .env");
}

await fs.rm(MIRROR_DIR, { recursive: true, force: true });
await fs.mkdir(MIRROR_DIR, { recursive: true });
await fs.mkdir(path.join(MIRROR_DIR, "assets"), { recursive: true });

const client = new Client({ connectionString: DB_URL });
await client.connect();

await client.query("SELECT 1");

const queue = [SOURCE_URL.href];
const seenPages = new Set();
const seenAssets = new Map();
const pageLimit = pLimit(CONCURRENCY);
const assetLimit = pLimit(CONCURRENCY);

let crawledPages = 0;
let fetchedAssets = 0;

while (queue.length && crawledPages < MAX_PAGES) {
  const batch = [];
  while (batch.length < CONCURRENCY && queue.length) {
    const next = queue.shift();
    if (seenPages.has(next)) continue;
    seenPages.add(next);
    batch.push(pageLimit(() => crawlPage(next)));
  }

  const results = await Promise.allSettled(batch);
  const nextPages = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value?.links?.length) {
      for (const link of result.value.links) {
        if (!seenPages.has(link) && queue.length + nextPages.length < MAX_PAGES * 3) {
          queue.push(link);
        }
      }
    }
    if (result.status === "rejected") {
      console.error("crawl error:", result.reason?.message || result.reason);
    }
  }

  crawledPages += batch.length;
  if (nextPages.length) queue.push(...nextPages);
}

await client.end();
console.log(`Crawling finished. Pages in queue process: ${crawledPages}, assets: ${fetchedAssets}`);

async function crawlPage(url) {
  const pageUrl = normalizeUrl(url);
  if (!pageUrl) return { links: [] };

  let response;
  try {
    response = await axios.get(pageUrl, {
      timeout: TIMEOUT_MS,
      maxRedirects: 4,
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      validateStatus: () => true,
      responseType: "text"
    });
  } catch (err) {
    await upsertPage(
      pageUrl,
      0,
      null,
      null,
      { error: err.message },
      hashUrl(pageUrl),
      mapPageFilePath(pageUrl)
    );
    return { links: [] };
  }

  const status = response.status;
  const contentType = String(response.headers?.["content-type"] || "").toLowerCase();
  const isHtml = status >= 200 && status < 400 && contentType.includes("text/html");
  const body = typeof response.data === "string" ? response.data : "";
  const pageHash = hashUrl(pageUrl);
  const localHtmlPath = mapPageFilePath(pageUrl);

  if (!isHtml) {
    await upsertPage(pageUrl, status, contentType, null, null, pageHash, localHtmlPath);
    return { links: [] };
  }

  const $ = cheerio.load(body);
  const internalLinks = [];

  const processAttribute = async (element, attr, kind) => {
    const raw = $(element).attr(attr);
    if (!raw || raw.startsWith("javascript:") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("#")) {
      return;
    }

    const resolved = resolveUrl(raw, pageUrl);
    if (!resolved) return;
    const isInternal = isSameSite(resolved);
    const isAssetLike = isAssetElement(kind) || isAssetUrl(resolved.pathname, raw);

    if (isInternal && !isAssetLike) {
      internalLinks.push(resolved.href);
      const local = prettyUrlFromPagePath(mapPageFilePath(resolved.href));
      $(element).attr(attr, local);
      return;
    }

    if (isInternal) {
      const local = await cacheAsset(resolved.href);
      if (local) {
        $(element).attr(attr, local);
      }
      return;
    }
  };

  const attributes = [
    ["a", "href"],
    ["img", "src"],
    ["script", "src"],
    ["link", "href"],
    ["source", "src"],
    ["video", "src"],
    ["audio", "src"],
    ["iframe", "src"],
    ["form", "action"]
  ];

  for (const [tag, attr] of attributes) {
    const nodes = $(tag);
    const promises = nodes
      .map((_, el) => processAttribute(el, attr, tag))
      .get();
    await Promise.allSettled(promises);
  }

  const rewritten = $.html({ decodeEntities: false });
  await upsertPage(pageUrl, status, contentType, rewritten, {
    "content-length": response.headers["content-length"],
    etag: response.headers["etag"]
  }, pageHash, localHtmlPath);
  await writeTextFile(localHtmlPath, rewritten);

  return { links: dedupe(internalLinks).slice(0, 20) };
}

async function cacheAsset(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  if (seenAssets.has(normalized)) {
    const local = seenAssets.get(normalized);
    return local || null;
  }
  if (fetchedAssets >= MAX_ASSETS) return null;

  seenAssets.set(normalized, null);
  fetchedAssets += 1;

  return await assetLimit(async () => {
    let response;
    try {
      response = await axios.get(normalized, {
        timeout: TIMEOUT_MS,
        maxRedirects: 2,
        headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
        responseType: "arraybuffer",
        validateStatus: () => true
      });
    } catch {
      return null;
    }

    if (response.status >= 400) {
      seenAssets.set(normalized, null);
      return null;
    }

  const contentType = String(response.headers?.["content-type"] || "").toLowerCase();
  const localPath = mapAssetFilePath(normalized, contentType);
    const publicPath = `/${localPath}`;
    seenAssets.set(normalized, publicPath);
    const bytes = Buffer.from(response.data);

    await upsertAsset(normalized, localPath, response.status, contentType, bytes, {
      "content-type": contentType,
      "content-length": response.headers["content-length"]
    });
    await writeBinaryFile(localPath, bytes);

    return publicPath;
  });
}

function mapPageFilePath(urlString) {
  const url = new URL(urlString);
  let pathname = url.pathname || "/";
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  let local = pathname;
  if (local.endsWith("/")) {
    local += "index.html";
  } else if (!path.extname(local)) {
    local += "/index.html";
  }
  local = local.replace(/^\/+/, "");
  return local || "index.html";
}

function prettyUrlFromPagePath(pageFilePath) {
  let value = `/${pageFilePath}`;
  value = value.replace(/\/index\.html$/i, "/");
  value = value.replace(/\.html$/i, "");
  value = value.replace(/\/+/g, "/");
  return value === "//" ? "/" : value;
}

function mapAssetFilePath(urlString, contentType = "") {
  const parsed = new URL(urlString);
  const ext = chooseExtension(parsed.pathname, contentType);
  const safeBase = parsed.pathname.replace(/[^a-z0-9.\-_]/gi, "_").replace(/^_+|_+$/g, "");
  const hash = hashUrl(urlString).slice(0, 10);
  const filename = `${safeBase || "asset"}_${hash}${ext}`;
  return path.join("assets", filename).replace(/\\/g, "/");
}

function chooseExtension(pathname, contentType = "") {
  const parsedExt = path.extname(pathname || "");
  if (parsedExt) return parsedExt;
  if (contentType.includes("javascript")) return ".js";
  if (contentType.includes("text/css")) return ".css";
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/jpeg")) return ".jpg";
  if (contentType.includes("image/gif")) return ".gif";
  if (contentType.includes("image/webp")) return ".webp";
  if (contentType.includes("font/woff2")) return ".woff2";
  if (contentType.includes("font/woff")) return ".woff";
  return ".bin";
}

function isSameSite(urlString) {
  const url = normalizeUrl(urlString);
  if (!url) return false;
  const parsed = new URL(url);
  return parsed.hostname === SOURCE_URL.hostname;
}

function isAssetUrl(pathname, raw) {
  const ext = path.extname(pathname || "").toLowerCase();
  if (!ext) return false;
  return [".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".eot"].includes(ext) ||
    /\.(mp4|mp3|ogg|wav|json)(\?|$)/i.test(raw || "");
}

function isAssetElement(tagName) {
  return ["img", "script", "link", "source", "video", "audio", "iframe"].includes(tagName);
}

function normalizeUrl(raw) {
  try {
    const normalized = new URL(raw, SOURCE_URL);
    normalized.hash = "";
    return normalized.toString();
  } catch {
    return null;
  }
}

function resolveUrl(raw, base) {
  try {
    return new URL(raw, base);
  } catch {
    return null;
  }
}

function hashUrl(value) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

async function writeTextFile(localPath, text) {
  const fullPath = path.join(MIRROR_DIR, localPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, text, "utf8");
}

async function writeBinaryFile(localPath, bytes) {
  const fullPath = path.join(MIRROR_DIR, localPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, bytes);
}

async function upsertPage(url, statusCode, contentType, htmlContent, headers, urlHash, localPath) {
  const query = `
    INSERT INTO clone_pages (
      source_url, local_path, status_code, content_type, html_content, url_hash, response_headers
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    ON CONFLICT (source_url)
    DO UPDATE SET
      local_path = EXCLUDED.local_path,
      status_code = EXCLUDED.status_code,
      content_type = EXCLUDED.content_type,
      html_content = EXCLUDED.html_content,
      response_headers = EXCLUDED.response_headers,
      crawled_at = NOW()
  `;
  await client.query(query, [
    url,
    localPath || mapPageFilePath(url),
    statusCode,
    contentType,
    htmlContent,
    urlHash || hashUrl(url),
    JSON.stringify(headers || {})
  ]);
}

async function upsertAsset(url, localPath, statusCode, contentType, buffer, headers) {
  const query = `
    INSERT INTO clone_assets (
      source_url, local_path, status_code, content_type, binary_content, response_headers
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    ON CONFLICT (source_url)
    DO UPDATE SET
      local_path = EXCLUDED.local_path,
      status_code = EXCLUDED.status_code,
      content_type = EXCLUDED.content_type,
      binary_content = EXCLUDED.binary_content,
      response_headers = EXCLUDED.response_headers,
      fetched_at = NOW()
  `;
  await client.query(query, [
    url,
    localPath,
    statusCode,
    contentType,
    buffer,
    JSON.stringify(headers || {})
  ]);
}

function dedupe(values) {
  return [...new Set(values)];
}
