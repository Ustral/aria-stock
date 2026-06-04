/* ============================================================
   App root — multi-branch, role-based, API-backed.
   Receives the post-login `boot` snapshot; all mutations go
   through the API (server enforces roles + branch scoping).
   ============================================================ */
import React from "react";
import { INV as A } from "./data.js";
import { api } from "./api.js";
import { Icon } from "./icons.jsx";
import { Sidebar, TopBar, Drawer, useToast } from "./components.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { FlowPage, StockForm } from "./pages/Flows.jsx";
import { StockPage, ItemsPage, ItemDetail } from "./pages/Stock.jsx";
import { ReportPage } from "./pages/Report.jsx";
import { UsersPage } from "./pages/Users.jsx";
import { RefDataPage } from "./pages/RefData.jsx";
import { AddProductModal, AddBranchModal, ConfirmDeleteModal, EditBranchModal, ConfirmDeleteBranchModal } from "./Admin.jsx";
import { RefDataProvider } from "./refdata.jsx";
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } from "./TweaksPanel.jsx";

const PAGE_META = {
  dashboard: { th: "ภาพรวมคลังสินค้า", en: "Inventory Dashboard", sub: "สรุปสถานะสต๊อกและการเคลื่อนไหวล่าสุด" },
  receive: { th: "รับสินค้าเข้า", en: "Receiving", sub: "บันทึกการรับสินค้าเข้าคลัง" },
  issue: { th: "จ่ายสินค้าออก", en: "Issue", sub: "บันทึกการเบิก-จ่ายสินค้า" },
  stock: { th: "สินค้าคงเหลือ", en: "Stock on Hand", sub: "ตรวจสอบยอดคงเหลือทุกรายการ" },
  items: { th: "ข้อมูลสินค้า", en: "Item Master", sub: "รายละเอียดสินค้าแต่ละรายการ" },
  report: { th: "รายงานการเคลื่อนไหว", en: "Movement Report", sub: "ประวัติรับเข้า–จ่ายออกย้อนหลัง" },
  refdata: { th: "ข้อมูลอ้างอิง", en: "Reference Data", sub: "หมวดหมู่ · ผู้จำหน่าย · ที่จัดเก็บ" },
  users: { th: "จัดการผู้ใช้งาน", en: "User Management", sub: "บัญชีผู้ใช้และสิทธิ์การเข้าถึงระบบ" },
};

export default function App({ boot, onLogout }) {
  const toast = useToast();
  const me = boot.me;
  const isHQLevel = me.role === "hq" || me.role === "manager";
  const canManageUsers = me.role === "hq";

  const [t, setTweak] = useTweaks({ accent: "#6366f1", density: "regular" });
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  // apply accent palette
  React.useEffect(() => {
    const map = {
      "#6366f1": { p6: "#4f46e5", p7: "#4338ca", soft: "#eef0fe", softer: "#f5f6ff", cyan: "#22d3ee" },
      "#0f766e": { p6: "#0d9488", p7: "#115e59", soft: "#e3f4f1", softer: "#f1faf8", cyan: "#34d399" },
      "#7c3aed": { p6: "#6d28d9", p7: "#5b21b6", soft: "#f1ebfe", softer: "#f8f5ff", cyan: "#22d3ee" },
      "#2563eb": { p6: "#1d4ed8", p7: "#1e40af", soft: "#e8f1fe", softer: "#f3f8ff", cyan: "#38bdf8" },
    };
    const a = map[t.accent] || map["#6366f1"];
    const r = document.documentElement.style;
    r.setProperty("--primary", t.accent);
    r.setProperty("--primary-600", a.p6);
    r.setProperty("--primary-700", a.p7);
    r.setProperty("--primary-soft", a.soft);
    r.setProperty("--primary-softer", a.softer);
    r.setProperty("--cyan", a.cyan);
    r.setProperty("--accent-grad", `linear-gradient(135deg, ${t.accent} 0%, ${a.cyan} 130%)`);
    r.setProperty("--sh-primary", `0 6px 18px ${t.accent}52`);
  }, [t.accent]);

  // density
  React.useEffect(() => {
    const r = document.documentElement.style;
    const map = { compact: ["16px", "48px"], regular: ["22px", "56px"], comfy: ["28px", "64px"] };
    const [pad, row] = map[t.density] || map.regular;
    r.setProperty("--pad-card", pad);
    r.setProperty("--row-h", row);
  }, [t.density]);

  const [page, setPage] = React.useState("dashboard");
  const [branches, setBranches] = React.useState(() => boot.branches.map((b) => ({ ...b })));
  const [branchId, setBranchId] = React.useState(isHQLevel ? "hq" : me.branchId);
  const [master, setMaster] = React.useState(() => boot.products.map((x) => ({ ...x })));
  const [stock, setStock] = React.useState(() => {
    const s = {}; Object.keys(boot.stock).forEach((bid) => { s[bid] = { ...boot.stock[bid] }; }); return s;
  });
  const [moves, setMoves] = React.useState(() => boot.movements.map((x) => ({ ...x })));
  const [categories, setCategories] = React.useState(() => (boot.categories || []).map((x) => ({ ...x })));
  const [suppliers, setSuppliers] = React.useState(() => [...(boot.suppliers || [])]);
  const [locations, setLocations] = React.useState(() => [...(boot.locations || [])]);
  const [departments, setDepartments] = React.useState(() => [...(boot.departments || [])]);
  const [search, setSearch] = React.useState("");
  const [detail, setDetail] = React.useState(null);
  const [quick, setQuick] = React.useState(null); // {mode, presetId}
  const [addProduct, setAddProduct] = React.useState(false);
  const [addBranch, setAddBranch] = React.useState(false);
  const [editBranch, setEditBranch] = React.useState(null);
  const [confirmDelBranch, setConfirmDelBranch] = React.useState(null);
  const [confirmDel, setConfirmDel] = React.useState(null);

  const currentBranch = branches.find((b) => b.id === branchId) || branches[0];

  // derived: catalog + this branch's on-hand → the shape pages already expect
  const items = React.useMemo(
    () => master.map((m) => ({ ...m, qty: (stock[branchId] && stock[branchId][m.id]) ?? 0 })),
    [master, stock, branchId]
  );
  const branchMoves = React.useMemo(() => moves.filter((mv) => mv.branchId === branchId), [moves, branchId]);

  const lowCount = items.filter((it) => A.statusOf(it) !== "ok").length;

  // greet w/ low-stock warning once
  React.useEffect(() => {
    const tm = setTimeout(() => {
      if (lowCount > 0) toast.warn(`${currentBranch.th}: มีสินค้าใกล้หมด ${lowCount} รายการ`, "ตรวจสอบที่หน้าสินค้าคงเหลือ");
    }, 900);
    return () => clearTimeout(tm);
    // eslint-disable-next-line
  }, []);

  const switchBranch = (id) => {
    if (id === branchId) return;
    setBranchId(id); setSearch(""); setDetail(null);
    const b = branches.find((x) => x.id === id);
    if (b) toast.info("กำลังดูข้อมูล: " + b.th, b.isHQ ? "สำนักงานใหญ่ · จัดการแคตตาล็อก/สาขาได้" : b.city + " · " + b.code);
  };

  const applyMove = async (payload) => {
    const it = items.find((i) => i.id === payload.itemId);
    if (!it) return;
    try {
      const r = await api.move({ ...payload, branchId });
      setStock((prev) => ({ ...prev, [branchId]: { ...prev[branchId], [it.id]: r.qty } }));
      setMoves((prev) => [r.movement, ...prev]);
      const where = " · " + currentBranch.th;
      if (payload.type === "in") toast.success("บันทึกการรับเข้าแล้ว" + where, `${it.nameTh} +${A.fmt(payload.qty)} ${it.unit}`);
      else toast.success("บันทึกการจ่ายออกแล้ว" + where, `${it.nameTh} −${A.fmt(payload.qty)} ${it.unit}`);
    } catch (e) {
      toast.error("บันทึกไม่สำเร็จ", e.message);
    }
  };

  const handleAddProduct = async (p) => {
    try {
      const r = await api.addProduct({ ...p, branchId });
      setMaster((prev) => [...prev, { ...r.product }]);
      setStock((prev) => {
        const next = {};
        branches.forEach((b) => { next[b.id] = { ...prev[b.id], [r.product.id]: b.id === r.openBranch ? r.openQty : 0 }; });
        return next;
      });
      setAddProduct(false);
      toast.success("เพิ่มสินค้าใหม่แล้ว", `${r.product.nameTh} (${r.product.sku}) · เพิ่มในทุกสาขา`);
    } catch (e) {
      toast.error("เพิ่มสินค้าไม่สำเร็จ", e.message);
    }
  };

  const handleDeleteProduct = async (item) => {
    try {
      await api.deleteProduct(item.id);
      setMaster((prev) => prev.filter((m) => m.id !== item.id));
      setStock((prev) => {
        const next = {};
        Object.keys(prev).forEach((bid) => { next[bid] = { ...prev[bid] }; delete next[bid][item.id]; });
        return next;
      });
      setConfirmDel(null); setDetail(null);
      toast.error("ลบสินค้าแล้ว", `${item.nameTh} (${item.sku}) ถูกนำออกจากทุกสาขา`);
    } catch (e) {
      toast.error("ลบสินค้าไม่สำเร็จ", e.message);
    }
  };

  const handleAddBranch = async (b) => {
    try {
      const r = await api.addBranch(b);
      setBranches((prev) => [...prev, { ...r.branch }]);
      setStock((prev) => ({ ...prev, [r.branch.id]: { ...r.stock } }));
      setAddBranch(false);
      toast.success("เพิ่มสาขาใหม่แล้ว", `${r.branch.th} (${r.branch.code}) · พร้อมใช้งาน`);
      setBranchId(r.branch.id); setPage("dashboard");
    } catch (e) {
      toast.error("เพิ่มสาขาไม่สำเร็จ", e.message);
    }
  };

  // HQ-level: reference data ops (rethrow so the page can keep its modal open on error)
  const refOps = {
    addCategory: async (p) => {
      try { const r = await api.addCategory(p); setCategories((prev) => [...prev, r.category]); toast.success("เพิ่มหมวดหมู่แล้ว", `${r.category.icon} ${r.category.th}`); }
      catch (e) { toast.error("เพิ่มหมวดไม่สำเร็จ", e.message); throw e; }
    },
    updateCategory: async (id, p) => {
      try { const r = await api.updateCategory(id, p); setCategories((prev) => prev.map((c) => (c.id === id ? r.category : c))); toast.success("บันทึกหมวดแล้ว", `${r.category.icon} ${r.category.th}`); }
      catch (e) { toast.error("แก้ไขหมวดไม่สำเร็จ", e.message); throw e; }
    },
    deleteCategory: async (id) => {
      try { await api.deleteCategory(id); setCategories((prev) => prev.filter((c) => c.id !== id)); toast.error("ลบหมวดแล้ว", id); }
      catch (e) { toast.error("ลบหมวดไม่สำเร็จ", e.message); throw e; }
    },
    addSupplier: async (name) => {
      try { const r = await api.addSupplier(name); setSuppliers((prev) => [...prev, r.name]); toast.success("เพิ่มผู้จำหน่ายแล้ว", r.name); }
      catch (e) { toast.error("เพิ่มไม่สำเร็จ", e.message); throw e; }
    },
    renameSupplier: async (from, to) => {
      try { await api.renameSupplier(from, to); setSuppliers((prev) => prev.map((s) => (s === from ? to : s))); setMaster((prev) => prev.map((m) => (m.supplier === from ? { ...m, supplier: to } : m))); toast.success("แก้ไขผู้จำหน่ายแล้ว", `${from} → ${to}`); }
      catch (e) { toast.error("แก้ไขไม่สำเร็จ", e.message); throw e; }
    },
    deleteSupplier: async (name) => {
      try { await api.deleteSupplier(name); setSuppliers((prev) => prev.filter((s) => s !== name)); toast.error("ลบผู้จำหน่ายแล้ว", name); }
      catch (e) { toast.error("ลบไม่สำเร็จ", e.message); throw e; }
    },
    addLocation: async (name) => {
      try { const r = await api.addLocation(name); setLocations((prev) => [...prev, r.name]); toast.success("เพิ่มที่จัดเก็บแล้ว", r.name); }
      catch (e) { toast.error("เพิ่มไม่สำเร็จ", e.message); throw e; }
    },
    renameLocation: async (from, to) => {
      try { await api.renameLocation(from, to); setLocations((prev) => prev.map((s) => (s === from ? to : s))); setMaster((prev) => prev.map((m) => (m.loc === from ? { ...m, loc: to } : m))); toast.success("แก้ไขที่จัดเก็บแล้ว", `${from} → ${to}`); }
      catch (e) { toast.error("แก้ไขไม่สำเร็จ", e.message); throw e; }
    },
    deleteLocation: async (name) => {
      try { await api.deleteLocation(name); setLocations((prev) => prev.filter((s) => s !== name)); toast.error("ลบที่จัดเก็บแล้ว", name); }
      catch (e) { toast.error("ลบไม่สำเร็จ", e.message); throw e; }
    },
    addDepartment: async (name) => {
      try { const r = await api.addDepartment(name); setDepartments((prev) => [...prev, r.name]); toast.success("เพิ่มแผนกแล้ว", r.name); }
      catch (e) { toast.error("เพิ่มไม่สำเร็จ", e.message); throw e; }
    },
    renameDepartment: async (from, to) => {
      try { await api.renameDepartment(from, to); setDepartments((prev) => prev.map((s) => (s === from ? to : s))); setMoves((prev) => prev.map((m) => (m.type === "out" && m.party === from ? { ...m, party: to } : m))); toast.success("แก้ไขแผนกแล้ว", `${from} → ${to}`); }
      catch (e) { toast.error("แก้ไขไม่สำเร็จ", e.message); throw e; }
    },
    deleteDepartment: async (name) => {
      try { await api.deleteDepartment(name); setDepartments((prev) => prev.filter((s) => s !== name)); toast.error("ลบแผนกแล้ว", name); }
      catch (e) { toast.error("ลบไม่สำเร็จ", e.message); throw e; }
    },
  };

  const handleEditBranch = async (id, payload) => {
    try {
      const r = await api.updateBranch(id, payload);
      setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...r.branch } : b)));
      setEditBranch(null);
      toast.success("แก้ไขสาขาแล้ว", `${r.branch.th} (${r.branch.code})`);
    } catch (e) { toast.error("แก้ไขไม่สำเร็จ", e.message); }
  };

  const handleDeleteBranch = async (branch) => {
    try {
      await api.deleteBranch(branch.id);
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
      setStock((prev) => { const n = { ...prev }; delete n[branch.id]; return n; });
      if (branchId === branch.id) setBranchId("hq");
      setConfirmDelBranch(null);
      toast.error("ลบสาขาแล้ว", `${branch.th} (${branch.code})`);
    } catch (e) { toast.error("ลบไม่สำเร็จ", e.message); setConfirmDelBranch(null); }
  };

  const onReceive = (item) => { setDetail(null); setQuick({ mode: "in", presetId: item && item.id }); };
  const onIssue = (item) => { setDetail(null); setQuick({ mode: "out", presetId: item && item.id }); };
  const openItem = (it) => setDetail(it);

  const detailLive = detail ? items.find((i) => i.id === detail.id) : null;
  const meta = PAGE_META[page];
  const subtitle = `${meta.en} · ${currentBranch.th}${currentBranch.isHQ ? " (HQ)" : ""}`;

  return (
   <RefDataProvider categories={categories} suppliers={suppliers} locations={locations} departments={departments}>
    <div className="app">
      <Sidebar page={page} setPage={(p) => { setPage(p); setSearch(""); }} lowCount={lowCount}
        onOpenTweaks={() => setTweaksOpen(true)} me={me} onLogout={onLogout} />
      <div className="main">
        <TopBar title={meta.th} subtitle={subtitle} search={search} setSearch={setSearch}
          onReceive={() => onReceive()} onIssue={() => onIssue()} lowCount={lowCount}
          onBell={() => { setPage("stock"); }}
          branches={branches} branchId={branchId} setBranchId={switchBranch} stock={stock} products={master}
          onAddBranch={canManageUsers ? () => setAddBranch(true) : null}
          onEditBranch={canManageUsers ? (b) => setEditBranch(b) : null}
          onDeleteBranch={canManageUsers ? (b) => setConfirmDelBranch(b) : null} />
        <div className="content">
          <div key={page + ":" + branchId}>
            {page === "dashboard" && <Dashboard items={items} moves={branchMoves} setPage={setPage} openItem={openItem} onReceive={onReceive} onIssue={onIssue} />}
            {page === "receive" && <FlowPage mode="in" items={items} moves={branchMoves} onSubmit={applyMove} openItem={openItem} />}
            {page === "issue" && <FlowPage mode="out" items={items} moves={branchMoves} onSubmit={applyMove} openItem={openItem} />}
            {page === "stock" && <StockPage items={items} search={search} openItem={openItem} />}
            {page === "items" && <ItemsPage items={items} search={search} openItem={openItem} isHQ={isHQLevel} onAddProduct={() => setAddProduct(true)} />}
            {page === "report" && <ReportPage items={items} moves={branchMoves} search={search} toast={toast} />}
            {page === "refdata" && isHQLevel && <RefDataPage products={master} ops={refOps} toast={toast} />}
            {page === "users" && canManageUsers && <UsersPage branches={branches} me={me} toast={toast} />}
          </div>
        </div>
      </div>

      {/* Item detail drawer */}
      <Drawer open={!!detailLive} onClose={() => setDetail(null)}>
        <ItemDetail item={detailLive} moves={branchMoves} onClose={() => setDetail(null)} onReceive={onReceive} onIssue={onIssue}
          isHQ={isHQLevel} onDelete={(it) => setConfirmDel(it)} branchName={currentBranch.th} />
      </Drawer>

      {/* Quick receive/issue drawer */}
      <Drawer open={!!quick} onClose={() => setQuick(null)}>
        {quick && (
          <>
            <div style={{ padding: "22px 24px", borderBottom: "1px solid var(--border)" }}>
              <div className="spread">
                <div className="row" style={{ gap: 13 }}>
                  <div className="stat-ico" style={{ margin: 0, background: quick.mode === "in" ? "var(--primary-soft)" : "var(--blue-soft)", color: quick.mode === "in" ? "var(--primary)" : "var(--blue)" }}>
                    <Icon name={quick.mode === "in" ? "inbox" : "outbox"} size={22} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="h2" style={{ lineHeight: 1.2 }}>{quick.mode === "in" ? "รับสินค้าเข้า" : "จ่ายสินค้าออก"}</div>
                    <div className="muted" style={{ fontSize: 13 }}>{quick.mode === "in" ? "Receiving" : "Issue"} · {currentBranch.th}</div>
                  </div>
                </div>
                <button className="icon-btn" onClick={() => setQuick(null)}><Icon name="x" size={18} /></button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <StockForm mode={quick.mode} items={items} presetId={quick.presetId} compact
                onSubmit={(p) => { applyMove(p); setQuick(null); }} />
            </div>
          </>
        )}
      </Drawer>

      {/* HQ admin modals */}
      <AddProductModal open={addProduct} onClose={() => setAddProduct(false)} onSubmit={handleAddProduct}
        existingIds={master.map((m) => m.id)} />
      <AddBranchModal open={addBranch} onClose={() => setAddBranch(false)} onSubmit={handleAddBranch}
        existingCodes={branches.map((b) => b.code.toUpperCase())} />
      <EditBranchModal branch={editBranch} onClose={() => setEditBranch(null)} onSubmit={handleEditBranch}
        existingCodes={branches.filter((b) => b.id !== editBranch?.id).map((b) => b.code.toUpperCase())} />
      <ConfirmDeleteBranchModal branch={confirmDelBranch} onClose={() => setConfirmDelBranch(null)} onConfirm={handleDeleteBranch} />
      <ConfirmDeleteModal item={confirmDel} onClose={() => setConfirmDel(null)} onConfirm={handleDeleteProduct} />

      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)}>
        <TweakSection label="ธีมสี · Accent" />
        <TweakColor label="สีหลัก" value={t.accent}
          options={["#6366f1", "#2563eb", "#0f766e", "#7c3aed"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="ความหนาแน่น · Density" />
        <TweakRadio label="ระยะห่าง" value={t.density}
          options={["compact", "regular", "comfy"]}
          onChange={(v) => setTweak("density", v)} />
      </TweaksPanel>
    </div>
   </RefDataProvider>
  );
}
