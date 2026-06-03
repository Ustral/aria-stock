# Aria Stock — ระบบจัดการคลังสินค้าโรงแรม

A modern, minimal hotel inventory management dashboard (Linens · Bath Amenities · Guest
Supplies · Cleaning). Built from the Claude Design handoff for `Inventory Management.html`,
recreated as a real **Vite + React 18** app with ES modules.

## Features

- **ภาพรวม (Dashboard)** — count-up stat cards, animated area/bar charts, category-value
  donut, low-stock alert panel, recent activity table.
- **รับเข้า / จ่ายออก (Receiving / Issue)** — shared form with validation (can't issue more
  than on hand), before/after balance preview, today summary + recent history.
- **สินค้าคงเหลือ (Stock on Hand)** — filterable/sortable table with par-level bars.
- **ข้อมูลสินค้า (Item Master)** — card grid per item.
- **รายงานเคลื่อนไหว (Movement Report)** — filter by type/category/date range, trend chart,
  CSV export toast.
- **Item detail drawer** — gauge, par/reorder levels, cumulative in/out, history, quick actions.
- **Effects** — count-up numbers, hover lift + soft shadows, save toasts + low-stock warning,
  self-drawing SVG charts, smooth page transitions, slide-in drawers.
- **Tweaks panel** (gear icon in the sidebar) — accent color (4 presets) + density
  (compact / regular / comfy).

### Multi-branch + Head Office (HQ)

- **Branch switcher** (top bar) — switch between สำนักงานใหญ่ (HQ) and every branch; each row
  shows the branch's total units and low-stock count. All pages (dashboard, stock, flows,
  report, item detail) reflect the selected branch's data.
- **Per-branch stock** — quantity is tracked per `(branch, item)`. Receiving/Issue operate on
  the currently-selected branch and update only that branch's on-hand.
- **HQ-only admin** (available when viewing the HQ context):
  - **Add branch** — from the switcher's "เพิ่มสาขาใหม่"; opens with simulated starting stock.
  - **Add product** — from Item Master; added to the shared catalog → appears in every branch.
  - **Delete product** — from the item detail drawer (trash icon) with a confirm step; removed
    from the catalog and every branch's stock.
  - When viewing a branch (not HQ) these actions are hidden — the catalog and branch list are
    owned by HQ.

State is wired end-to-end: recording a movement updates that branch's on-hand quantities, charts,
and reports live; catalog/branch changes propagate everywhere immediately.

### Authentication & roles (real backend)

The app is backed by an **Express + JWT** API that is the source of truth and **enforces roles
and branch scoping on the server** (the UI gating is just convenience — the API rejects
unauthorized requests regardless of the client).

- **Login** issues a JWT (bcrypt-hashed passwords). The token is stored in `localStorage` and
  sent as `Authorization: Bearer …`.
- **Roles:**
  - **`hq` — Admin (สำนักงานใหญ่)** — full access: any branch, add/delete products, add branches,
    manage reference data, **and manage user accounts**.
  - **`manager` — ผู้จัดการสำนักงานใหญ่** — HQ-level access (any branch, products, branches,
    reference data) **except user management** (`/api/users` returns 403).
  - **`branch` (พนักงานสาขา)** — locked to their own branch. The API returns only their branch's
    data and refuses movements/admin calls for any other branch or for catalog/branch/user management.
- **User management** (Admin only, "จัดการผู้ใช้งาน") — create accounts (role + branch), reset
  passwords, suspend/re-enable, delete. Guards: can't suspend/delete your own account, and the last
  active Admin can't be removed. Suspended accounts can't log in.
- **Reference data** (HQ-level, "ข้อมูลอ้างอิง") — manage **Categories** (id/name/color/icon),
  **Suppliers**, and **Locations**. Renames cascade to product references; deletes are blocked while
  any product still uses the item. Reference data is served from the backend (no longer hard-coded).
- **Storage** is swappable (`server/persistence.js`): no `DATABASE_URL` → a local JSON file
  (`server/data.json`, zero-config dev); `DATABASE_URL` set → **Postgres** (managed, e.g. Neon).
  Delete the file / drop the `app_state` row to reseed.

### Deploy (free tier)

One Node service serves both the API and the built SPA. Recommended free stack:
**Render** (web service) + **Neon** (Postgres). See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the
full analysis and step-by-step. `render.yaml` is a ready Render blueprint.

**Demo accounts** (seeded):

| Username  | Password     | Role                              |
| --------- | ------------ | --------------------------------- |
| `admin`   | `admin123`   | HQ Admin (full, incl. users)      |
| `manager` | `manager123` | HQ Manager (all except users)     |
| `silom`   | `silom123`   | สาขาสีลม                           |
| `patong`  | `patong123`  | สาขาภูเก็ต ป่าตอง                   |
| `nimman`  | `nimman123`  | สาขาเชียงใหม่                       |

### Configuration (`.env`)

Copy `.env.example` → `.env`. The server loads it on start.

- `JWT_SECRET` — token signing secret. Required when `NODE_ENV=production` (the server refuses to
  start without it); in dev it falls back to an insecure value and warns.
- `API_PORT` — backend port (default `8787`; kept separate from the web dev server's `PORT`).

## Run

```bash
npm install
cp .env.example .env   # then set JWT_SECRET
npm run dev      # runs BOTH: Vite (http://localhost:5173) + API (http://localhost:8787)
npm run web      # frontend only
npm run server   # API only
npm run build    # production build of the frontend to dist/
```

`npm run dev` starts the web and API together via `concurrently`; Vite proxies `/api` → `:8787`.

## Structure

```
index.html              # entry, Google Fonts (Noto Sans Thai + JetBrains Mono)
server/                 # backend API (source of truth, role enforcement)
  index.js              # Express app + routes; serves the built SPA in production
  store.js              # in-memory state + seed (branches, catalog, stock, movements, users, refdata)
  persistence.js        # storage backend: JSON file (dev) or Postgres (DATABASE_URL)
  auth.js               # JWT sign/verify + role/branch middleware
  env.js                # loads .env into process.env before other modules
render.yaml             # Render deploy blueprint (one free web service)
DEPLOYMENT.md           # free DB + hosting analysis and step-by-step
src/
  main.jsx              # auth gate: Login vs App; session bootstrap
  api.js                # fetch wrapper (attaches JWT, surfaces server errors)
  Login.jsx             # login screen + demo accounts
  App.jsx               # multi-branch, role-based; mutations go through the API
  styles.css            # design tokens & global styles (verbatim from the design)
  data.js               # static reference (categories/suppliers) + formatting helpers
  icons.jsx             # line-icon set
  charts.jsx            # Area, Bar, Donut, Sparkline, count-up hooks
  components.jsx        # Toast, Sidebar, TopBar, BranchSwitcher, Modal, Drawer, primitives
  Admin.jsx             # HQ admin: add product, add branch, delete-product confirm
  TweaksPanel.jsx       # standalone accent/density panel
  pages/
    Dashboard.jsx
    Flows.jsx           # Receiving + Issue (shared StockForm)
    Stock.jsx           # Stock on Hand, Item Master, Item detail drawer
    Report.jsx          # Movement report
    Users.jsx           # User management (Admin only)
    RefData.jsx         # Reference data: categories / suppliers / locations (HQ-level)
  refdata.jsx           # React context for live reference data + catOf()
```
