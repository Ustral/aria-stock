/* ============================================================
   Persistent store — JSON file backed. Seeds on first run.
   Source of truth for users, branches, catalog, per-branch stock,
   and movement history. (Swap for SQLite later without touching routes.)
   ============================================================ */
import bcrypt from "bcryptjs";
import { loadData, persistData, BACKEND } from "./persistence.js";

// Fixed reference "today" so movement dates line up with the client's labels.
export const APP_TODAY = new Date(2026, 5, 2); // June 2 2026
export { BACKEND };

const CATEGORY_OBJS = [
  { id: "linen", th: "ผ้าลินิน", en: "Linens", color: "#6366f1", soft: "#eef0fe", icon: "🛏️" },
  { id: "bath", th: "เครื่องอาบน้ำ", en: "Bath Amenities", color: "#06b6d4", soft: "#e3f7fb", icon: "🧴" },
  { id: "supply", th: "ของใช้ในห้องพัก", en: "Guest Supplies", color: "#f59e0b", soft: "#fdf3e0", icon: "☕" },
  { id: "clean", th: "อุปกรณ์ทำความสะอาด", en: "Cleaning", color: "#16a34a", soft: "#e7f6ee", icon: "🧹" },
];
const SUPPLIERS = ["Siam Linen Co.", "Bangkok Amenities", "Hospitality Supply Ltd.", "PureCare Trading", "Thai Comfort Goods"];
const LOCATIONS = ["Store A-01", "Store A-02", "Store B-03", "Store B-05", "Store C-01", "Cold Store"];
const DEPARTMENTS = ["Housekeeping", "Front Office", "F&B / Banquet", "Spa & Wellness", "Engineering"];

const BRANCHES_SEED = [
  { id: "hq", code: "HQ", th: "สำนักงานใหญ่", en: "Head Office", city: "กรุงเทพฯ", isHQ: true },
  { id: "br-silom", code: "BKK-SILOM", th: "สาขาสีลม", en: "Silom Branch", city: "กรุงเทพฯ" },
  { id: "br-patong", code: "HKT-PATONG", th: "สาขาภูเก็ต ป่าตอง", en: "Phuket Patong", city: "ภูเก็ต" },
  { id: "br-nimman", code: "CNX-NIMMAN", th: "สาขาเชียงใหม่ นิมมาน", en: "Chiang Mai Nimman", city: "เชียงใหม่" },
];

// sku, nameTh, nameEn, cat, unit, hqQty, par, reorder, loc, cost, supplier
const RAW = [
  ["LN-1001", "ผ้าขนหนูอาบน้ำ", "Bath Towel 70×140", "linen", "ผืน", 820, 600, 300, "Store A-01", 95, "Siam Linen Co."],
  ["LN-1002", "ผ้าเช็ดหน้า", "Face Towel 30×30", "linen", "ผืน", 240, 800, 350, "Store A-01", 22, "Siam Linen Co."],
  ["LN-1003", "ผ้าปูที่นอน King", "Bed Sheet King", "linen", "ผืน", 410, 400, 200, "Store A-02", 320, "Siam Linen Co."],
  ["LN-1004", "ปลอกหมอน", "Pillow Case", "linen", "ใบ", 1180, 900, 400, "Store A-02", 48, "Thai Comfort Goods"],
  ["LN-1005", "ผ้าคลุมเตียง", "Bed Runner", "linen", "ผืน", 90, 150, 80, "Store A-02", 380, "Thai Comfort Goods"],
  ["LN-1006", "เสื้อคลุมอาบน้ำ", "Bathrobe Waffle", "linen", "ตัว", 56, 120, 60, "Store B-03", 540, "Siam Linen Co."],
  ["BA-2001", "แชมพู 30ml", "Shampoo 30ml", "bath", "ขวด", 3200, 2500, 1200, "Store B-05", 14, "Bangkok Amenities"],
  ["BA-2002", "ครีมนวดผม 30ml", "Conditioner 30ml", "bath", "ขวด", 980, 2500, 1200, "Store B-05", 14, "Bangkok Amenities"],
  ["BA-2003", "สบู่เหลว 30ml", "Body Wash 30ml", "bath", "ขวด", 2750, 2500, 1200, "Store B-05", 15, "Bangkok Amenities"],
  ["BA-2004", "สบู่ก้อน 25g", "Soap Bar 25g", "bath", "ก้อน", 5400, 4000, 2000, "Store B-05", 8, "PureCare Trading"],
  ["BA-2005", "โลชั่นบำรุงผิว 30ml", "Body Lotion 30ml", "bath", "ขวด", 410, 2000, 1000, "Store B-05", 16, "PureCare Trading"],
  ["BA-2006", "หมวกอาบน้ำ", "Shower Cap", "bath", "ชิ้น", 6100, 4000, 1800, "Store C-01", 3, "Bangkok Amenities"],
  ["BA-2007", "ชุดแปรงสีฟัน", "Dental Kit", "bath", "ชุด", 1430, 3000, 1500, "Store C-01", 6, "PureCare Trading"],
  ["BA-2008", "ที่โกนหนวด", "Shaving Kit", "bath", "ชุด", 0, 2000, 1000, "Store C-01", 7, "PureCare Trading"],
  ["GS-3001", "กาแฟซอง 3in1", "Coffee Sachet", "supply", "ซอง", 8200, 6000, 3000, "Store C-01", 4, "Hospitality Supply Ltd."],
  ["GS-3002", "ชาซอง", "Tea Bag", "supply", "ซอง", 5600, 5000, 2500, "Store C-01", 3, "Hospitality Supply Ltd."],
  ["GS-3003", "น้ำดื่ม 500ml", "Drinking Water 500ml", "supply", "ขวด", 1240, 4000, 2000, "Cold Store", 7, "Thai Comfort Goods"],
  ["GS-3004", "น้ำตาล/ครีมเทียม", "Sugar & Creamer Set", "supply", "ชุด", 3100, 3000, 1500, "Store C-01", 5, "Hospitality Supply Ltd."],
  ["GS-3005", "กระดาษโน้ตโรงแรม", "Memo Pad", "supply", "เล่ม", 720, 1500, 700, "Store B-03", 9, "Hospitality Supply Ltd."],
  ["GS-3006", "ถุงซักรีด", "Laundry Bag", "supply", "ใบ", 2400, 2000, 900, "Store B-03", 5, "Thai Comfort Goods"],
  ["GS-3007", "รองเท้าแตะใช้แล้วทิ้ง", "Disposable Slippers", "supply", "คู่", 180, 3000, 1400, "Store B-03", 11, "Hospitality Supply Ltd."],
  ["CL-4001", "น้ำยาทำความสะอาดพื้น", "Floor Cleaner 5L", "clean", "แกลลอน", 64, 80, 40, "Store A-01", 220, "PureCare Trading"],
  ["CL-4002", "น้ำยาเช็ดกระจก", "Glass Cleaner 1L", "clean", "ขวด", 38, 100, 45, "Store A-01", 65, "PureCare Trading"],
  ["CL-4003", "ถุงขยะ 30×40", "Garbage Bag", "clean", "แพ็ก", 410, 300, 150, "Store A-01", 38, "Thai Comfort Goods"],
];

const NAMES = ["สมชาย ก.", "วราภรณ์ ส.", "ธนากร พ.", "ปิยะดา ม.", "อนุชา ร."];
function rnd(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }

function buildSeed() {
  const products = RAW.map((r) => ({
    id: r[0], sku: r[0], nameTh: r[1], nameEn: r[2], cat: r[3], unit: r[4],
    par: r[6], reorder: r[7], loc: r[8], cost: r[9], supplier: r[10],
  }));
  const hqQty = Object.fromEntries(RAW.map((r) => [r[0], r[5]]));

  const stock = {};
  BRANCHES_SEED.forEach((b) => {
    const s = {};
    products.forEach((it) => {
      if (b.isHQ) { s[it.id] = hqQty[it.id]; return; }
      if (Math.random() < 0.06) { s[it.id] = 0; return; }
      s[it.id] = Math.max(0, Math.round(it.par * (0.15 + Math.random() * 1.35)));
    });
    stock[b.id] = s;
  });

  const REFS_IN = ["GRN", "PO"], REFS_OUT = ["RQ", "ISS"];
  const movements = [];
  let mvId = 1000;
  const pickBranch = () => {
    if (Math.random() < 0.4) return "hq";
    const others = BRANCHES_SEED.filter((b) => !b.isHQ);
    return others[rnd(0, others.length - 1)].id;
  };
  for (let d = 59; d >= 0; d--) {
    const date = new Date(APP_TODAY); date.setDate(APP_TODAY.getDate() - d);
    const dow = date.getDay();
    const count = (dow === 0 || dow === 6) ? rnd(3, 6) : rnd(6, 12);
    for (let k = 0; k < count; k++) {
      const it = products[rnd(0, products.length - 1)];
      const isIn = Math.random() < 0.34;
      const qty = isIn ? rnd(2, 12) * 50 : rnd(1, 8) * 20;
      movements.push({
        id: "MV-" + (mvId++), branchId: pickBranch(), type: isIn ? "in" : "out",
        sku: it.id, nameTh: it.nameTh, nameEn: it.nameEn, cat: it.cat, unit: it.unit, qty,
        date: date.toISOString().slice(0, 10),
        ts: date.getTime() + rnd(8, 19) * 3600000 + rnd(0, 59) * 60000,
        ref: (isIn ? REFS_IN[rnd(0, 1)] : REFS_OUT[rnd(0, 1)]) + "-" + rnd(10000, 99999),
        party: isIn ? it.supplier : DEPARTMENTS[rnd(0, DEPARTMENTS.length - 1)],
        by: NAMES[rnd(0, NAMES.length - 1)],
      });
    }
  }
  movements.sort((a, b) => b.ts - a.ts);

  const hash = (pw) => bcrypt.hashSync(pw, 8);
  const users = [
    { id: "u-admin", username: "admin", password: hash("admin123"), name: "คุณกานต์", title: "ผู้จัดการคลังกลาง · HQ Admin", role: "hq", branchId: null, active: true },
    { id: "u-manager", username: "manager", password: hash("manager123"), name: "คุณพิมพ์ใจ", title: "ผู้จัดการสำนักงานใหญ่ (ไม่จัดการผู้ใช้)", role: "manager", branchId: null, active: true },
    { id: "u-silom", username: "silom", password: hash("silom123"), name: "คุณสมหญิง", title: "Store Keeper · สีลม", role: "branch", branchId: "br-silom", active: true },
    { id: "u-patong", username: "patong", password: hash("patong123"), name: "คุณนภดล", title: "Store Keeper · ป่าตอง", role: "branch", branchId: "br-patong", active: true },
    { id: "u-nimman", username: "nimman", password: hash("nimman123"), name: "คุณกัลยา", title: "Store Keeper · นิมมาน", role: "branch", branchId: "br-nimman", active: true },
  ];

  return {
    branches: BRANCHES_SEED.map((b) => ({ ...b })), products, stock, movements, users,
    categories: CATEGORY_OBJS.map((c) => ({ ...c })), suppliers: [...SUPPLIERS], locations: [...LOCATIONS],
  };
}

let db = null;
export async function initStore() {
  db = await loadData(buildSeed);
  return db;
}

// Serialized write-through so concurrent saves don't race. Fire-and-forget at
// the call site; errors are logged, never thrown into request handlers.
let chain = Promise.resolve();
export function save() {
  chain = chain.then(() => persistData(db)).catch((e) => console.error("[persist]", e.message));
  return chain;
}

export const META = { CATEGORIES: CATEGORY_OBJS, SUPPLIERS, LOCATIONS, DEPARTMENTS, NAMES };
