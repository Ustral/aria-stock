/* ============================================================
   Movement Report
   ============================================================ */
import React from "react";
import { INV as RD } from "../data.js";
import { Icon } from "../icons.jsx";
import { AreaChart } from "../charts.jsx";
import { StatCard, SectionHead, ItemThumb } from "../components.jsx";
import { useRefData } from "../refdata.jsx";

function exportCSV(rows, range, type, cat) {
  // BOM for Excel Thai UTF-8
  const BOM = "﻿";
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["วันที่", "เวลา", "ประเภท", "SKU", "ชื่อสินค้า (ไทย)", "ชื่อสินค้า (EN)", "หมวด", "จำนวน", "หน่วย", "เลขที่อ้างอิง", "คู่ค้า / แผนก", "ผู้ทำรายการ"];
  const lines = [header.map(esc).join(",")];
  rows.forEach((m) => {
    const typeLabel = m.type === "in" ? "รับเข้า" : "จ่ายออก";
    lines.push([
      RD.fmtDate(m.date), RD.fmtTime(m.ts), typeLabel,
      m.sku, m.nameTh, m.nameEn, m.cat,
      m.type === "out" ? -m.qty : m.qty, m.unit,
      m.ref, m.party, m.by,
    ].map(esc).join(","));
  });
  const csv = BOM + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const typeLabel = type === "all" ? "ทั้งหมด" : type === "in" ? "รับเข้า" : "จ่ายออก";
  a.download = `aria-stock_movement_${range}วัน_${typeLabel}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReportPage({ items, moves, search, toast }) {
  const { categories } = useRefData();
  const [type, setType] = React.useState("all");
  const [cat, setCat] = React.useState("all");
  const [range, setRange] = React.useState(30);

  const cutoff = React.useMemo(() => {
    const d = new Date(RD.TODAY); d.setDate(d.getDate() - range + 1);
    return d.toISOString().slice(0, 10);
  }, [range]);

  const filtered = React.useMemo(() => moves.filter((m) => {
    if (m.date < cutoff) return false;
    if (type !== "all" && m.type !== type) return false;
    if (cat !== "all" && m.cat !== cat) return false;
    if (search && !(m.nameTh + m.nameEn + m.sku + m.ref + m.party).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [moves, cutoff, type, cat, search]);

  const inSum = filtered.filter((m) => m.type === "in").reduce((s, m) => s + m.qty, 0);
  const outSum = filtered.filter((m) => m.type === "out").reduce((s, m) => s + m.qty, 0);

  // trend by day
  const days = [];
  for (let i = range - 1; i >= 0; i--) { const d = new Date(RD.TODAY); d.setDate(d.getDate() - i); days.push(d.toISOString().slice(0, 10)); }
  const stepLabel = Math.max(1, Math.floor(days.length / 7));
  const series = days.map((d) => filtered.filter((m) => m.date === d).reduce((s, m) => s + m.qty, 0));
  const labels = days.filter((_, i) => i % stepLabel === 0).map((d) => new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" }));

  return (
    <div className="page">
      {/* summary */}
      <div className="stat-grid stagger" style={{ marginBottom: 18 }}>
        <StatCard icon="history" iconBg="var(--primary-soft)" iconFg="var(--primary)" value={filtered.length} label={"รายการเคลื่อนไหว (" + range + " วัน)"} />
        <StatCard icon="arrowDown" iconBg="var(--green-soft)" iconFg="var(--green)" value={inSum} label="รับเข้ารวม (หน่วย)" />
        <StatCard icon="arrowUp" iconBg="var(--blue-soft)" iconFg="var(--blue)" value={outSum} label="จ่ายออกรวม (หน่วย)" />
        <StatCard icon="trend" iconBg={inSum - outSum >= 0 ? "var(--green-soft)" : "var(--red-soft)"} iconFg={inSum - outSum >= 0 ? "var(--green)" : "var(--red)"} value={Math.abs(inSum - outSum)} prefix={inSum - outSum >= 0 ? "+" : "−"} label="ยอดสุทธิ (Net)" />
      </div>

      {/* trend */}
      <div className="card card-pad fade-up" style={{ marginBottom: 18 }}>
        <SectionHead title="แนวโน้มการเคลื่อนไหว · Movement Trend" sub={"รวมปริมาณรายวัน " + range + " วัน"} />
        <AreaChart data={series} labels={labels} height={200} />
      </div>

      {/* filter bar */}
      <div className="card card-pad fade-up">
        <div className="spread" style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div className="wrap-gap">
            {[["all", "ทั้งหมด"], ["in", "รับเข้า"], ["out", "จ่ายออก"]].map(([k, l]) => (
              <button key={k} className={"chip" + (type === k ? " active" : "")} onClick={() => setType(k)}>{l}</button>
            ))}
            <span style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
            <button className={"chip" + (cat === "all" ? " active" : "")} onClick={() => setCat("all")}>ทุกหมวด</button>
            {categories.map((c) => <button key={c.id} className={"chip" + (cat === c.id ? " active" : "")} onClick={() => setCat(c.id)}>{c.icon} {c.th}</button>)}
          </div>
          <div className="wrap-gap">
            {[7, 14, 30, 60].map((r) => <button key={r} className={"chip" + (range === r ? " active" : "")} onClick={() => setRange(r)}>{r} วัน</button>)}
            <button className="btn btn-soft btn-sm" onClick={() => {
              exportCSV(filtered, range, type, cat);
              toast.success("ดาวน์โหลดแล้ว", `${filtered.length} รายการ · CSV`);
            }}><Icon name="download" size={15} />ส่งออก CSV</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>วันที่ / เวลา</th><th>ประเภท</th><th>สินค้า</th><th>อ้างอิง</th><th>คู่ค้า / แผนก</th><th>ผู้ทำรายการ</th><th className="th-right">จำนวน</th></tr></thead>
            <tbody>
              {filtered.slice(0, 80).map((m) => (
                <tr key={m.id}>
                  <td><div style={{ fontSize: 13, fontWeight: 600 }}>{RD.fmtDate(m.date)}</div><div className="muted-3" style={{ fontSize: 11 }}>{RD.fmtTime(m.ts)} น.</div></td>
                  <td><span className={"badge " + (m.type === "in" ? "in" : "primary")}><Icon name={m.type === "in" ? "arrowDown" : "arrowUp"} size={12} stroke={2.6} />{m.type === "in" ? "รับเข้า" : "จ่ายออก"}</span></td>
                  <td><div className="item-cell"><ItemThumb item={m} size={32} /><div><div className="item-name" style={{ fontSize: 13 }}>{m.nameTh}</div><div className="item-sku">{m.sku}</div></div></div></td>
                  <td className="mono muted" style={{ fontSize: 13 }}>{m.ref}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{m.party}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{m.by}</td>
                  <td className="td-right num" style={{ fontWeight: 700, color: m.type === "in" ? "var(--green)" : "var(--text)" }}>{m.type === "in" ? "+" : "−"}{RD.fmt(m.qty)} <span className="muted-3" style={{ fontWeight: 400, fontSize: 12 }}>{m.unit}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="empty">ไม่พบรายการตามเงื่อนไข</div>}
        {filtered.length > 80 && <div className="muted-3" style={{ textAlign: "center", padding: 16, fontSize: 13 }}>แสดง 80 จาก {RD.fmt(filtered.length)} รายการ</div>}
      </div>
    </div>
  );
}

export default ReportPage;
