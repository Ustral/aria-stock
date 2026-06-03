/* ============================================================
   Reference data management (HQ-level) — Categories, Suppliers,
   Locations. Add / edit / delete; server keeps product refs in sync
   and blocks deletes that are still in use.
   ============================================================ */
import React from "react";
import { Icon } from "../icons.jsx";
import { Field, Modal, ModalHeader, SectionHead } from "../components.jsx";
import { useRefData } from "../refdata.jsx";

const COLOR_PRESETS = ["#6366f1", "#06b6d4", "#f59e0b", "#16a34a", "#ef4444", "#8b5cf6", "#ec4899", "#0ea5e9", "#14b8a6", "#64748b"];

/* ---- Category add/edit modal ---- */
function CategoryModal({ state, onClose, onSubmit, existingIds }) {
  const open = !!state;
  const editing = state && state.mode === "edit";
  const [f, setF] = React.useState({ id: "", th: "", en: "", color: COLOR_PRESETS[0], icon: "📦" });
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => {
    if (state) {
      setF(editing ? { ...state.cat } : { id: "", th: "", en: "", color: COLOR_PRESETS[0], icon: "📦" });
      setTouched(false);
    }
  }, [state]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const id = f.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const dup = !editing && id && existingIds.includes(id);
  const errId = touched && !editing && (!id ? "ระบุรหัสหมวด (a-z, 0-9)" : dup ? "รหัสนี้มีอยู่แล้ว" : null);
  const errTh = touched && !f.th.trim() ? "ระบุชื่อหมวด" : null;
  const canSubmit = (editing || (id && !dup)) && f.th.trim();

  const submit = (e) => {
    e.preventDefault(); setTouched(true);
    if (!canSubmit) return;
    onSubmit(editing, { id: editing ? f.id : id, th: f.th.trim(), en: f.en.trim() || f.th.trim(), color: f.color, icon: (f.icon || "📦").trim() });
  };

  return (
    <Modal open={open} onClose={onClose} width={460}>
      {state && (
        <>
          <ModalHeader icon="tag" title={editing ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"} sub="Category" onClose={onClose} />
          <form onSubmit={submit} className="col" style={{ gap: 15, padding: 22 }}>
            <div className="row" style={{ gap: 14, alignItems: "center" }}>
              <div className="thumb" style={{ width: 56, height: 56, fontSize: 28, background: f.color + "22" }}>{f.icon || "📦"}</div>
              <div style={{ flex: 1 }}>
                <Field label="ไอคอน (emoji)"><input className="input" value={f.icon} maxLength={4} onChange={(e) => set("icon", e.target.value)} placeholder="📦" /></Field>
              </div>
            </div>
            {!editing && (
              <Field label="รหัสหมวด · ID" req error={errId} hint="ตัวพิมพ์เล็ก a-z, 0-9, - _">
                <input className={"input mono" + (errId ? " err" : "")} value={f.id} onChange={(e) => set("id", e.target.value)} placeholder="เช่น minibar" />
              </Field>
            )}
            <div className="grid-2">
              <Field label="ชื่อ (ไทย)" req error={errTh}><input className={"input" + (errTh ? " err" : "")} value={f.th} onChange={(e) => set("th", e.target.value)} placeholder="เช่น มินิบาร์" /></Field>
              <Field label="ชื่อ (อังกฤษ)"><input className="input" value={f.en} onChange={(e) => set("en", e.target.value)} placeholder="Minibar" /></Field>
            </div>
            <Field label="สีประจำหมวด · Color">
              <div className="wrap-gap">
                {COLOR_PRESETS.map((c) => (
                  <button type="button" key={c} onClick={() => set("color", c)}
                    style={{ width: 30, height: 30, borderRadius: 9, background: c, cursor: "pointer", border: f.color === c ? "3px solid var(--text)" : "2px solid var(--border)" }} aria-label={c} />
                ))}
              </div>
            </Field>
            <div className="row" style={{ gap: 12, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={!canSubmit}>{editing ? "บันทึก" : "เพิ่มหมวด"}</button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

/* ---- Supplier / Location name modal ---- */
function NameModal({ state, onClose, onSubmit }) {
  const open = !!state;
  const [v, setV] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => { if (state) { setV(state.mode === "rename" ? state.value : ""); setTouched(false); } }, [state]);
  if (!state) return <Modal open={false} onClose={onClose}>{null}</Modal>;
  const editing = state.mode === "rename";
  const err = touched && !v.trim() ? "ระบุชื่อ" : null;
  return (
    <Modal open={open} onClose={onClose} width={420}>
      <ModalHeader icon={state.kind === "supplier" ? "truck" : "pin"} title={(editing ? "แก้ไข" : "เพิ่ม") + (state.kind === "supplier" ? "ผู้จำหน่าย" : "ที่จัดเก็บ")} onClose={onClose} />
      <form onSubmit={(e) => { e.preventDefault(); setTouched(true); if (v.trim()) onSubmit(editing, v.trim()); }} className="col" style={{ gap: 15, padding: 22 }}>
        <Field label="ชื่อ · Name" req error={err}>
          <input className={"input" + (err ? " err" : "")} autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder={state.kind === "supplier" ? "เช่น Lotus Supply" : "เช่น Store D-01"} />
        </Field>
        <div className="row" style={{ gap: 12 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={!v.trim()}>{editing ? "บันทึก" : "เพิ่ม"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmModal({ state, onClose }) {
  return (
    <Modal open={!!state} onClose={onClose} width={420}>
      {state && (
        <>
          <ModalHeader icon="trash" iconBg="var(--red-soft)" iconFg="var(--red)" title="ยืนยันการลบ" onClose={onClose} />
          <div className="col" style={{ gap: 16, padding: 22 }}>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>ต้องการลบ <b style={{ color: "var(--text)" }}>{state.label}</b> ใช่หรือไม่?</div>
            <div className="row" style={{ gap: 12 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
              <button type="button" className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={state.onConfirm}><Icon name="trash" size={16} />ลบ</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

function ListCard({ title, sub, icon, items, countOf, onAdd, onRename, onDelete }) {
  return (
    <div className="card card-pad fade-up">
      <SectionHead title={title} sub={sub} right={<button className="btn btn-soft btn-sm" onClick={onAdd}><Icon name="plus" size={15} stroke={2.6} />เพิ่ม</button>} />
      <div className="col" style={{ gap: 0 }}>
        {items.map((name, i) => {
          const n = countOf(name);
          return (
            <div key={name} className="row" style={{ gap: 12, padding: "11px 2px", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : 0 }}>
              <div className="thumb" style={{ width: 34, height: 34, background: "var(--surface-3)", color: "var(--text-2)" }}><Icon name={icon} size={16} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
                <div className="muted-3" style={{ fontSize: 12 }}>{n > 0 ? `ใช้กับสินค้า ${n} รายการ` : "ยังไม่ถูกใช้งาน"}</div>
              </div>
              <button className="icon-btn" style={{ width: 34, height: 34 }} title="แก้ไข" onClick={() => onRename(name)}><Icon name="edit" size={15} /></button>
              <button className="icon-btn" style={{ width: 34, height: 34, color: "var(--red)" }} title="ลบ" disabled={n > 0} onClick={() => onDelete(name)}><Icon name="trash" size={15} /></button>
            </div>
          );
        })}
        {items.length === 0 && <div className="empty">ยังไม่มีรายการ</div>}
      </div>
    </div>
  );
}

export function RefDataPage({ products, ops, toast }) {
  const { categories, suppliers, locations } = useRefData();
  const [catModal, setCatModal] = React.useState(null);
  const [nameModal, setNameModal] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);

  const catCount = (id) => products.filter((p) => p.cat === id).length;
  const supCount = (n) => products.filter((p) => p.supplier === n).length;
  const locCount = (n) => products.filter((p) => p.loc === n).length;

  const submitCat = async (editing, payload) => {
    try { editing ? await ops.updateCategory(payload.id, payload) : await ops.addCategory(payload); setCatModal(null); } catch { /* toast in App */ }
  };
  const submitName = async (editing, value) => {
    const kind = nameModal.kind;
    try {
      if (kind === "supplier") editing ? await ops.renameSupplier(nameModal.value, value) : await ops.addSupplier(value);
      else editing ? await ops.renameLocation(nameModal.value, value) : await ops.addLocation(value);
      setNameModal(null);
    } catch { /* toast in App */ }
  };
  const doDelete = (fn, ...args) => async () => { try { await fn(...args); } catch { /* toast in App */ } setConfirm(null); };

  return (
    <div className="page">
      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Categories */}
        <div className="card card-pad fade-up">
          <SectionHead title="หมวดหมู่สินค้า · Categories" sub={categories.length + " หมวด"}
            right={<button className="btn btn-soft btn-sm" onClick={() => setCatModal({ mode: "add" })}><Icon name="plus" size={15} stroke={2.6} />เพิ่มหมวด</button>} />
          <div className="col" style={{ gap: 0 }}>
            {categories.map((c, i) => {
              const n = catCount(c.id);
              return (
                <div key={c.id} className="row" style={{ gap: 12, padding: "11px 2px", borderBottom: i < categories.length - 1 ? "1px solid var(--border)" : 0 }}>
                  <div className="thumb" style={{ width: 38, height: 38, fontSize: 19, background: c.soft || (c.color + "22") }}>{c.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{c.th}</span>
                      <span style={{ width: 12, height: 12, borderRadius: 4, background: c.color, flex: "0 0 auto" }} />
                    </div>
                    <div className="muted-3" style={{ fontSize: 12 }}>{c.en} · <span className="mono">{c.id}</span> · {n} สินค้า</div>
                  </div>
                  <button className="icon-btn" style={{ width: 34, height: 34 }} title="แก้ไข" onClick={() => setCatModal({ mode: "edit", cat: c })}><Icon name="edit" size={15} /></button>
                  <button className="icon-btn" style={{ width: 34, height: 34, color: "var(--red)" }} title="ลบ" disabled={n > 0}
                    onClick={() => setConfirm({ label: `หมวด "${c.th}"`, onConfirm: doDelete(ops.deleteCategory, c.id) })}><Icon name="trash" size={15} /></button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <ListCard title="ผู้จำหน่าย · Suppliers" sub={suppliers.length + " ราย"} icon="truck" items={suppliers} countOf={supCount}
            onAdd={() => setNameModal({ kind: "supplier", mode: "add" })}
            onRename={(name) => setNameModal({ kind: "supplier", mode: "rename", value: name })}
            onDelete={(name) => setConfirm({ label: `ผู้จำหน่าย "${name}"`, onConfirm: doDelete(ops.deleteSupplier, name) })} />
          <ListCard title="ที่จัดเก็บ · Locations" sub={locations.length + " จุด"} icon="pin" items={locations} countOf={locCount}
            onAdd={() => setNameModal({ kind: "location", mode: "add" })}
            onRename={(name) => setNameModal({ kind: "location", mode: "rename", value: name })}
            onDelete={(name) => setConfirm({ label: `ที่จัดเก็บ "${name}"`, onConfirm: doDelete(ops.deleteLocation, name) })} />
        </div>
      </div>

      <CategoryModal state={catModal} onClose={() => setCatModal(null)} onSubmit={submitCat} existingIds={categories.map((c) => c.id)} />
      <NameModal state={nameModal} onClose={() => setNameModal(null)} onSubmit={submitName} />
      <ConfirmModal state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

export default RefDataPage;
