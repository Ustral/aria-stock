/* ============================================================
   Login screen
   ============================================================ */
import React from "react";
import { Icon } from "./icons.jsx";
import { Field } from "./components.jsx";


export default function Login({ onLogin }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password || busy) return;
    setBusy(true); setErr("");
    try {
      await onLogin(username, password);
    } catch (ex) {
      setErr(ex.message || "เข้าสู่ระบบไม่สำเร็จ");
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card fade-up">
        <div className="login-brand">
          <div className="brand-mark" style={{ width: 46, height: 46 }}><Icon name="warehouse" size={25} color="#fff" /></div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.01em" }}>Aria Stock</div>
            <div className="muted" style={{ fontSize: 13 }}>ระบบจัดการคลังสินค้าโรงแรม · หลายสาขา</div>
          </div>
        </div>

        <form onSubmit={submit} className="col" style={{ gap: 15, marginTop: 26 }}>
          <Field label="ชื่อผู้ใช้ · Username">
            <input className="input" autoFocus value={username} autoComplete="username"
              onChange={(e) => setUsername(e.target.value)} placeholder="เช่น admin" />
          </Field>
          <Field label="รหัสผ่าน · Password" error={err || null}>
            <input className={"input" + (err ? " err" : "")} type="password" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={busy || !username || !password}
            style={{ justifyContent: "center", padding: 13, fontSize: 15, marginTop: 4 }}>
            {busy ? "กำลังเข้าสู่ระบบ…" : <><Icon name="arrowRight" size={18} />เข้าสู่ระบบ</>}
          </button>
        </form>

      </div>
      <div className="muted-3" style={{ fontSize: 12, marginTop: 18 }}>© 2026 Aria Stock · Hotel Inventory System</div>
    </div>
  );
}
