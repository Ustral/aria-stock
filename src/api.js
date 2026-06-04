/* ============================================================
   API client — thin fetch wrapper that attaches the JWT and
   surfaces server error messages.
   ============================================================ */
const TOKEN_KEY = "aria.token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(method, url, body) {
  const headers = { "Content-Type": "application/json" };
  const tok = tokenStore.get();
  if (tok) headers.Authorization = "Bearer " + tok;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `เกิดข้อผิดพลาด (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (username, password) => request("POST", "/api/login", { username, password }),
  bootstrap: () => request("GET", "/api/bootstrap"),
  move: (payload) => request("POST", "/api/movements", payload),
  addProduct: (payload) => request("POST", "/api/products", payload),
  deleteProduct: (id) => request("DELETE", `/api/products/${encodeURIComponent(id)}`),
  addBranch: (payload) => request("POST", "/api/branches", payload),
  updateBranch: (id, payload) => request("PATCH", `/api/branches/${encodeURIComponent(id)}`, payload),
  deleteBranch: (id) => request("DELETE", `/api/branches/${encodeURIComponent(id)}`),
  listUsers: () => request("GET", "/api/users"),
  addUser: (payload) => request("POST", "/api/users", payload),
  updateUser: (id, payload) => request("PATCH", `/api/users/${encodeURIComponent(id)}`, payload),
  deleteUser: (id) => request("DELETE", `/api/users/${encodeURIComponent(id)}`),
  // reference data
  addCategory: (payload) => request("POST", "/api/categories", payload),
  updateCategory: (id, payload) => request("PATCH", `/api/categories/${encodeURIComponent(id)}`, payload),
  deleteCategory: (id) => request("DELETE", `/api/categories/${encodeURIComponent(id)}`),
  addSupplier: (name) => request("POST", "/api/suppliers", { name }),
  renameSupplier: (from, to) => request("PATCH", "/api/suppliers", { from, to }),
  deleteSupplier: (name) => request("DELETE", `/api/suppliers/${encodeURIComponent(name)}`),
  addLocation: (name) => request("POST", "/api/locations", { name }),
  renameLocation: (from, to) => request("PATCH", "/api/locations", { from, to }),
  deleteLocation: (name) => request("DELETE", `/api/locations/${encodeURIComponent(name)}`),
  addDepartment: (name) => request("POST", "/api/departments", { name }),
  renameDepartment: (from, to) => request("PATCH", "/api/departments", { from, to }),
  deleteDepartment: (name) => request("DELETE", `/api/departments/${encodeURIComponent(name)}`),
};
