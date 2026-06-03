/* ============================================================
   Auth — JWT issuing + verification, role/branch middleware.
   ============================================================ */
import jwt from "jsonwebtoken";

// Secret comes from the environment (.env / secret manager). Refuse to start
// in production without one; fall back to a dev-only value otherwise.
const SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production (set it in .env)");
  }
  console.warn("[auth] JWT_SECRET not set — using an insecure dev fallback. Create a .env (see .env.example).");
  return "aria-stock-dev-secret-change-me";
})();
const TTL = "12h";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, branchId: user.branchId },
    SECRET, { expiresIn: TTL }
  );
}

export function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "ไม่ได้เข้าสู่ระบบ" });
  try {
    req.auth = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  }
}

// HQ-level = full admin (`hq`) or manager (`manager`); both operate across branches
// and manage catalog/branches/reference data. Only `hq` may manage user accounts.
const HQ_LEVEL = new Set(["hq", "manager"]);
export const isHQLevel = (role) => HQ_LEVEL.has(role);

export function requireHQLevel(req, res, next) {
  if (!HQ_LEVEL.has(req.auth?.role)) return res.status(403).json({ error: "เฉพาะระดับสำนักงานใหญ่เท่านั้น" });
  next();
}

export function requireUserAdmin(req, res, next) {
  if (req.auth?.role !== "hq") return res.status(403).json({ error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น" });
  next();
}

// HQ-level may act on any branch; branch staff only on their own.
export function canAccessBranch(auth, branchId) {
  if (HQ_LEVEL.has(auth.role)) return true;
  return auth.branchId === branchId;
}
