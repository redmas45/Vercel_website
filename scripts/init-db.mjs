import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "..", "db", "schema.sql");
const sql = await fs.readFile(sqlPath, "utf8");

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

await client.connect();
try {
  await client.query(sql);
  console.log("PostgreSQL schema initialized.");
} finally {
  await client.end();
}
