/* ============================================================
   Persistence backends — swappable by environment:
   - DATABASE_URL set  → Postgres (managed, e.g. Neon/Supabase)
   - otherwise         → local JSON file (zero-config dev)

   The whole app state is stored as a single JSON document. This keeps the
   data layer tiny and lets us move to a managed DB without rewriting routes.
   (For higher scale, split into normalized tables — see DEPLOYMENT.md.)
   ============================================================ */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "data.json");
const DATABASE_URL = process.env.DATABASE_URL || "";
export const BACKEND = DATABASE_URL ? "postgres" : "json";

let pool = null;
async function pg() {
  if (pool) return pool;
  const { default: pkg } = await import("pg");
  const local = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
  pool = new pkg.Pool({ connectionString: DATABASE_URL, ssl: local ? false : { rejectUnauthorized: false } });
  await pool.query("CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, data JSONB NOT NULL)");
  return pool;
}

export async function loadData(buildSeed) {
  if (BACKEND === "postgres") {
    const p = await pg();
    const r = await p.query("SELECT data FROM app_state WHERE id = 1");
    if (r.rows[0]) return r.rows[0].data;
    const seed = buildSeed();
    await p.query("INSERT INTO app_state (id, data) VALUES (1, $1)", [seed]);
    return seed;
  }
  if (fs.existsSync(FILE)) {
    try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* reseed */ }
  }
  const seed = buildSeed();
  fs.writeFileSync(FILE, JSON.stringify(seed), "utf8");
  return seed;
}

export async function persistData(data) {
  if (BACKEND === "postgres") {
    const p = await pg();
    await p.query("INSERT INTO app_state (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1", [data]);
    return;
  }
  fs.writeFileSync(FILE, JSON.stringify(data), "utf8");
}
