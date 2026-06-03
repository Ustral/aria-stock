/* ============================================================
   Aria Stock API — auth + multi-branch inventory.
   Server-side enforcement of roles and branch scoping.
   ============================================================ */
import "./env.js"; // must be first — populates process.env from .env
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { initStore, save, APP_TODAY, BACKEND } from "./store.js";
import { signToken, requireAuth, requireHQLevel, requireUserAdmin, canAccessBranch, isHQLevel } from "./auth.js";

const app = express();
app.use(cors());
app.use(express.json());

const db = await initStore();
// In production a single PORT serves both API and the built SPA; in local dev
// the API uses API_PORT (8787) while Vite owns PORT (5173).
const PROD = process.env.NODE_ENV === "production";
// In dev, ignore PORT (the web host sets it to the Vite port) and use API_PORT.
// In production, honor the host-provided PORT.
const PORT = PROD ? (process.env.PORT || 8787) : (process.env.API_PORT || 8787);

const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, title: u.title, role: u.role, branchId: u.branchId, active: u.active !== false });
const activeHqCount = () => db.users.filter((u) => u.role === "hq" && u.active !== false).length;

/* ---------------- Health check ---------------- */
app.get("/api/health", (req, res) => res.json({ ok: true, storage: BACKEND }));

/* ---------------- Auth ---------------- */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const u = db.users.find((x) => x.username === String(username || "").trim().toLowerCase());
  if (!u || !bcrypt.compareSync(String(password || ""), u.password)) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }
  if (u.active === false) return res.status(403).json({ error: "บัญชีนี้ถูกระงับการใช้งาน" });
  res.json({ token: signToken(u), user: publicUser(u) });
});

/* ---------------- Users (HQ only) ---------------- */
app.get("/api/users", requireAuth, requireUserAdmin, (req, res) => {
  res.json({ users: db.users.map(publicUser) });
});

app.post("/api/users", requireAuth, requireUserAdmin, (req, res) => {
  const b = req.body || {};
  const username = String(b.username || "").trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,}$/.test(username)) return res.status(400).json({ error: "ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ . - อย่างน้อย 3 ตัว" });
  if (db.users.some((u) => u.username === username)) return res.status(409).json({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" });
  if (String(b.password || "").length < 6) return res.status(400).json({ error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" });
  const role = ["hq", "manager", "branch"].includes(b.role) ? b.role : "branch";
  let branchId = null;
  if (role === "branch") {
    branchId = b.branchId;
    const br = db.branches.find((x) => x.id === branchId);
    if (!br || br.isHQ) return res.status(400).json({ error: "เลือกสาขาให้พนักงานสาขา" });
  }
  const defTitle = role === "hq" ? "HQ Admin" : role === "manager" ? "ผู้จัดการสำนักงานใหญ่" : "Store Keeper";
  const user = {
    id: "u-" + Date.now().toString(36), username, password: bcrypt.hashSync(String(b.password), 8),
    name: String(b.name || "").trim() || username, title: String(b.title || "").trim() || defTitle,
    role, branchId, active: true,
  };
  db.users.push(user); save();
  res.json({ user: publicUser(user) });
});

app.patch("/api/users/:id", requireAuth, requireUserAdmin, (req, res) => {
  const u = db.users.find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  const b = req.body || {};
  if (b.name != null) u.name = String(b.name).trim() || u.name;
  if (b.title != null) u.title = String(b.title).trim();
  if (b.password != null) {
    if (String(b.password).length < 6) return res.status(400).json({ error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" });
    u.password = bcrypt.hashSync(String(b.password), 8);
  }
  if (b.active != null) {
    const next = !!b.active;
    if (!next && u.id === req.auth.sub) return res.status(400).json({ error: "ระงับบัญชีตัวเองไม่ได้" });
    if (!next && u.role === "hq" && activeHqCount() <= 1) return res.status(400).json({ error: "ต้องมีผู้ดูแล HQ ที่ใช้งานได้อย่างน้อย 1 บัญชี" });
    u.active = next;
  }
  save();
  res.json({ user: publicUser(u) });
});

app.delete("/api/users/:id", requireAuth, requireUserAdmin, (req, res) => {
  const u = db.users.find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  if (u.id === req.auth.sub) return res.status(400).json({ error: "ลบบัญชีตัวเองไม่ได้" });
  if (u.role === "hq" && activeHqCount() <= 1 && u.active !== false) return res.status(400).json({ error: "ต้องมีผู้ดูแล HQ อย่างน้อย 1 บัญชี" });
  db.users = db.users.filter((x) => x.id !== u.id); save();
  res.json({ ok: true, id: u.id });
});

/* ---------------- Bootstrap (scoped snapshot) ---------------- */
app.get("/api/bootstrap", requireAuth, (req, res) => {
  const { role, branchId } = req.auth;
  const me = publicUser(db.users.find((u) => u.id === req.auth.sub));

  let branches, stock, movements;
  if (isHQLevel(role)) {
    branches = db.branches;
    stock = db.stock;
    movements = db.movements;
  } else {
    branches = db.branches.filter((b) => b.id === branchId);
    stock = { [branchId]: db.stock[branchId] || {} };
    movements = db.movements.filter((m) => m.branchId === branchId);
  }
  res.json({
    me, branches, products: db.products, stock, movements,
    categories: db.categories, suppliers: db.suppliers, locations: db.locations,
    today: APP_TODAY.toISOString().slice(0, 10),
  });
});

/* ---------------- Movements (receiving / issue) ---------------- */
app.post("/api/movements", requireAuth, (req, res) => {
  const { branchId, type, itemId, qty, party, ref, note } = req.body || {};
  if (!canAccessBranch(req.auth, branchId)) return res.status(403).json({ error: "ไม่มีสิทธิ์ทำรายการของสาขานี้" });
  const branch = db.branches.find((b) => b.id === branchId);
  const item = db.products.find((p) => p.id === itemId);
  const n = Math.round(Number(qty));
  if (!branch || !item) return res.status(404).json({ error: "ไม่พบสาขาหรือสินค้า" });
  if (!(n > 0)) return res.status(400).json({ error: "จำนวนไม่ถูกต้อง" });
  if (type !== "in" && type !== "out") return res.status(400).json({ error: "ประเภทไม่ถูกต้อง" });

  const cur = (db.stock[branchId] && db.stock[branchId][itemId]) || 0;
  if (type === "out" && n > cur) return res.status(400).json({ error: "จำนวนจ่ายออกเกินยอดคงเหลือ" });

  const next = Math.max(0, cur + (type === "in" ? n : -n));
  if (!db.stock[branchId]) db.stock[branchId] = {};
  db.stock[branchId][itemId] = next;

  const now = Date.now();
  const u = db.users.find((x) => x.id === req.auth.sub);
  const rec = {
    id: "MV-" + now, branchId, type, sku: item.id, nameTh: item.nameTh, nameEn: item.nameEn,
    cat: item.cat, unit: item.unit, qty: n, date: APP_TODAY.toISOString().slice(0, 10),
    ts: now, ref: ref || "", party: party || "", note: note || "", by: u?.name || "—",
  };
  db.movements.unshift(rec);
  save();
  res.json({ movement: rec, qty: next });
});

/* ---------------- Products (HQ only) ---------------- */
app.post("/api/products", requireAuth, requireHQLevel, (req, res) => {
  const b = req.body || {};
  const id = String(b.sku || "").trim().toUpperCase();
  if (!id) return res.status(400).json({ error: "ระบุ SKU" });
  if (!String(b.nameTh || "").trim()) return res.status(400).json({ error: "ระบุชื่อสินค้า" });
  if (db.products.some((p) => p.id === id)) return res.status(409).json({ error: "SKU นี้มีอยู่แล้ว" });

  const product = {
    id, sku: id, nameTh: String(b.nameTh).trim(), nameEn: String(b.nameEn || b.nameTh).trim(),
    cat: b.cat || "supply", unit: b.unit || "ชิ้น",
    par: Math.max(1, Math.round(Number(b.par) || 1000)), reorder: Math.max(0, Math.round(Number(b.reorder) || 0)),
    loc: b.loc || "Store A-01", cost: Math.max(0, Math.round(Number(b.cost) || 0)), supplier: b.supplier || "",
  };
  db.products.push(product);
  // opening qty applies to the branch the admin is currently in; others start at 0
  const openBranch = b.branchId && db.branches.some((x) => x.id === b.branchId) ? b.branchId : "hq";
  const openQty = Math.max(0, Math.round(Number(b.qty) || 0));
  db.branches.forEach((br) => {
    if (!db.stock[br.id]) db.stock[br.id] = {};
    db.stock[br.id][id] = br.id === openBranch ? openQty : 0;
  });
  save();
  res.json({ product, openBranch, openQty });
});

app.delete("/api/products/:id", requireAuth, requireHQLevel, (req, res) => {
  const id = req.params.id;
  if (!db.products.some((p) => p.id === id)) return res.status(404).json({ error: "ไม่พบสินค้า" });
  db.products = db.products.filter((p) => p.id !== id);
  Object.keys(db.stock).forEach((bid) => { delete db.stock[bid][id]; });
  save();
  res.json({ ok: true, id });
});

/* ---------------- Branches (HQ only) ---------------- */
app.post("/api/branches", requireAuth, requireHQLevel, (req, res) => {
  const b = req.body || {};
  const code = String(b.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "ระบุรหัสสาขา" });
  if (!String(b.th || "").trim()) return res.status(400).json({ error: "ระบุชื่อสาขา" });
  if (db.branches.some((x) => x.code.toUpperCase() === code)) return res.status(409).json({ error: "รหัสสาขานี้มีอยู่แล้ว" });

  const id = "br-" + Date.now().toString(36);
  const branch = { id, code, th: String(b.th).trim(), en: String(b.en || b.th).trim(), city: String(b.city || "—").trim(), isHQ: false };
  db.branches.push(branch);
  const seed = {};
  db.products.forEach((p) => {
    seed[p.id] = Math.random() < 0.08 ? 0 : Math.max(0, Math.round(p.par * (0.2 + Math.random() * 1.2)));
  });
  db.stock[id] = seed;
  save();
  res.json({ branch, stock: seed });
});

/* ---------------- Reference data: Categories (HQ-level) ---------------- */
const softFromColor = (hex) => {
  const h = String(hex).replace("#", "");
  const x = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, "0").slice(0, 6);
  const n = parseInt(x, 16);
  if (Number.isNaN(n)) return "#eef0fe";
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
};

app.post("/api/categories", requireAuth, requireHQLevel, (req, res) => {
  const b = req.body || {};
  const id = String(b.id || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!id) return res.status(400).json({ error: "ระบุรหัสหมวด (a-z, 0-9)" });
  if (db.categories.some((c) => c.id === id)) return res.status(409).json({ error: "รหัสหมวดนี้มีอยู่แล้ว" });
  if (!String(b.th || "").trim()) return res.status(400).json({ error: "ระบุชื่อหมวด" });
  const color = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(b.color || "") ? b.color : "#6366f1";
  const cat = { id, th: String(b.th).trim(), en: String(b.en || b.th).trim(), color, soft: softFromColor(color), icon: String(b.icon || "📦").trim() || "📦" };
  db.categories.push(cat); save();
  res.json({ category: cat });
});

app.patch("/api/categories/:id", requireAuth, requireHQLevel, (req, res) => {
  const c = db.categories.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "ไม่พบหมวด" });
  const b = req.body || {};
  if (b.th != null) c.th = String(b.th).trim() || c.th;
  if (b.en != null) c.en = String(b.en).trim();
  if (b.icon != null) c.icon = String(b.icon).trim() || c.icon;
  if (b.color != null && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(b.color)) { c.color = b.color; c.soft = softFromColor(b.color); }
  save();
  res.json({ category: c });
});

app.delete("/api/categories/:id", requireAuth, requireHQLevel, (req, res) => {
  const id = req.params.id;
  if (!db.categories.some((c) => c.id === id)) return res.status(404).json({ error: "ไม่พบหมวด" });
  const used = db.products.filter((p) => p.cat === id).length;
  if (used > 0) return res.status(409).json({ error: `ลบไม่ได้ — มีสินค้า ${used} รายการใช้หมวดนี้อยู่` });
  db.categories = db.categories.filter((c) => c.id !== id); save();
  res.json({ ok: true, id });
});

/* ---------------- Reference data: Suppliers / Locations (HQ-level) ---------------- */
function makeListRoutes(key, field, label) {
  // key: db key ("suppliers"/"locations"); field: product field to keep in sync
  app.post(`/api/${key}`, requireAuth, requireHQLevel, (req, res) => {
    const name = String((req.body || {}).name || "").trim();
    if (!name) return res.status(400).json({ error: `ระบุชื่อ${label}` });
    if (db[key].some((x) => x.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: `${label}นี้มีอยู่แล้ว` });
    db[key].push(name); save();
    res.json({ name });
  });
  app.patch(`/api/${key}`, requireAuth, requireHQLevel, (req, res) => {
    const b = req.body || {};
    const from = String(b.from || "").trim(), to = String(b.to || "").trim();
    const i = db[key].indexOf(from);
    if (i < 0) return res.status(404).json({ error: `ไม่พบ${label}` });
    if (!to) return res.status(400).json({ error: "ระบุชื่อใหม่" });
    if (to !== from && db[key].some((x) => x.toLowerCase() === to.toLowerCase())) return res.status(409).json({ error: `${label}นี้มีอยู่แล้ว` });
    db[key][i] = to;
    db.products.forEach((p) => { if (p[field] === from) p[field] = to; });
    save();
    res.json({ from, to });
  });
  app.delete(`/api/${key}/:name`, requireAuth, requireHQLevel, (req, res) => {
    const name = req.params.name;
    if (!db[key].includes(name)) return res.status(404).json({ error: `ไม่พบ${label}` });
    const used = db.products.filter((p) => p[field] === name).length;
    if (used > 0) return res.status(409).json({ error: `ลบไม่ได้ — มีสินค้า ${used} รายการใช้${label}นี้อยู่` });
    db[key] = db[key].filter((x) => x !== name); save();
    res.json({ ok: true, name });
  });
}
makeListRoutes("suppliers", "supplier", "ผู้จำหน่าย");
makeListRoutes("locations", "loc", "ที่จัดเก็บ");

/* ---------------- Serve the built SPA (single-service production) ---------------- */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.listen(PORT, () => console.log(`Aria Stock API on http://localhost:${PORT}  ·  storage: ${BACKEND}`));
