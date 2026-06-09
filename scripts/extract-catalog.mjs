import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "out");
const productDir = path.join(outDir, "product");
const searchDir = path.join(outDir, "search");
const outputDir = path.join(outDir, "api");
const outputFile = path.join(outputDir, "products.json");

const categoryMap = await readCategoryMap();
const products = await readProducts(categoryMap);

const catalog = {
  source: "https://demo.vercel.store/",
  generated_at: new Date().toISOString(),
  count: products.length,
  products
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputFile, JSON.stringify(catalog, null, 2), "utf8");
console.log(`Catalog extracted: ${products.length} products -> out/api/products.json`);

async function readProducts(categoryMap) {
  const entries = await fs.readdir(productDir, { withFileTypes: true });
  const products = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const id = entry.name;
    const file = path.join(productDir, id, "index.html");
    const html = await fs.readFile(file, "utf8");
    const $ = cheerio.load(html);
    const title = cleanText($("h1").first().text()) || titleFromSlug(id);
    const price = extractPrice($("h1").first().parent().text()) || extractPrice($("body").text());
    const description = extractDescription($);
    const imageUrl = extractProductImage($, title);
    const categories = categoryMap.get(id) || [];

    products.push({
      id,
      handle: id,
      title,
      name: title,
      description,
      category: categories[0] || null,
      categories,
      brand: "Acme",
      vendor: "Acme",
      price,
      original_price: null,
      currency: "USD",
      stock: null,
      in_stock: true,
      image_url: imageUrl,
      url: `/product/${id}/`
    });
  }

  return products.sort((a, b) => a.title.localeCompare(b.title));
}

async function readCategoryMap() {
  const categoryMap = new Map();

  try {
    const entries = await fs.readdir(searchDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const category = entry.name;
      const file = path.join(searchDir, category, "index.html");
      const html = await fs.readFile(file, "utf8");
      const $ = cheerio.load(html);

      $('a[href^="/product/"]').each((_, element) => {
        const href = $(element).attr("href") || "";
        const id = href.split("/").filter(Boolean).pop();
        if (!id) return;

        const categories = categoryMap.get(id) || [];
        if (!categories.includes(category)) {
          categories.push(category);
        }
        categoryMap.set(id, categories);
      });
    }
  } catch {
    return categoryMap;
  }

  return categoryMap;
}

function extractDescription($) {
  const descriptions = $(".prose")
    .map((_, element) => cleanText($(element).text()))
    .get()
    .filter(Boolean)
    .filter((text) => !text.includes("All rights reserved"));

  return descriptions.at(-1) || "";
}

function extractProductImage($, title) {
  const exact = $("img")
    .map((_, element) => ({
      alt: $(element).attr("alt") || "",
      src: $(element).attr("src") || "",
      srcset: $(element).attr("srcset") || ""
    }))
    .get()
    .find((image) => image.alt.toLowerCase().startsWith(`${title.toLowerCase()} -`));

  const fallback = $("img")
    .map((_, element) => ({
      alt: $(element).attr("alt") || "",
      src: $(element).attr("src") || "",
      srcset: $(element).attr("srcset") || ""
    }))
    .get()
    .find((image) => image.alt.toLowerCase() === title.toLowerCase());

  const image = exact || fallback;
  if (!image) return null;

  return originalImageUrl(image.srcset) || image.src || null;
}

function originalImageUrl(srcset) {
  const match = srcset.match(/\/_next\/image\?url=([^&\s]+)/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function extractPrice(text) {
  const match = cleanText(text).match(/\$([0-9]+(?:\.[0-9]{2})?)/);
  return match ? Number(match[1]) : null;
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
