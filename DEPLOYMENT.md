# Deploying Aria Stock (free tier)

This app is a single Node service that serves both the REST API and the built
React SPA. That makes it cheap to host: **one free web service + one free
managed database**.

## Recommended free stack

| Piece | Choice | Why |
| ----- | ------ | --- |
| Database | **Neon** (managed Postgres) | Free 0.5 GB, serverless, no credit card, resumes fast after idle |
| Hosting | **Render** (Web Service, free) | Runs the Express app and serves the SPA from one URL (same origin → no CORS). Sleeps after 15 min idle, wakes in ~30–50 s |

Both are free to start and require no card.

### Other good free options

**Databases**
- **Supabase** (Postgres) — 500 MB, also gives auth/storage; project pauses after ~1 week idle.
- **MongoDB Atlas** — M0 512 MB, free forever (would need a Mongo adapter; today we ship Postgres).
- **Turso** (libSQL / SQLite) — generous free tier, SQLite-compatible.

**Hosting**
- **Fly.io** — small always-on allowance, more config.
- **Railway** — easy, but only a one-time trial credit then paid.
- **Vercel / Netlify / Cloudflare Pages** — excellent for the *frontend*, but the Express API
  would need to be re-shaped into serverless functions. Our single-service approach avoids that.

## How storage is wired

`server/persistence.js` picks the backend from the environment:

- **No `DATABASE_URL`** → a local JSON file (`server/data.json`). Zero-config for development.
- **`DATABASE_URL` set** → **Postgres**. The whole app state is stored as one JSON document
  in an `app_state` table (auto-created on boot). Simple, and it migrates cleanly to a
  normalized schema later if you outgrow it.

Nothing else changes between dev and prod — same code, same routes.

## Step-by-step: Neon + Render

1. **Push to GitHub.** Commit the project and push to a GitHub repo.

2. **Create the database (Neon).**
   - Sign up at neon.tech → create a project (pick a region near your users).
   - Copy the **connection string** (looks like
     `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).

3. **Deploy on Render.**
   - render.com → **New + → Blueprint** → select your repo (it reads `render.yaml`), **or**
     **New + → Web Service** and set:
     - Build command: `npm install --include=dev && npm run build`
       (`--include=dev` so Vite installs even though `NODE_ENV=production`)
     - Start command: `npm run start`
   - In the service's **Environment** tab set:
     - `NODE_ENV = production`
     - `JWT_SECRET = ` a long random string (the blueprint auto-generates one)
     - `DATABASE_URL = ` the Neon connection string from step 2
   - Deploy. On first boot the database is auto-seeded (demo accounts + sample data).

4. **Log in** at your Render URL with `admin / admin123` and **immediately change the demo
   passwords** (จัดการผู้ใช้งาน → reset password), then create your real accounts.

## Notes for real use

- **Change all demo passwords** and create your own admin before sharing the URL.
- The free Render service **sleeps when idle** — the first request after a nap takes ~30–50 s.
  Upgrade to a paid instance (or add an uptime pinger) to keep it warm.
- Seeded sample data is only created when the database is empty; your real data persists in Neon
  across deploys and restarts.
- To reset to a clean seed: drop the `app_state` row (or table) in Neon and restart the service.
- The current model stores state as one JSON document. If you scale up (many concurrent writers,
  large history, SQL reporting), split it into normalized tables (`users`, `branches`, `products`,
  `stock`, `movements`, …) behind the same `persistence.js` interface.
