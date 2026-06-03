/* ============================================================
   Dashboard page
   ============================================================ */
import React from "react";
import { INV as ID } from "../data.js";
import { Icon } from "../icons.jsx";
import { AreaChart, BarChart, Donut } from "../charts.jsx";
import { StatCard, SectionHead, ItemThumb, StatusBadge } from "../components.jsx";
import { useRefData } from "../refdata.jsx";

function lastNDays(n, today) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function Dashboard({ items, moves, setPage, openItem }) {
  const { categories } = useRefData();
  const today = ID.TODAY;
  const days14 = lastNDays(14, today);
  const days8 = lastNDays(8, today);

  // metrics
  const totalSkus = items.length;
  const totalUnits = items.reduce((s, it) => s + it.qty, 0);
  const totalValue = items.reduce((s, it) => s + it.qty * it.cost, 0);
  const lowItems = items.filter((it) => ID.statusOf(it) !== "ok");

  // series
  const byDayUnits = days14.map((d) => moves.filter((m) => m.date === d).reduce((s, m) => s + m.qty, 0));
  const inOut8 = days8.map((d) => {
    const dm = moves.filter((m) => m.date === d);
    return { in: dm.filter((m) => m.type === "in").reduce((s, m) => s + m.qty, 0), out: dm.filter((m) => m.type === "out").reduce((s, m) => s + m.qty, 0) };
  });
  const dayLabels = days8.map((d) => new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" }));
  const dayLabels14 = days14.filter((_, i) => i % 3 === 0).map((d) => new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" }));

  // category value donut
  const catVals = categories.map((c) => ({
    label: c.th, color: c.color,
    value: items.filter((it) => it.cat === c.id).reduce((s, it) => s + it.qty * it.cost, 0),
  }));

  const recent = moves.slice(0, 7);
  const spark = (seed) => Array.from({ length: 12 }, (_, i) => 40 + Math.sin(i * 0.7 + seed) * 18 + i * 1.5);

  return (
    <div className="page">
      {/* Hero stat row */}
      <div className="stat-grid stagger" style={{ marginBottom: 18 }}>
        <StatCard icon="box" iconBg="var(--primary-soft)" iconFg="var(--primary)" value={totalSkus} label="รายการสินค้า (SKU)" delta="+2 เดือนนี้" spark={spark(1)} />
        <StatCard icon="layers" iconBg="var(--blue-soft)" iconFg="var(--blue)" value={totalUnits} label="จำนวนคงเหลือรวม (หน่วย)" delta="+6.4%" spark={spark(3)} />
        <StatCard icon="tag" iconBg="var(--green-soft)" iconFg="var(--green)" value={totalValue} format={(n) => "฿" + Math.round(n).toLocaleString("en-US")} label="มูลค่าสต๊อกรวม" delta="+3.1%" spark={spark(5)} />
        <StatCard icon="alert" iconBg="var(--amber-soft)" iconFg="var(--amber)" value={lowItems.length} label="สินค้าใกล้หมด / หมด" delta={lowItems.length + " รายการ"} deltaDir="down" spark={spark(7)} />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, marginBottom: 18 }}>
        {/* Movement trend */}
        <div className="card card-pad fade-up">
          <SectionHead title="การเคลื่อนไหวสต๊อก · Stock Movement" sub="ปริมาณรวม 14 วันล่าสุด (หน่วย)"
            right={<div className="row" style={{ gap: 14, fontSize: 12 }}>
              <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent-grad)" }} />รวมการเคลื่อนไหว</span>
            </div>} />
          <AreaChart data={byDayUnits} labels={dayLabels14} height={230} />
        </div>
        {/* Category donut */}
        <div className="card card-pad fade-up">
          <SectionHead title="มูลค่าตามหมวด" sub="สัดส่วนมูลค่าสต๊อก" />
          <div className="row" style={{ justifyContent: "center", marginBottom: 8 }}>
            <Donut segments={catVals} size={172} thickness={24} center={
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>รวม</div>
                <div style={{ fontSize: 19, fontWeight: 700 }}>{ID.baht(totalValue / 1000)}K</div>
              </div>
            } />
          </div>
          <div className="col" style={{ gap: 9, marginTop: 6 }}>
            {catVals.map((c, i) => (
              <div key={i} className="spread" style={{ fontSize: 13 }}>
                <span className="row" style={{ gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: c.color }} />{c.label}</span>
                <span className="num muted" style={{ fontWeight: 600 }}>{ID.baht(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        {/* In vs Out bars */}
        <div className="card card-pad fade-up">
          <SectionHead title="รับเข้า vs จ่ายออก · In / Out" sub="เปรียบเทียบ 8 วันล่าสุด"
            right={<div className="row" style={{ gap: 14, fontSize: 12 }}>
              <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--primary)" }} />รับเข้า</span>
              <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--cyan)" }} />จ่ายออก</span>
            </div>} />
          <BarChart groups={inOut8} labels={dayLabels} height={220} />
        </div>

        {/* Low stock alerts */}
        <div className="card card-pad fade-up" style={{ display: "flex", flexDirection: "column" }}>
          <SectionHead title="แจ้งเตือนใกล้หมด" sub={lowItems.length + " รายการต้องสั่งซื้อ"}
            right={<button className="btn btn-soft btn-sm" onClick={() => setPage("stock")}>ดูทั้งหมด</button>} />
          <div className="col" style={{ gap: 10, overflowY: "auto", maxHeight: 300 }}>
            {lowItems.slice(0, 6).map((it) => {
              const pct = Math.min(100, Math.round((it.qty / it.par) * 100));
              const st = ID.statusOf(it);
              return (
                <div key={it.id} className="row card-hover" style={{ gap: 11, padding: 10, borderRadius: 12, border: "1px solid var(--border)", cursor: "pointer" }} onClick={() => openItem(it)}>
                  <ItemThumb item={it} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="spread">
                      <div className="item-name" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.nameTh}</div>
                      <StatusBadge item={it} />
                    </div>
                    <div className="bar-track" style={{ marginTop: 7 }}>
                      <div className="bar-fill" style={{ width: pct + "%", background: st === "out" ? "var(--red)" : "var(--amber)" }} />
                    </div>
                    <div className="muted-3" style={{ fontSize: 11, marginTop: 5 }}>คงเหลือ <b className="num" style={{ color: "var(--text)" }}>{ID.fmt(it.qty)}</b> / par {ID.fmt(it.par)} {it.unit}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card card-pad fade-up" style={{ marginTop: 18 }}>
        <SectionHead title="รายการเคลื่อนไหวล่าสุด · Recent Activity"
          right={<button className="btn btn-ghost btn-sm" onClick={() => setPage("report")}><Icon name="history" size={15} />ดูรายงาน</button>} />
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>ประเภท</th><th>สินค้า</th><th>อ้างอิง</th><th>คู่ค้า / แผนก</th><th className="th-right">จำนวน</th><th className="th-right">เวลา</th></tr></thead>
            <tbody>
              {recent.map((m) => (
                <tr key={m.id}>
                  <td><span className={"badge " + (m.type === "in" ? "in" : "primary")}><Icon name={m.type === "in" ? "arrowDown" : "arrowUp"} size={13} stroke={2.5} />{m.type === "in" ? "รับเข้า" : "จ่ายออก"}</span></td>
                  <td><div className="item-cell"><ItemThumb item={m} size={34} /><div><div className="item-name" style={{ fontSize: 13 }}>{m.nameTh}</div><div className="item-sku">{m.sku}</div></div></div></td>
                  <td className="mono muted" style={{ fontSize: 13 }}>{m.ref}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{m.party}</td>
                  <td className="td-right num" style={{ fontWeight: 700, color: m.type === "in" ? "var(--green)" : "var(--text)" }}>{m.type === "in" ? "+" : "−"}{ID.fmt(m.qty)}</td>
                  <td className="td-right muted-3" style={{ fontSize: 12 }}>{ID.relDay(m.date)} · {ID.fmtTime(m.ts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
