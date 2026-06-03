/* Loads .env into process.env BEFORE other server modules evaluate.
   Must be the first import in server/index.js. No-op if .env is absent. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
try {
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  }
} catch { /* ignore malformed/missing .env */ }
