import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();
const mirrorDir = process.env.MIRROR_DIR || "out";
await fs.rm(path.resolve(mirrorDir), { recursive: true, force: true });
await fs.mkdir(path.resolve(mirrorDir), { recursive: true });
console.log(`Cleaned ${mirrorDir}`);
