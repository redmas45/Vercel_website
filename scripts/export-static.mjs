import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

const MIRROR_DIR = path.resolve(process.env.MIRROR_DIR || "out");
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  throw new Error("DATABASE_URL is required in .env");
}

await fs.rm(MIRROR_DIR, { recursive: true, force: true });
await fs.mkdir(MIRROR_DIR, { recursive: true });
await fs.mkdir(path.join(MIRROR_DIR, "assets"), { recursive: true });

const client = new Client({ connectionString: DB_URL });
await client.connect();

try {
  const pages = await client.query(`
    SELECT source_url, local_path, html_content
    FROM clone_pages
    WHERE status_code >= 200 AND status_code < 300
    ORDER BY crawled_at ASC
  `);

  for (const row of pages.rows) {
    const filePath = path.join(MIRROR_DIR, row.local_path || "index.html");
    if (!row.html_content) continue;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, row.html_content, "utf8");
    console.log("wrote page", row.local_path, row.source_url);
  }

  const assets = await client.query(`
    SELECT local_path, binary_content
    FROM clone_assets
    WHERE status_code >= 200 AND status_code < 400
  `);

  for (const row of assets.rows) {
    if (!row.binary_content || !row.local_path) continue;
    const filePath = path.join(MIRROR_DIR, row.local_path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, row.binary_content);
  }
} finally {
  await client.end();
}

console.log(`Export complete. Output dir: ${MIRROR_DIR}`);
