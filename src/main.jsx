import React from "react";
import ReactDOM from "react-dom/client";
import { ToastProvider } from "./components.jsx";
import { Icon } from "./icons.jsx";
import App from "./App.jsx";
import Login from "./Login.jsx";
import { api, tokenStore } from "./api.js";
import "./styles.css";

function Root() {
  const [boot, setBoot] = React.useState(null); // { me, branches, products, stock, movements }
  const [status, setStatus] = React.useState("checking"); // checking | anon | ready

  // Resume an existing session on load.
  React.useEffect(() => {
    if (!tokenStore.get()) { setStatus("anon"); return; }
    api.bootstrap()
      .then((data) => { setBoot(data); setStatus("ready"); })
      .catch(() => { tokenStore.clear(); setStatus("anon"); });
  }, []);

  const login = async (username, password) => {
    const { token } = await api.login(username, password);
    tokenStore.set(token);
    const data = await api.bootstrap();
    setBoot(data); setStatus("ready");
  };

  const logout = () => { tokenStore.clear(); setBoot(null); setStatus("anon"); };

  if (status === "checking") {
    return (
      <div className="login-wrap">
        <div className="row" style={{ gap: 10, color: "var(--text-3)" }}>
          <Icon name="refresh" size={18} /> กำลังโหลด…
        </div>
      </div>
    );
  }
  if (status === "anon") return <Login onLogin={login} />;
  return <App boot={boot} onLogout={logout} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <Root />
  </ToastProvider>
);
