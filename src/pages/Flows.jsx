/* ============================================================
   Receiving + Issue flows (shared StockForm) and pages
   ============================================================ */
import React from "react";
import { INV as FD } from "../data.js";
import { Icon } from "../icons.jsx";
import { CountUp } from "../charts.jsx";
import { Field, Stepper, SectionHead, ItemThumb, StatusBadge } from "../components.jsx";
import { useRefData } from "../refdata.jsx";

/* ---- Searchable item picker ---- */
export function ItemPicker({ items, value, onChange, placeholder = "เลือกสินค้า…" }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const sel = items.find((i) => i.id === value);
  const filtered = items.filter((i) =>
    (i.nameTh + i.nameEn + i.sku).toLowerCase().includes(q.toLowerCase())
  ).slice(0, 40);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="input" style={{ display: "flex", alignItems: "center", gap: 11, textAlign: "left", cursor: "pointer", minHeight: 46 }} onClick={() => setOpen((o) => !o)}>
        {sel ? (
          <>
            <ItemThumb item={sel} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sel.nameTh}</div>
            </div>
            <span className="item-sku">{sel.sku}</span>
          </>
        ) : <span className="muted-3" style={{ flex: 1 }}>{placeholder}</span>}
        <Icon name="arrowDown" size={16} color="var(--text-3)" />
      </button>
      {open && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50, boxShadow: "var(--sh-lg)", overflow: "hidden", animation: "popIn .2s ease both" }}>
          <div style={{ padding: 10, borderBottom: "1px solid var(--border)" }}>
            <div className="search" style={{ minWidth: 0, padding: "8px 12px" }}>
              <Icon name="search" size={15} />
              <input autoFocus placeholder="ค้นหา…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {filtered.map((it) => (
              <button key={it.id} type="button" className="row" style={{ width: "100%", gap: 11, padding: "10px 12px", border: 0, background: it.id === value ? "var(--primary-softer)" : "transparent", cursor: "pointer", textAlign: "left" }}
                onClick={() => { onChange(it.id); setOpen(false); setQ(""); }}>
                <ItemThumb item={it} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{it.nameTh}</div>
                  <div className="item-sku">{it.sku} · คงเหลือ {FD.fmt(it.qty)} {it.unit}</div>
                </div>
                <StatusBadge item={it} />
              </button>
            ))}
            {filtered.length === 0 && <div className="empty" style={{ padding: 30 }}>ไม่พบสินค้า</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Shared form ---- */
export function StockForm({ mode, items, onSubmit, presetId, compact }) {
  const isIn = mode === "in";
  const { suppliers } = useRefData();
  const [itemId, setItemId] = React.useState(presetId || "");
  const [qty, setQty] = React.useState(0);
  const [party, setParty] = React.useState(isIn ? (suppliers[0] || "") : FD.DEPARTMENTS[0]);
  const [ref, setRef] = React.useState("");
  const [note, setNote] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => { if (presetId) setItemId(presetId); }, [presetId]);
  React.useEffect(() => {
    const p = isIn ? (Math.random() < .5 ? "GRN" : "PO") : (Math.random() < .5 ? "RQ" : "ISS");
    setRef(p + "-" + Math.floor(10000 + Math.random() * 89999));
  }, [mode]);

  const item = items.find((i) => i.id === itemId);
  const overIssue = !isIn && item && qty > item.qty;
  const errItem = touched && !itemId;
  const errQty = touched && (!qty || qty <= 0);
  const canSubmit = itemId && qty > 0 && !overIssue;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    onSubmit({ type: mode, itemId, qty, party, ref, note });
    setItemId(presetId || ""); setQty(0); setNote(""); setTouched(false);
    const p = isIn ? "GRN" : "RQ";
    setRef(p + "-" + Math.floor(10000 + Math.random() * 89999));
  };

  return (
    <form onSubmit={submit} className="col" style={{ gap: 16 }}>
      <Field label="สินค้า · Item" req error={errItem ? "กรุณาเลือกสินค้า" : null}>
        <ItemPicker items={items} value={itemId} onChange={setItemId} />
      </Field>

      {item && (
        <div className="row" style={{ gap: 12, padding: 13, borderRadius: 12, background: isIn ? "var(--primary-softer)" : "var(--surface-3)", border: "1px solid var(--border)" }}>
          <div style={{ flex: 1 }}>
            <div className="muted-3" style={{ fontSize: 11 }}>คงเหลือปัจจุบัน</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{FD.fmt(item.qty)} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-3)" }}>{item.unit}</span></div>
          </div>
          <Icon name="arrowRight" size={18} color="var(--text-3)" />
          <div style={{ flex: 1 }}>
            <div className="muted-3" style={{ fontSize: 11 }}>หลังทำรายการ</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: isIn ? "var(--green)" : (overIssue ? "var(--red)" : "var(--text)") }}>
              {FD.fmt(isIn ? item.qty + qty : Math.max(0, item.qty - qty))} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-3)" }}>{item.unit}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <Field label="จำนวน · Qty" req error={errQty ? "ระบุจำนวน" : (overIssue ? "เกินจำนวนคงเหลือ" : null)}>
          <Stepper value={qty} onChange={setQty} step={isIn ? 10 : 5} />
        </Field>
        <Field label="เลขที่อ้างอิง · Ref">
          <input className="input mono" value={ref} onChange={(e) => setRef(e.target.value)} />
        </Field>
      </div>

      <Field label={isIn ? "ผู้จำหน่าย · Supplier" : "แผนก / ปลายทาง · Department"} req>
        <select className="input" value={party} onChange={(e) => setParty(e.target.value)}>
          {(isIn ? suppliers : FD.DEPARTMENTS).map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>

      <Field label="หมายเหตุ · Note">
        <textarea className="input" rows={compact ? 2 : 3} placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <button type="submit" className="btn btn-primary" disabled={!canSubmit} style={{ justifyContent: "center", padding: "13px", fontSize: 15 }}>
        <Icon name={isIn ? "inbox" : "outbox"} size={18} />
        {isIn ? "บันทึกการรับเข้า" : "บันทึกการจ่ายออก"}
      </button>
    </form>
  );
}

/* ---- Full page (form + recent of this type) ---- */
export function FlowPage({ mode, items, moves, onSubmit, openItem }) {
  const isIn = mode === "in";
  const recent = moves.filter((m) => m.type === mode).slice(0, 8);
  const todayStr = FD.TODAY.toISOString().slice(0, 10);
  const todayList = moves.filter((m) => m.type === mode && m.date === todayStr);
  const todayQty = todayList.reduce((s, m) => s + m.qty, 0);

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 18, alignItems: "start" }}>
      <div className="card card-pad fade-up" style={{ position: "sticky", top: 90 }}>
        <div className="row" style={{ gap: 12, marginBottom: 18 }}>
          <div className="stat-ico" style={{ margin: 0, background: isIn ? "var(--primary-soft)" : "var(--blue-soft)", color: isIn ? "var(--primary)" : "var(--blue)" }}>
            <Icon name={isIn ? "inbox" : "outbox"} size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="h2" style={{ lineHeight: 1.2 }}>{isIn ? "รับสินค้าเข้าคลัง" : "จ่ายสินค้าออก"}</div>
            <div className="muted" style={{ fontSize: 13 }}>{isIn ? "Receiving · เพิ่มสต๊อก" : "Issue · ตัดสต๊อก"}</div>
          </div>
        </div>
        <StockForm mode={mode} items={items} onSubmit={onSubmit} />
      </div>

      <div className="col" style={{ gap: 18 }}>
        <div className="grid-2">
          <div className="stat fade-up">
            <div className="stat-ico" style={{ background: "var(--green-soft)", color: "var(--green)" }}><Icon name="calendar" size={20} /></div>
            <div className="stat-val"><CountUp value={todayList.length} /></div>
            <div className="stat-label">รายการ{isIn ? "รับเข้า" : "จ่ายออก"}วันนี้</div>
          </div>
          <div className="stat fade-up">
            <div className="stat-ico" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}><Icon name="layers" size={20} /></div>
            <div className="stat-val"><CountUp value={todayQty} /></div>
            <div className="stat-label">จำนวนรวมวันนี้ (หน่วย)</div>
          </div>
        </div>

        <div className="card card-pad fade-up">
          <SectionHead title={isIn ? "ประวัติการรับเข้าล่าสุด" : "ประวัติการจ่ายออกล่าสุด"} sub={recent.length + " รายการ"} />
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>อ้างอิง</th><th>สินค้า</th><th>{isIn ? "ผู้จำหน่าย" : "แผนก"}</th><th className="th-right">จำนวน</th><th className="th-right">โดย / เวลา</th></tr></thead>
              <tbody>
                {recent.map((m) => {
                  const it = items.find((i) => i.id === m.sku);
                  return (
                    <tr key={m.id} className="row-click" onClick={() => it && openItem(it)}>
                      <td className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{m.ref}</td>
                      <td><div className="item-cell"><ItemThumb item={m} size={32} /><div><div className="item-name" style={{ fontSize: 13 }}>{m.nameTh}</div><div className="item-sku">{m.sku}</div></div></div></td>
                      <td className="muted" style={{ fontSize: 13 }}>{m.party}</td>
                      <td className="td-right num" style={{ fontWeight: 700, color: isIn ? "var(--green)" : "var(--text)" }}>{isIn ? "+" : "−"}{FD.fmt(m.qty)} <span className="muted-3" style={{ fontWeight: 400, fontSize: 12 }}>{m.unit}</span></td>
                      <td className="td-right"><div style={{ fontSize: 12 }} className="muted">{m.by}</div><div className="muted-3" style={{ fontSize: 11 }}>{FD.relDay(m.date)} · {FD.fmtTime(m.ts)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlowPage;
