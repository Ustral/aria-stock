/* ============================================================
   Shared UI — Toast, Sidebar, TopBar, StatCard, Badge, primitives
   ============================================================ */
import React, { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } from "react";
import { Icon } from "./icons.jsx";
import { Sparkline, CountUp } from "./charts.jsx";
import { INV as I } from "./data.js";
import { useRefData } from "./refdata.jsx";

/* ---------------- Toast system ---------------- */
const ToastCtx = createContext(null);
export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => {
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 300);
  }, []);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => remove(id), 3400);
  }, [remove]);
  const api = useMemo(() => ({
    success: (title, msg) => push({ kind: "success", title, msg }),
    info: (title, msg) => push({ kind: "info", title, msg }),
    warn: (title, msg) => push({ kind: "warn", title, msg }),
    error: (title, msg) => push({ kind: "error", title, msg }),
  }), [push]);

  const MAP = {
    success: { ico: "check", bg: "var(--green-soft)", fg: "var(--green)" },
    info: { ico: "package2", bg: "var(--primary-soft)", fg: "var(--primary)" },
    warn: { ico: "alert", bg: "var(--amber-soft)", fg: "var(--amber)" },
    error: { ico: "x", bg: "var(--red-soft)", fg: "var(--red)" },
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => {
          const m = MAP[t.kind] || MAP.info;
          return (
            <div key={t.id} className={"toast" + (t.leaving ? " out" : "")} style={{ position: "relative", overflow: "hidden" }}>
              <div className="toast-ico" style={{ background: m.bg, color: m.fg }}><Icon name={m.ico} size={18} /></div>
              <div style={{ flex: 1 }}>
                <div className="toast-title">{t.title}</div>
                {t.msg && <div className="toast-msg">{t.msg}</div>}
              </div>
              <button className="icon-btn" style={{ width: 28, height: 28, border: 0, background: "transparent" }} onClick={() => remove(t.id)}>
                <Icon name="x" size={15} />
              </button>
              <div className="toast-bar" />
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- Item thumbnail ---------------- */
export function ItemThumb({ item, size = 40 }) {
  const { catOf } = useRefData();
  const cat = catOf(item.cat);
  return (
    <div className="thumb" style={{ width: size, height: size, background: cat.soft, fontSize: size * 0.45 }}>
      {cat.icon}
    </div>
  );
}

/* ---------------- Badge for stock status ---------------- */
export function StatusBadge({ item, lang = "th" }) {
  const st = I.statusOf(item);
  const cfg = I.STATUS_LABEL[st];
  return <span className={"badge " + cfg.cls}><span className="badge-dot" style={{ background: "currentColor" }} />{lang === "th" ? cfg.th : cfg.en}</span>;
}

/* ---------------- Stat card ---------------- */
export function StatCard({ icon, iconBg, iconFg, value, label, delta, deltaDir, suffix, prefix, format, spark }) {
  const positive = deltaDir !== "down";
  return (
    <div className="stat">
      {spark && <div className="stat-spark"><Sparkline data={spark} color={iconFg} /></div>}
      <div className="stat-ico" style={{ background: iconBg, color: iconFg }}><Icon name={icon} size={22} /></div>
      <div className="stat-val">
        {prefix}<CountUp value={value} format={format} />{suffix}
      </div>
      <div className="stat-label">{label}</div>
      {delta != null && (
        <div className="stat-delta" style={{ background: positive ? "var(--green-soft)" : "var(--red-soft)", color: positive ? "var(--green)" : "var(--red)" }}>
          <Icon name={positive ? "arrowUp" : "arrowDown"} size={13} stroke={2.5} />{delta}
        </div>
      )}
    </div>
  );
}

/* ---------------- Sidebar ---------------- */
export const NAV = [
  { id: "dashboard", icon: "dashboard", th: "ภาพรวม", en: "Dashboard" },
  { id: "receive", icon: "inbox", th: "รับเข้า", en: "Receiving" },
  { id: "issue", icon: "outbox", th: "จ่ายออก", en: "Issue" },
  { id: "stock", icon: "layers", th: "สินค้าคงเหลือ", en: "Stock on Hand" },
  { id: "items", icon: "box", th: "ข้อมูลสินค้า", en: "Item Master" },
  { id: "report", icon: "chart", th: "รายงานเคลื่อนไหว", en: "Movement Report" },
];

export function Sidebar({ page, setPage, lowCount, onOpenTweaks, me, onLogout }) {
  const avatarCh = (me?.name || "?").trim().replace(/^คุณ/, "")[0] || "?";
  const hqLevel = me?.role === "hq" || me?.role === "manager";
  const nav = [
    ...NAV,
    ...(hqLevel ? [{ id: "refdata", icon: "tag", th: "ข้อมูลอ้างอิง", en: "Reference Data" }] : []),
    ...(me?.role === "hq" ? [{ id: "users", icon: "users", th: "จัดการผู้ใช้งาน", en: "Users" }] : []),
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Icon name="warehouse" size={21} color="#fff" /></div>
        <div>
          <div className="brand-name">Aria Stock</div>
          <div className="brand-sub">Hotel Inventory</div>
        </div>
      </div>
      <div className="nav-label">เมนูหลัก · Main</div>
      <nav className="nav">
        {nav.map((n) => (
          <button key={n.id} className={"nav-item" + (page === n.id ? " active" : "")} onClick={() => setPage(n.id)}>
            <Icon name={n.icon} size={19} className="ni-icon" />
            <span>{n.th}</span>
            {n.id === "stock" && lowCount > 0 && <span className="nav-badge">{lowCount}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="avatar">{avatarCh}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me?.name || "ผู้ใช้"}</div>
            <div style={{ fontSize: 11, color: "#6b7585", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me?.title || ""}</div>
          </div>
          <div className="row" style={{ marginLeft: "auto", gap: 2, flex: "0 0 auto" }}>
            <button title="ตั้งค่า · Tweaks" onClick={onOpenTweaks}
              style={{ border: 0, background: "transparent", color: "#6b7585", cursor: "pointer", padding: 4, display: "grid", placeItems: "center", borderRadius: 7 }}>
              <Icon name="settings" size={17} />
            </button>
            <button title="ออกจากระบบ · Logout" onClick={onLogout}
              style={{ border: 0, background: "transparent", color: "#6b7585", cursor: "pointer", padding: 4, display: "grid", placeItems: "center", borderRadius: 7 }}>
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ---------------- Branch switcher ---------------- */
export function BranchSwitcher({ branches, branchId, setBranchId, stock, products, onAddBranch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = branches.find((b) => b.id === branchId) || branches[0];
  const statsFor = (b) => {
    const s = stock[b.id] || {};
    let units = 0, low = 0;
    (products || []).forEach((it) => { const q = s[it.id] ?? 0; units += q; if (I.statusOf({ ...it, qty: q }) !== "ok") low++; });
    return { units, low };
  };
  const single = branches.length <= 1 && !onAddBranch;

  return (
    <div ref={ref} style={{ position: "relative", flex: "0 0 auto" }}>
      <button type="button" className="branch-btn" onClick={() => !single && setOpen((o) => !o)} style={single ? { cursor: "default" } : null}>
        <span className="branch-ico"><Icon name={cur.isHQ ? "warehouse" : "building"} size={17} /></span>
        <span className="col" style={{ alignItems: "flex-start", lineHeight: 1.15, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{cur.th}</span>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--text-3)" }}>{cur.code}{cur.isHQ ? " · HQ" : ""}</span>
        </span>
        {!single && <Icon name="chevronDown" size={15} color="var(--text-3)" style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }} />}
      </button>
      {open && !single && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: 320, zIndex: 60, boxShadow: "var(--sh-lg)", overflow: "hidden", animation: "popIn .2s ease both" }}>
          <div className="nav-label" style={{ color: "var(--text-3)", padding: "12px 14px 6px" }}>เลือกสาขา · Switch branch</div>
          <div style={{ maxHeight: 360, overflowY: "auto", padding: "0 8px 8px" }}>
            {branches.map((b) => {
              const st = statsFor(b);
              const active = b.id === branchId;
              return (
                <button key={b.id} type="button" className="branch-row" data-on={active ? "1" : "0"}
                  onClick={() => { setBranchId(b.id); setOpen(false); }}>
                  <span className="branch-ico" style={{ background: b.isHQ ? "var(--primary-soft)" : "var(--surface-3)", color: b.isHQ ? "var(--primary)" : "var(--text-2)" }}>
                    <Icon name={b.isHQ ? "warehouse" : "building"} size={16} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="row" style={{ gap: 7 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{b.th}</span>
                      {b.isHQ && <span className="badge primary" style={{ padding: "1px 7px", fontSize: 10 }}>HQ</span>}
                    </span>
                    <span className="muted-3" style={{ fontSize: 11.5 }}>{b.city} · {I.fmt(st.units)} หน่วย{st.low > 0 ? " · ใกล้หมด " + st.low : ""}</span>
                  </span>
                  {active && <Icon name="check" size={16} color="var(--primary)" stroke={2.6} />}
                </button>
              );
            })}
          </div>
          {onAddBranch && (
            <button type="button" className="branch-add" onClick={() => { setOpen(false); onAddBranch(); }}>
              <Icon name="plus" size={16} stroke={2.5} /> เพิ่มสาขาใหม่
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Modal (centered) ---------------- */
export function Modal({ open, onClose, children, width = 520 }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width }} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function ModalHeader({ icon, iconBg, iconFg, title, sub, onClose }) {
  return (
    <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--border)" }}>
      <div className="spread">
        <div className="row" style={{ gap: 13, minWidth: 0 }}>
          {icon && <div className="stat-ico" style={{ margin: 0, background: iconBg || "var(--primary-soft)", color: iconFg || "var(--primary)" }}><Icon name={icon} size={20} /></div>}
          <div style={{ minWidth: 0 }}>
            <div className="h2" style={{ lineHeight: 1.2 }}>{title}</div>
            {sub && <div className="muted" style={{ fontSize: 13 }}>{sub}</div>}
          </div>
        </div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
      </div>
    </div>
  );
}

/* ---------------- TopBar ---------------- */
export function TopBar({ title, subtitle, search, setSearch, onReceive, onIssue, lowCount, onBell, branches, branchId, setBranchId, stock, products, onAddBranch }) {
  return (
    <header className="topbar">
      <div style={{ minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
        <div className="h2" style={{ lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {subtitle && <div className="muted" style={{ fontSize: 13, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>}
      </div>
      {branches && <BranchSwitcher branches={branches} branchId={branchId} setBranchId={setBranchId} stock={stock} products={products} onAddBranch={onAddBranch} />}
      <div style={{ marginLeft: "auto", flex: "0 0 auto" }} className="row">
        <div className="search">
          <Icon name="search" size={17} />
          <input placeholder="ค้นหาสินค้า, SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="icon-btn" onClick={onBell} title="แจ้งเตือน">
          <Icon name="bell" size={18} />
          {lowCount > 0 && <span className="dot" />}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onIssue}><Icon name="outbox" size={16} />จ่ายออก</button>
        <button className="btn btn-primary btn-sm" onClick={onReceive}><Icon name="plus" size={16} stroke={2.6} />รับเข้า</button>
      </div>
    </header>
  );
}

/* ---------------- Field ---------------- */
export function Field({ label, req, hint, error, children }) {
  return (
    <div className="field">
      {label && <label>{label}{req && <span className="req"> *</span>}</label>}
      {children}
      {error ? <div className="hint err">{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

/* ---------------- Stepper ---------------- */
export function Stepper({ value, onChange, step = 1, min = 0, max = 99999 }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="stepper">
      <button type="button" onClick={() => set((value || 0) - step)}>−</button>
      <input className="num" value={value} onChange={(e) => { const v = parseInt(e.target.value.replace(/\D/g, "")) || 0; set(v); }} />
      <button type="button" onClick={() => set((value || 0) + step)}>+</button>
    </div>
  );
}

/* ---------------- Drawer ---------------- */
export function Drawer({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/* ---------------- Section header ---------------- */
export function SectionHead({ title, sub, right }) {
  return (
    <div className="card-head">
      <div>
        <div className="h3">{title}</div>
        {sub && <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}
