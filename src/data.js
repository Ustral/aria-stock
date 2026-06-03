/* ============================================================
   Sample data — hotel inventory (Linens, Bath Amenities, Guest Supplies)
   Multi-branch: a shared product catalog (ITEMS) + per-branch stock (STOCK)
   + movement history tagged with branchId.
   ============================================================ */

const CATEGORIES = [
  { id: "linen", th: "ผ้าลินิน", en: "Linens", color: "#6366f1", soft: "#eef0fe", icon: "🛏️" },
  { id: "bath", th: "เครื่องอาบน้ำ", en: "Bath Amenities", color: "#06b6d4", soft: "#e3f7fb", icon: "🧴" },
  { id: "supply", th: "ของใช้ในห้องพัก", en: "Guest Supplies", color: "#f59e0b", soft: "#fdf3e0", icon: "☕" },
  { id: "clean", th: "อุปกรณ์ทำความสะอาด", en: "Cleaning", color: "#16a34a", soft: "#e7f6ee", icon: "🧹" },
];

// Branches. The HQ (isHQ) owns the product catalog and the branch list, and
// keeps its own central-warehouse stock.
const BRANCHES = [
  { id: "hq", code: "HQ", th: "สำนักงานใหญ่", en: "Head Office", city: "กรุงเทพฯ", isHQ: true },
  { id: "br-silom", code: "BKK-SILOM", th: "สาขาสีลม", en: "Silom Branch", city: "กรุงเทพฯ" },
  { id: "br-patong", code: "HKT-PATONG", th: "สาขาภูเก็ต ป่าตอง", en: "Phuket Patong", city: "ภูเก็ต" },
  { id: "br-nimman", code: "CNX-NIMMAN", th: "สาขาเชียงใหม่ นิมมาน", en: "Chiang Mai Nimman", city: "เชียงใหม่" },
];

const LOCATIONS = ["Store A-01", "Store A-02", "Store B-03", "Store B-05", "Store C-01", "Cold Store"];
const SUPPLIERS = ["Siam Linen Co.", "Bangkok Amenities", "Hospitality Supply Ltd.", "PureCare Trading", "Thai Comfort Goods"];
const DEPARTMENTS = ["Housekeeping", "Front Office", "F&B / Banquet", "Spa & Wellness", "Engineering"];

// sku, nameTh, nameEn, cat, unit, hqQty, par (target), reorder point, loc, cost, supplier
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

// Shared product catalog (no qty — quantity is per-branch in STOCK).
const ITEMS = RAW.map((r) => ({
  id: r[0], sku: r[0], nameTh: r[1], nameEn: r[2], cat: r[3], unit: r[4],
  par: r[6], reorder: r[7], loc: r[8], cost: r[9], supplier: r[10],
}));
const HQ_QTY = Object.fromEntries(RAW.map((r) => [r[0], r[5]]));

function rnd(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }

// Per-branch on-hand. HQ keeps its real central quantities; branches get
// smaller, varied quantities around par so each branch has its own ok/low/out mix.
function genStock(branch) {
  const s = {};
  ITEMS.forEach((it) => {
    if (branch.isHQ) { s[it.id] = HQ_QTY[it.id]; return; }
    if (Math.random() < 0.06) { s[it.id] = 0; return; }
    s[it.id] = Math.max(0, Math.round(it.par * (0.15 + Math.random() * 1.35)));
  });
  return s;
}
const STOCK = {};
BRANCHES.forEach((b) => { STOCK[b.id] = genStock(b); });

// ---- Generate movement history (last 60 days), tagged with branchId ----
const today = new Date(2026, 5, 2); // June 2 2026
const REFS_IN = ["GRN", "PO"], REFS_OUT = ["RQ", "ISS"];
let mid = 1000;
const MOVES = [];
const names = ["สมชาย ก.", "วราภรณ์ ส.", "ธนากร พ.", "ปิยะดา ม.", "อนุชา ร."];

function pickBranch() {
  if (Math.random() < 0.4) return "hq";
  const others = BRANCHES.filter((b) => !b.isHQ);
  return others[rnd(0, others.length - 1)].id;
}

for (let d = 59; d >= 0; d--) {
  const date = new Date(today); date.setDate(today.getDate() - d);
  const dow = date.getDay();
  const count = (dow === 0 || dow === 6) ? rnd(3, 6) : rnd(6, 12);
  for (let k = 0; k < count; k++) {
    const it = ITEMS[rnd(0, ITEMS.length - 1)];
    const isIn = Math.random() < 0.34;
    const qty = isIn ? rnd(2, 12) * 50 : rnd(1, 8) * 20;
    MOVES.push({
      id: "MV-" + (mid++),
      branchId: pickBranch(),
      type: isIn ? "in" : "out",
      sku: it.id, nameTh: it.nameTh, nameEn: it.nameEn, cat: it.cat, unit: it.unit,
      qty,
      date: date.toISOString().slice(0, 10),
      ts: date.getTime() + rnd(8, 19) * 3600000 + rnd(0, 59) * 60000,
      ref: (isIn ? REFS_IN[rnd(0, 1)] : REFS_OUT[rnd(0, 1)]) + "-" + rnd(10000, 99999),
      party: isIn ? it.supplier : DEPARTMENTS[rnd(0, DEPARTMENTS.length - 1)],
      by: names[rnd(0, names.length - 1)],
    });
  }
}
MOVES.sort((a, b) => b.ts - a.ts);

// ---- Helpers ----
function statusOf(it) {
  if (it.qty <= 0) return "out";
  if (it.qty <= it.reorder) return "low";
  return "ok";
}
const STATUS_LABEL = {
  ok: { th: "ปกติ", en: "In stock", cls: "ok" },
  low: { th: "ใกล้หมด", en: "Low", cls: "low" },
  out: { th: "หมดสต๊อก", en: "Out", cls: "out" },
};
function catOf(id) { return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0]; }
function branchOf(id) { return BRANCHES.find((b) => b.id === id) || BRANCHES[0]; }
function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
function baht(n) { return "฿" + Math.round(n).toLocaleString("en-US"); }
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function relDay(iso) {
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return "วันนี้";
  if (diff === 1) return "เมื่อวาน";
  if (diff < 7) return diff + " วันก่อน";
  return fmtDate(iso);
}

export const INV = {
  CATEGORIES, BRANCHES, LOCATIONS, SUPPLIERS, DEPARTMENTS, ITEMS, STOCK, MOVES, TODAY: today,
  statusOf, STATUS_LABEL, catOf, branchOf, fmt, baht, fmtDate, fmtTime, relDay, names, rnd,
};

export default INV;
