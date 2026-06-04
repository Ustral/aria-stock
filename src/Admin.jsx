/* ============================================================
   HQ admin — add product, add branch, delete-product confirm.
   These are only reachable from the HQ context.
   ============================================================ */
import React from "react";
import { Icon } from "./icons.jsx";
import { Field, Stepper, Modal, ModalHeader } from "./components.jsx";
import { useRefData } from "./refdata.jsx";

/* ---------------- Add product ---------------- */
export function AddProductModal({ open, onClose, onSubmit, existingIds }) {
  const { categories, suppliers, locations } = useRefData();
  const blank = {
    sku: "", nameTh: "", nameEn: "", cat: (categories[0] || {}).id || "", unit: "ชิ้น",
    par: 1000, reorder: 400, cost: 0, supplier: suppliers[0] || "", loc: locations[0] || "", qty: 0,
  };
  const [f, setF] = React.useState(blank);
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => { if (open) { setF(blank); setTouched(false); } }, [open]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const dupSku = f.sku && existingIds.includes(f.sku.trim().toUpperCase());
  const errSku = touched && (!f.sku.trim() ? "ระบุ SKU" : dupSku ? "SKU นี้มีอยู่แล้ว" : null);
  const errName = touched && !f.nameTh.trim() ? "ระบุชื่อสินค้า" : null;
  const canSubmit = f.sku.trim() && f.nameTh.trim() && !dupSku && f.par > 0;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    onSubmit({ ...f, sku: f.sku.trim().toUpperCase(), id: f.sku.trim().toUpperCase(), nameTh: f.nameTh.trim(), nameEn: f.nameEn.trim() || f.nameTh.trim() });
  };

  return (
    <Modal open={open} onClose={onClose} width={560}>
      <ModalHeader icon="box" title="เพิ่มสินค้าใหม่" sub="Add product · เพิ่มเข้าแคตตาล็อกกลาง (ทุกสาขา)" onClose={onClose} />
      <form onSubmit={submit} className="col" style={{ gap: 15, padding: 22, overflowY: "auto", maxHeight: "calc(100vh - 140px)" }}>
        <div className="grid-2">
          <Field label="SKU / รหัสสินค้า" req error={errSku}>
            <input className="input mono" placeholder="เช่น LN-2099" value={f.sku} onChange={(e) => set("sku", e.target.value)} style={errSku ? { borderColor: "var(--red)" } : null} />
          </Field>
          <Field label="หมวดหมู่ · Category" req>
            <select className="input" value={f.cat} onChange={(e) => set("cat", e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.th}</option>)}
            </select>
          </Field>
        </div>
        <Field label="ชื่อสินค้า (ไทย)" req error={errName}>
          <input className="input" placeholder="เช่น ผ้าเช็ดตัวเด็ก" value={f.nameTh} onChange={(e) => set("nameTh", e.target.value)} style={errName ? { borderColor: "var(--red)" } : null} />
        </Field>
        <Field label="ชื่อสินค้า (อังกฤษ)" hint="ไม่บังคับ — ถ้าเว้นว่างจะใช้ชื่อไทย">
          <input className="input" placeholder="e.g. Kids Towel" value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
        </Field>
        <div className="grid-2">
          <Field label="หน่วยนับ · Unit" req>
            <input className="input" placeholder="ชิ้น / ขวด / ชุด" value={f.unit} onChange={(e) => set("unit", e.target.value)} />
          </Field>
          <Field label="ต้นทุน/หน่วย (฿)">
            <Stepper value={f.cost} onChange={(v) => set("cost", v)} step={5} />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="par (เป้าหมาย)" req hint="ระดับสต๊อกที่ต้องการ">
            <Stepper value={f.par} onChange={(v) => set("par", v)} step={50} min={1} />
          </Field>
          <Field label="จุดสั่งซื้อ · Reorder" hint="ต่ำกว่านี้ = ใกล้หมด">
            <Stepper value={f.reorder} onChange={(v) => set("reorder", v)} step={50} />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="ผู้จำหน่ายหลัก · Supplier">
            <select className="input" value={f.supplier} onChange={(e) => set("supplier", e.target.value)}>
              {suppliers.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="ที่จัดเก็บ · Location">
            <select className="input" value={f.loc} onChange={(e) => set("loc", e.target.value)}>
              {locations.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="จำนวนเริ่มต้น (สำนักงานใหญ่) · Opening qty" hint="สาขาอื่นเริ่มที่ 0 — เติมผ่านการรับเข้า">
          <Stepper value={f.qty} onChange={(v) => set("qty", v)} step={50} />
        </Field>
        <div className="row" style={{ gap: 12, marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={!canSubmit}><Icon name="plus" size={17} stroke={2.5} />เพิ่มสินค้า</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Add branch ---------------- */
export function AddBranchModal({ open, onClose, onSubmit, existingCodes }) {
  const blank = { code: "", th: "", en: "", city: "" };
  const [f, setF] = React.useState(blank);
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => { if (open) { setF(blank); setTouched(false); } }, [open]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const dupCode = f.code && existingCodes.includes(f.code.trim().toUpperCase());
  const errCode = touched && (!f.code.trim() ? "ระบุรหัสสาขา" : dupCode ? "รหัสนี้มีอยู่แล้ว" : null);
  const errName = touched && !f.th.trim() ? "ระบุชื่อสาขา" : null;
  const canSubmit = f.code.trim() && f.th.trim() && !dupCode;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    onSubmit({ code: f.code.trim().toUpperCase(), th: f.th.trim(), en: f.en.trim() || f.th.trim(), city: f.city.trim() || "—" });
  };

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <ModalHeader icon="building" title="เพิ่มสาขาใหม่" sub="Add branch · เปิดคลังสาขาใหม่" onClose={onClose} />
      <form onSubmit={submit} className="col" style={{ gap: 15, padding: 22 }}>
        <Field label="รหัสสาขา · Branch code" req error={errCode} hint="เช่น BKK-ASOK">
          <input className="input mono" placeholder="BKK-ASOK" value={f.code} onChange={(e) => set("code", e.target.value)} style={errCode ? { borderColor: "var(--red)" } : null} />
        </Field>
        <Field label="ชื่อสาขา (ไทย)" req error={errName}>
          <input className="input" placeholder="เช่น สาขาอโศก" value={f.th} onChange={(e) => set("th", e.target.value)} style={errName ? { borderColor: "var(--red)" } : null} />
        </Field>
        <div className="grid-2">
          <Field label="ชื่อสาขา (อังกฤษ)" hint="ไม่บังคับ">
            <input className="input" placeholder="Asok Branch" value={f.en} onChange={(e) => set("en", e.target.value)} />
          </Field>
          <Field label="จังหวัด / เมือง">
            <input className="input" placeholder="กรุงเทพฯ" value={f.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
        </div>
        <div className="hint" style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: 11, borderRadius: 10, background: "var(--primary-softer)", border: "1px solid var(--border)" }}>
          <Icon name="alert" size={15} color="var(--primary)" /> สาขาใหม่จะเริ่มต้นด้วยสต๊อกเริ่มต้นจำลอง — ปรับยอดได้ผ่านการรับเข้า/จ่ายออก
        </div>
        <div className="row" style={{ gap: 12, marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={!canSubmit}><Icon name="plus" size={17} stroke={2.5} />เพิ่มสาขา</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Edit branch ---------------- */
export function EditBranchModal({ branch, onClose, onSubmit, existingCodes }) {
  const [f, setF] = React.useState({ code: "", th: "", en: "", city: "" });
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => { if (branch) { setF({ code: branch.code, th: branch.th, en: branch.en, city: branch.city || "" }); setTouched(false); } }, [branch]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const newCode = f.code.trim().toUpperCase();
  const dupCode = newCode && newCode !== branch?.code?.toUpperCase() && existingCodes.includes(newCode);
  const errCode = touched && (!newCode ? "ระบุรหัสสาขา" : dupCode ? "รหัสนี้มีอยู่แล้ว" : null);
  const errName = touched && !f.th.trim() ? "ระบุชื่อสาขา" : null;
  const canSubmit = newCode && f.th.trim() && !dupCode;

  const submit = (e) => {
    e.preventDefault(); setTouched(true);
    if (!canSubmit) return;
    onSubmit(branch.id, { code: newCode, th: f.th.trim(), en: f.en.trim() || f.th.trim(), city: f.city.trim() || "—" });
  };

  return (
    <Modal open={!!branch} onClose={onClose} width={480}>
      {branch && (
        <>
          <ModalHeader icon="building" title="แก้ไขข้อมูลสาขา" sub={`Edit branch · ${branch.th}`} onClose={onClose} />
          <form onSubmit={submit} className="col" style={{ gap: 15, padding: 22 }}>
            <Field label="รหัสสาขา · Branch code" req error={errCode}>
              <input className={"input mono" + (errCode ? " err" : "")} value={f.code} onChange={(e) => set("code", e.target.value)} />
            </Field>
            <Field label="ชื่อสาขา (ไทย)" req error={errName}>
              <input className={"input" + (errName ? " err" : "")} value={f.th} onChange={(e) => set("th", e.target.value)} />
            </Field>
            <div className="grid-2">
              <Field label="ชื่อสาขา (อังกฤษ)">
                <input className="input" value={f.en} onChange={(e) => set("en", e.target.value)} />
              </Field>
              <Field label="จังหวัด / เมือง">
                <input className="input" value={f.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
            </div>
            <div className="row" style={{ gap: 12, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={!canSubmit}><Icon name="check" size={17} />บันทึกการแก้ไข</button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

/* ---------------- Confirm delete branch ---------------- */
export function ConfirmDeleteBranchModal({ branch, onClose, onConfirm }) {
  return (
    <Modal open={!!branch} onClose={onClose} width={440}>
      {branch && (
        <>
          <ModalHeader icon="trash" iconBg="var(--red-soft)" iconFg="var(--red)" title="ลบสาขา" sub={branch.th} onClose={onClose} />
          <div className="col" style={{ gap: 16, padding: 22 }}>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              ต้องการลบ <b style={{ color: "var(--text)" }}>{branch.th}</b> <span className="mono muted-3">({branch.code})</span> ใช่หรือไม่?<br />
              <span style={{ color: "var(--amber)", fontSize: 13 }}>สาขาที่มีสต๊อกคงเหลือหรือประวัติการเคลื่อนไหว ลบไม่ได้</span>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
              <button type="button" className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={() => onConfirm(branch)}><Icon name="trash" size={16} />ลบสาขา</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------------- Confirm delete product ---------------- */
export function ConfirmDeleteModal({ item, onClose, onConfirm }) {
  return (
    <Modal open={!!item} onClose={onClose} width={440}>
      {item && (
        <>
          <ModalHeader icon="trash" iconBg="var(--red-soft)" iconFg="var(--red)" title="ลบสินค้าออกจากแคตตาล็อก" sub="Delete product" onClose={onClose} />
          <div className="col" style={{ gap: 16, padding: 22 }}>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              ต้องการลบ <b style={{ color: "var(--text)" }}>{item.nameTh}</b> <span className="mono muted-3">({item.sku})</span> ออกจากทุกสาขาใช่หรือไม่?
              การกระทำนี้จะนำสินค้าออกจากแคตตาล็อกกลางและยอดคงเหลือของทุกสาขา (ประวัติการเคลื่อนไหวที่ผ่านมายังคงอยู่ในรายงาน)
            </div>
            <div className="row" style={{ gap: 12 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
              <button type="button" className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={() => onConfirm(item)}><Icon name="trash" size={16} />ลบสินค้า</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
