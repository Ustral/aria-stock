/* ============================================================
   Stock on Hand, Item Master, and Item Detail drawer
   ============================================================ */
import React from "react";
import { INV as SD } from "../data.js";
import { Icon } from "../icons.jsx";
import { Donut } from "../charts.jsx";
import { ItemThumb, StatusBadge, SectionHead } from "../components.jsx";
import { useRefData } from "../refdata.jsx";

function Filters({ items, cat, setCat, status, setStatus }) {
  const { categories } = useRefData();
  const counts = { all: items.length, ok: 0, low: 0, out: 0 };
  items.forEach((it) => { counts[SD.statusOf(it)]++; });
  return (
    <div className="spread" style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
      <div className="wrap-gap">
        <button className={"chip" + (cat === "all" ? " active" : "")} onClick={() => setCat("all")}>ทุกหมวด</button>
        {categories.map((c) => (
          <button key={c.id} className={"chip" + (cat === c.id ? " active" : "")} onClick={() => setCat(c.id)}>
            <span>{c.icon}</span>{c.th}
          </button>
        ))}
      </div>
      <div className="wrap-gap">
        {[["all", "ทั้งหมด", counts.all], ["ok", "ปกติ", counts.ok], ["low", "ใกล้หมด", counts.low], ["out", "หมด", counts.out]].map(([k, l, n]) => (
          <button key={k} className={"chip" + (status === k ? " active" : "")} onClick={() => setStatus(k)}>
            {l} <span className="num" style={{ opacity: .6 }}>{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function useFiltered(items, search, cat, status) {
  return React.useMemo(() => items.filter((it) => {
    if (cat !== "all" && it.cat !== cat) return false;
    if (status !== "all" && SD.statusOf(it) !== status) return false;
    if (search && !(it.nameTh + it.nameEn + it.sku).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, search, cat, status]);
}

/* ---------------- Stock on Hand (table) ---------------- */
export function StockPage({ items, search, openItem }) {
  const { catOf } = useRefData();
  const [cat, setCat] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState({ key: "qty", dir: "asc" });
  let rows = useFiltered(items, search, cat, status);
  rows = [...rows].sort((a, b) => {
    let av, bv;
    if (sort.key === "name") { av = a.nameTh; bv = b.nameTh; }
    else if (sort.key === "value") { av = a.qty * a.cost; bv = b.qty * b.cost; }
    else av = a[sort.key], bv = b[sort.key];
    const r = av > bv ? 1 : av < bv ? -1 : 0;
    return sort.dir === "asc" ? r : -r;
  });
  const setSortKey = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  const Th = ({ k, children, right }) => (
    <th className={right ? "th-right" : ""} style={{ cursor: "pointer", userSelect: "none" }} onClick={() => setSortKey(k)}>
      <span className="row" style={{ gap: 5, justifyContent: right ? "flex-end" : "flex-start" }}>{children}{sort.key === k && <Icon name={sort.dir === "asc" ? "arrowUp" : "arrowDown"} size={12} stroke={2.5} />}</span>
    </th>
  );

  return (
    <div className="page">
      <Filters items={items} cat={cat} setCat={setCat} status={status} setStatus={setStatus} />
      <div className="card fade-up" style={{ overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr>
              <Th k="name">สินค้า</Th>
              <th>หมวด</th>
              <th>ที่จัดเก็บ</th>
              <Th k="qty" right>คงเหลือ</Th>
              <th className="th-right">ระดับสต๊อก</th>
              <Th k="value" right>มูลค่า</Th>
              <th className="th-right">สถานะ</th>
            </tr></thead>
            <tbody>
              {rows.map((it) => {
                const cat = catOf(it.cat);
                const pct = Math.min(100, Math.round((it.qty / it.par) * 100));
                const st = SD.statusOf(it);
                return (
                  <tr key={it.id} className="row-click" onClick={() => openItem(it)}>
                    <td><div className="item-cell"><ItemThumb item={it} /><div><div className="item-name">{it.nameTh}</div><div className="item-sku">{it.sku} · {it.nameEn}</div></div></div></td>
                    <td><span className="badge neutral">{cat.icon} {cat.th}</span></td>
                    <td className="muted" style={{ fontSize: 13 }}><span className="row" style={{ gap: 5 }}><Icon name="pin" size={14} color="var(--text-3)" />{it.loc}</span></td>
                    <td className="td-right"><span className="num" style={{ fontWeight: 700, fontSize: 15 }}>{SD.fmt(it.qty)}</span> <span className="muted-3" style={{ fontSize: 12 }}>{it.unit}</span></td>
                    <td style={{ width: 150 }}>
                      <div className="bar-track"><div className="bar-fill" style={{ width: pct + "%", background: st === "out" ? "var(--red)" : st === "low" ? "var(--amber)" : "var(--accent-grad)" }} /></div>
                      <div className="muted-3 num" style={{ fontSize: 11, marginTop: 4, textAlign: "right" }}>{pct}% ของ par</div>
                    </td>
                    <td className="td-right num muted" style={{ fontWeight: 600 }}>{SD.baht(it.qty * it.cost)}</td>
                    <td className="td-right"><StatusBadge item={it} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="empty">ไม่พบสินค้าตามเงื่อนไข</div>}
      </div>
    </div>
  );
}

/* ---------------- Item Master (grid of cards) ---------------- */
export function ItemsPage({ items, search, openItem, isHQ, onAddProduct }) {
  const { catOf } = useRefData();
  const [cat, setCat] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const rows = useFiltered(items, search, cat, status);
  return (
    <div className="page">
      <div className="spread" style={{ marginBottom: 16, gap: 12 }}>
        <div>
          <div className="h2">แคตตาล็อกสินค้า · Catalog</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{items.length} รายการในแคตตาล็อกกลาง · แสดง {rows.length}</div>
        </div>
        {isHQ
          ? <button className="btn btn-primary btn-sm" onClick={onAddProduct}><Icon name="plus" size={16} stroke={2.6} />เพิ่มสินค้า</button>
          : <span className="badge neutral"><Icon name="alert" size={13} />จัดการสินค้าได้ที่สำนักงานใหญ่</span>}
      </div>
      <Filters items={items} cat={cat} setCat={setCat} status={status} setStatus={setStatus} />
      <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {rows.map((it) => {
          const cat = catOf(it.cat);
          const pct = Math.min(100, Math.round((it.qty / it.par) * 100));
          const st = SD.statusOf(it);
          return (
            <div key={it.id} className="card card-pad card-hover" style={{ cursor: "pointer" }} onClick={() => openItem(it)}>
              <div className="spread" style={{ marginBottom: 14 }}>
                <ItemThumb item={it} size={48} />
                <StatusBadge item={it} />
              </div>
              <div className="h3" style={{ fontSize: 15 }}>{it.nameTh}</div>
              <div className="muted-3" style={{ fontSize: 12, marginTop: 2 }}>{it.nameEn}</div>
              <div className="mono muted-3" style={{ fontSize: 12, marginTop: 8 }}>{it.sku}</div>
              <div className="divider" style={{ margin: "14px 0" }} />
              <div className="spread" style={{ marginBottom: 9 }}>
                <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>{SD.fmt(it.qty)}</span>
                <span className="muted-3" style={{ fontSize: 12 }}>{it.unit} · par {SD.fmt(it.par)}</span>
              </div>
              <div className="bar-track"><div className="bar-fill" style={{ width: pct + "%", background: st === "out" ? "var(--red)" : st === "low" ? "var(--amber)" : "var(--accent-grad)" }} /></div>
              <div className="spread" style={{ marginTop: 12, fontSize: 12 }}>
                <span className="muted row" style={{ gap: 5 }}><Icon name="pin" size={13} color="var(--text-3)" />{it.loc}</span>
                <span className="muted num" style={{ fontWeight: 600 }}>{SD.baht(it.qty * it.cost)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {rows.length === 0 && <div className="card empty">ไม่พบสินค้าตามเงื่อนไข</div>}
    </div>
  );
}

/* ---------------- Item detail drawer ---------------- */
export function ItemDetail({ item, moves, onClose, onReceive, onIssue, isHQ, onDelete, branchName }) {
  const { catOf } = useRefData();
  if (!item) return null;
  const cat = catOf(item.cat);
  const st = SD.statusOf(item);
  const cfg = SD.STATUS_LABEL[st];
  const pct = Math.min(100, Math.round((item.qty / item.par) * 100));
  const hist = moves.filter((m) => m.sku === item.id).slice(0, 12);
  const inSum = moves.filter((m) => m.sku === item.id && m.type === "in").reduce((s, m) => s + m.qty, 0);
  const outSum = moves.filter((m) => m.sku === item.id && m.type === "out").reduce((s, m) => s + m.qty, 0);

  // gauge
  const gaugePct = Math.min(100, (item.qty / item.par) * 100);
  const ringColor = st === "out" ? "var(--red)" : st === "low" ? "var(--amber)" : "var(--primary)";

  const Stat2 = ({ label, value, color }) => (
    <div style={{ flex: 1, padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div className="muted-3" style={{ fontSize: 11 }}>{label}</div>
      <div className="num" style={{ fontSize: 19, fontWeight: 700, color: color || "var(--text)", marginTop: 3 }}>{value}</div>
    </div>
  );

  return (
    <>
      {/* header */}
      <div style={{ padding: "22px 24px", borderBottom: "1px solid var(--border)", background: "linear-gradient(180deg, " + cat.soft + ", transparent)" }}>
        <div className="spread">
          <div className="row" style={{ gap: 14, minWidth: 0, flex: 1 }}>
            <div className="thumb" style={{ width: 56, height: 56, background: "#fff", fontSize: 28, boxShadow: "var(--sh-sm)", flex: "0 0 auto" }}>{cat.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div className="h1" style={{ fontSize: 21, lineHeight: 1.2 }}>{item.nameTh}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{item.nameEn}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 8, flex: "0 0 auto" }}>
            {isHQ && onDelete && (
              <button className="icon-btn" onClick={() => onDelete(item)} title="ลบสินค้า" style={{ color: "var(--red)" }}><Icon name="trash" size={17} /></button>
            )}
            <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
        </div>
        <div className="wrap-gap" style={{ marginTop: 14 }}>
          <span className="badge primary mono">{item.sku}</span>
          <span className="badge neutral">{cat.icon} {cat.th}</span>
          <span className={"badge " + cfg.cls}><span className="badge-dot" style={{ background: "currentColor" }} />{cfg.th}</span>
          {branchName && <span className="badge in"><Icon name="building" size={12} />{branchName}</span>}
        </div>
      </div>

      <div style={{ padding: 24, flex: 1 }}>
        {/* gauge + level */}
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div className="row" style={{ gap: 22 }}>
            <div style={{ position: "relative", flex: "0 0 auto" }}>
              <Donut segments={[{ value: gaugePct, color: ringColor }, { value: 100 - gaugePct, color: "var(--surface-3)" }]} size={132} thickness={14}
                center={<div><div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{SD.fmt(item.qty)}</div><div className="muted-3" style={{ fontSize: 11 }}>{item.unit}</div></div>} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>ระดับเทียบ par ({pct}%)</div>
              {[["par (เป้าหมาย)", item.par], ["จุดสั่งซื้อ (reorder)", item.reorder], ["คงเหลือปัจจุบัน", item.qty]].map(([l, v], i) => (
                <div key={i} className="spread" style={{ fontSize: 13, padding: "6px 0" }}>
                  <span className="muted">{l}</span><span className="num" style={{ fontWeight: 700 }}>{SD.fmt(v)} {item.unit}</span>
                </div>
              ))}
            </div>
          </div>
          {st !== "ok" && (
            <div className="row" style={{ gap: 9, marginTop: 14, padding: 12, borderRadius: 10, background: "var(--amber-soft)", color: "#b26a00", fontSize: 13 }}>
              <Icon name="alert" size={17} /> สินค้าต่ำกว่าจุดสั่งซื้อ ควรสั่งเพิ่มประมาณ <b className="num">{SD.fmt(Math.max(0, item.par - item.qty))}</b> {item.unit}
            </div>
          )}
        </div>

        {/* properties */}
        <div className="row" style={{ gap: 12, marginBottom: 18 }}>
          <Stat2 label="รับเข้าสะสม" value={"+" + SD.fmt(inSum)} color="var(--green)" />
          <Stat2 label="จ่ายออกสะสม" value={"−" + SD.fmt(outSum)} />
          <Stat2 label="มูลค่าคงเหลือ" value={SD.baht(item.qty * item.cost)} />
        </div>

        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div className="grid-2" style={{ gap: "12px 18px", fontSize: 13 }}>
            {[["ที่จัดเก็บ", item.loc], ["ผู้จำหน่ายหลัก", item.supplier], ["ต้นทุน/หน่วย", SD.baht(item.cost)], ["หน่วยนับ", item.unit]].map(([l, v], i) => (
              <div key={i} className="spread"><span className="muted">{l}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
            ))}
          </div>
        </div>

        {/* history */}
        <SectionHead title="ประวัติการเคลื่อนไหว" sub={hist.length + " รายการล่าสุด"} />
        <div className="col" style={{ gap: 0 }}>
          {hist.map((m, i) => (
            <div key={m.id} className="row" style={{ gap: 12, padding: "11px 0", borderBottom: i < hist.length - 1 ? "1px solid var(--border)" : 0 }}>
              <div className="thumb" style={{ width: 34, height: 34, background: m.type === "in" ? "var(--green-soft)" : "var(--surface-3)", color: m.type === "in" ? "var(--green)" : "var(--text-2)" }}>
                <Icon name={m.type === "in" ? "arrowDown" : "arrowUp"} size={16} stroke={2.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.type === "in" ? "รับเข้า" : "จ่ายออก"} · <span className="mono muted-3" style={{ fontWeight: 400 }}>{m.ref}</span></div>
                <div className="muted-3" style={{ fontSize: 12 }}>{m.party} · {m.by}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="num" style={{ fontWeight: 700, color: m.type === "in" ? "var(--green)" : "var(--text)" }}>{m.type === "in" ? "+" : "−"}{SD.fmt(m.qty)}</div>
                <div className="muted-3" style={{ fontSize: 11 }}>{SD.relDay(m.date)}</div>
              </div>
            </div>
          ))}
          {hist.length === 0 && <div className="empty">ยังไม่มีการเคลื่อนไหว</div>}
        </div>
      </div>

      {/* footer actions */}
      <div className="row" style={{ gap: 12, padding: 18, borderTop: "1px solid var(--border)", position: "sticky", bottom: 0, background: "var(--surface)" }}>
        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => onIssue(item)}><Icon name="outbox" size={17} />จ่ายออก</button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onReceive(item)}><Icon name="inbox" size={17} />รับเข้า</button>
      </div>
    </>
  );
}
