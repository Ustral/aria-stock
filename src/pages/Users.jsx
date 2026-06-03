/* ============================================================
   User management (HQ only) — create / reset password /
   suspend / delete accounts. Server enforces all of this too.
   ============================================================ */
import React from "react";
import { api } from "../api.js";
import { Icon } from "../icons.jsx";
import { Field, Modal, ModalHeader, SectionHead } from "../components.jsx";

function RoleBranchBadge({ user, branches }) {
  if (user.role === "hq") return <span className="badge primary"><Icon name="warehouse" size={12} />สำนักงานใหญ่ (Admin)</span>;
  if (user.role === "manager") return <span className="badge in"><Icon name="warehouse" size={12} />ผู้จัดการ HQ</span>;
  const b = branches.find((x) => x.id === user.branchId);
  return <span className="badge neutral"><Icon name="building" size={12} />{b ? b.th : "—"}</span>;
}

/* ---- Create user ---- */
function AddUserModal({ open, onClose, onSubmit, branches, existing }) {
  const blank = { username: "", name: "", title: "", password: "", role: "branch", branchId: "" };
  const [f, setF] = React.useState(blank);
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => { if (open) { setF({ ...blank, branchId: (branches.find((b) => !b.isHQ) || {}).id || "" }); setTouched(false); } }, [open]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const uname = f.username.trim().toLowerCase();
  const dup = uname && existing.includes(uname);
  const errU = touched && (!/^[a-z0-9_.-]{3,}$/.test(uname) ? "a-z, 0-9, _ . - อย่างน้อย 3 ตัว" : dup ? "ชื่อผู้ใช้นี้มีอยู่แล้ว" : null);
  const errP = touched && f.password.length < 6 ? "อย่างน้อย 6 ตัวอักษร" : null;
  const errB = touched && f.role === "branch" && !f.branchId ? "เลือกสาขา" : null;
  const canSubmit = /^[a-z0-9_.-]{3,}$/.test(uname) && !dup && f.password.length >= 6 && (f.role === "hq" || f.branchId);

  const submit = (e) => {
    e.preventDefault(); setTouched(true);
    if (!canSubmit) return;
    onSubmit({ username: uname, name: f.name.trim(), title: f.title.trim(), password: f.password, role: f.role, branchId: f.role === "branch" ? f.branchId : null });
  };

  return (
    <Modal open={open} onClose={onClose} width={500}>
      <ModalHeader icon="users" title="เพิ่มผู้ใช้งาน" sub="Add user · สร้างบัญชีเข้าใช้ระบบ" onClose={onClose} />
      <form onSubmit={submit} className="col" style={{ gap: 15, padding: 22 }}>
        <div className="grid-2">
          <Field label="ชื่อผู้ใช้ · Username" req error={errU}>
            <input className={"input mono" + (errU ? " err" : "")} placeholder="เช่น asok" value={f.username} onChange={(e) => set("username", e.target.value)} />
          </Field>
          <Field label="รหัสผ่าน · Password" req error={errP}>
            <input className={"input" + (errP ? " err" : "")} type="text" placeholder="อย่างน้อย 6 ตัว" value={f.password} onChange={(e) => set("password", e.target.value)} />
          </Field>
        </div>
        <Field label="ชื่อ-สกุล · Name">
          <input className="input" placeholder="เช่น คุณวีระ" value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="ตำแหน่ง · Title" hint="ไม่บังคับ">
          <input className="input" placeholder="เช่น Store Keeper" value={f.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <div className="grid-2">
          <Field label="บทบาท · Role" req>
            <select className="input" value={f.role} onChange={(e) => set("role", e.target.value)}>
              <option value="branch">พนักงานสาขา</option>
              <option value="manager">ผู้จัดการสำนักงานใหญ่ (จัดการผู้ใช้ไม่ได้)</option>
              <option value="hq">สำนักงานใหญ่ · Admin (เต็มสิทธิ์)</option>
            </select>
          </Field>
          {f.role === "branch" && (
            <Field label="สาขา · Branch" req error={errB}>
              <select className="input" value={f.branchId} onChange={(e) => set("branchId", e.target.value)}>
                {branches.filter((b) => !b.isHQ).map((b) => <option key={b.id} value={b.id}>{b.th}</option>)}
              </select>
            </Field>
          )}
        </div>
        <div className="row" style={{ gap: 12, marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={!canSubmit}><Icon name="plus" size={16} stroke={2.5} />สร้างบัญชี</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---- Reset password ---- */
function ResetPwModal({ user, onClose, onSubmit }) {
  const [pw, setPw] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => { if (user) { setPw(""); setTouched(false); } }, [user]);
  const err = touched && pw.length < 6 ? "อย่างน้อย 6 ตัวอักษร" : null;
  return (
    <Modal open={!!user} onClose={onClose} width={420}>
      {user && (
        <>
          <ModalHeader icon="key" title="รีเซ็ตรหัสผ่าน" sub={"@" + user.username + " · " + user.name} onClose={onClose} />
          <form onSubmit={(e) => { e.preventDefault(); setTouched(true); if (pw.length >= 6) onSubmit(user, pw); }} className="col" style={{ gap: 15, padding: 22 }}>
            <Field label="รหัสผ่านใหม่ · New password" req error={err}>
              <input className={"input" + (err ? " err" : "")} autoFocus type="text" placeholder="อย่างน้อย 6 ตัว" value={pw} onChange={(e) => setPw(e.target.value)} />
            </Field>
            <div className="row" style={{ gap: 12 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={pw.length < 6}><Icon name="key" size={16} />บันทึกรหัสใหม่</button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

/* ---- Confirm delete ---- */
function ConfirmDelUser({ user, onClose, onConfirm }) {
  return (
    <Modal open={!!user} onClose={onClose} width={420}>
      {user && (
        <>
          <ModalHeader icon="trash" iconBg="var(--red-soft)" iconFg="var(--red)" title="ลบบัญชีผู้ใช้" sub={"@" + user.username} onClose={onClose} />
          <div className="col" style={{ gap: 16, padding: 22 }}>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              ต้องการลบบัญชี <b style={{ color: "var(--text)" }}>{user.name}</b> <span className="mono muted-3">(@{user.username})</span> ใช่หรือไม่? ผู้ใช้จะเข้าระบบไม่ได้อีก
            </div>
            <div className="row" style={{ gap: 12 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>ยกเลิก</button>
              <button type="button" className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={() => onConfirm(user)}><Icon name="trash" size={16} />ลบบัญชี</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

export function UsersPage({ branches, me, toast }) {
  const [users, setUsers] = React.useState(null);
  const [err, setErr] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [resetUser, setResetUser] = React.useState(null);
  const [delUser, setDelUser] = React.useState(null);

  const load = React.useCallback(() => {
    api.listUsers().then((d) => setUsers(d.users)).catch((e) => setErr(e.message));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const handleAdd = async (payload) => {
    try {
      const r = await api.addUser(payload);
      setUsers((prev) => [...(prev || []), r.user]);
      setAddOpen(false);
      toast.success("สร้างบัญชีแล้ว", `@${r.user.username} · ${payload.role === "hq" ? "สำนักงานใหญ่" : (branches.find((b) => b.id === payload.branchId) || {}).th || ""}`);
    } catch (e) { toast.error("สร้างบัญชีไม่สำเร็จ", e.message); }
  };
  const handleReset = async (user, password) => {
    try { await api.updateUser(user.id, { password }); setResetUser(null); toast.success("รีเซ็ตรหัสผ่านแล้ว", "@" + user.username); }
    catch (e) { toast.error("รีเซ็ตไม่สำเร็จ", e.message); }
  };
  const handleToggle = async (user) => {
    try {
      const r = await api.updateUser(user.id, { active: user.active === false });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? r.user : u)));
      toast.info(r.user.active ? "เปิดใช้งานบัญชีแล้ว" : "ระงับบัญชีแล้ว", "@" + user.username);
    } catch (e) { toast.error("ทำรายการไม่สำเร็จ", e.message); }
  };
  const handleDelete = async (user) => {
    try { await api.deleteUser(user.id); setUsers((prev) => prev.filter((u) => u.id !== user.id)); setDelUser(null); toast.error("ลบบัญชีแล้ว", "@" + user.username); }
    catch (e) { toast.error("ลบไม่สำเร็จ", e.message); }
  };

  const existing = (users || []).map((u) => u.username);

  return (
    <div className="page">
      <div className="card card-pad fade-up">
        <SectionHead title="บัญชีผู้ใช้งาน · User Accounts" sub={(users ? users.length : 0) + " บัญชี · กำหนดสิทธิ์เข้าถึงต่อสาขา"}
          right={<button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}><Icon name="plus" size={16} stroke={2.6} />เพิ่มผู้ใช้</button>} />
        {err && <div className="empty" style={{ color: "var(--red)" }}>{err}</div>}
        {!users && !err && <div className="empty">กำลังโหลด…</div>}
        {users && (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>ผู้ใช้งาน</th><th>บทบาท / สาขา</th><th>สถานะ</th><th className="th-right">จัดการ</th></tr></thead>
              <tbody>
                {users.map((u) => {
                  const self = u.id === me.id;
                  const suspended = u.active === false;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="item-cell">
                          <div className="avatar" style={{ width: 38, height: 38, opacity: suspended ? .5 : 1 }}>{(u.name || u.username).replace(/^คุณ/, "")[0]}</div>
                          <div>
                            <div className="item-name" style={{ fontSize: 14 }}>{u.name} {self && <span className="badge primary" style={{ padding: "1px 7px", fontSize: 10, marginLeft: 4 }}>คุณ</span>}</div>
                            <div className="item-sku">@{u.username}{u.title ? " · " + u.title : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td><RoleBranchBadge user={u} branches={branches} /></td>
                      <td>{suspended ? <span className="badge out"><span className="badge-dot" style={{ background: "currentColor" }} />ระงับ</span> : <span className="badge ok"><span className="badge-dot" style={{ background: "currentColor" }} />ใช้งาน</span>}</td>
                      <td className="td-right">
                        <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                          <button className="icon-btn" style={{ width: 34, height: 34 }} title="รีเซ็ตรหัสผ่าน" onClick={() => setResetUser(u)}><Icon name="key" size={15} /></button>
                          <button className="icon-btn" style={{ width: 34, height: 34, color: suspended ? "var(--green)" : "var(--amber)" }} title={suspended ? "เปิดใช้งาน" : "ระงับบัญชี"} disabled={self} onClick={() => handleToggle(u)}><Icon name={suspended ? "checkCircle" : "ban"} size={15} /></button>
                          <button className="icon-btn" style={{ width: 34, height: 34, color: "var(--red)" }} title="ลบบัญชี" disabled={self} onClick={() => setDelUser(u)}><Icon name="trash" size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAdd} branches={branches} existing={existing} />
      <ResetPwModal user={resetUser} onClose={() => setResetUser(null)} onSubmit={handleReset} />
      <ConfirmDelUser user={delUser} onClose={() => setDelUser(null)} onConfirm={handleDelete} />
    </div>
  );
}

export default UsersPage;
