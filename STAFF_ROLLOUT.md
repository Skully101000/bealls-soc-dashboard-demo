# SOC Dashboard — Staff Rollout Notes

Plain-English handoff for whoever owns this after the builder leaves.  
Keep this file with the project. You do **not** need to be a developer to follow it.

---

## Important: GitHub code ≠ the running website

- Opening the GitHub **code** page (file list / `App.tsx`) does **not** run the app. People only see files.
- To “just open in a browser” with **no download/install**, you need a hosted site — for this demo that is **GitHub Pages** (a `*.github.io` link).
- Work PCs that cannot install npm can still **view the demo URL** in Chrome/Edge. They cannot build or run the project locally without Node.js.

---

## What this app is

A **Security Operations Center (SOC) dashboard** concept for Bealls LP/SOC staff. It shows store priorities, watching lists, call board, BOLO/lookouts, maps, and operator rotation.

Sample BOLO and alert data are **fake training examples**, not real case files.

Florida and Texas SOC sites already appear in the same app (FL / TX badges). That is fine for now — one shared tool for both locations.

---

## Two GitHub places (do not mix them up)

| Place | Visibility | Purpose |
|-------|------------|---------|
| Private source: `bealls-soc-dashboard` | Private | Your full project / edits. Opening this does **not** launch the UI. |
| Public demo: `bealls-soc-dashboard-demo` | Public | Concept website via **GitHub Pages**. Anyone with the link can open it in a browser. |

**Demo URL (browser, no install):**  
https://Skully101000.github.io/bealls-soc-dashboard-demo/

Banner on the demo should read that it is a **concept preview — not a live SOC system**.

---

## Hard rules (do not skip)

1. **Never put real BOLOs, real case intel, passwords, or internal share paths** (`S:\SOC\…`) into the **public** demo repo or into demo data that gets published.
2. The public Pages site is for **presenting the idea** only. It is not the production SOC tool and is not gated to `@beallsinc.com`.
3. Staff access for a **real** internal rollout must still be gated to **company email only** (`@beallsinc.com`) before it becomes a live operations tool.
4. If you are unsure whether a link is private: **assume it is public** until email login is confirmed.

Company email domain for a future gated rollout: `beallsinc.com`.

---

## How the demo site updates

The clickable site is on the **public** demo repo’s **GitHub Pages** (`gh-pages` branch). No npm install is required on viewer PCs.

- Preferred long-term: GitHub Action `.github/workflows/deploy-pages.yml` (builds on push to `main`).  
  Pushing that workflow file needs a GitHub token with the **`workflow`** scope (`gh auth refresh -h github.com -s repo,workflow`).
- Current / fallback publish: from a machine with Node.js, run `scripts/deploy-demo-pages.sh` (scrubs sample staff names, builds, force-pushes `gh-pages`).

**Private** GitHub Pages usually needs a paid GitHub plan. That is why the clickable demo lives on the **public** demo repo.

---

## Optional later: gated internal hosting

When you want a real staff tool (not just a concept demo), put the app behind company login (for example Cloudflare Access allowing `*@beallsinc.com` only). Until that gate exists, treat any URL as world-visible.

Build settings if someone hosts it later:

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Output folder | `dist` |
| Secrets / env vars | None required for the static demo |

---

## What to tell your successor

- Read **this file first**, then `README.md`.
- Opening GitHub files ≠ opening the dashboard. Share the **github.io** demo link for “look in the browser.”
- Priority / Opportunity stores, Watching Wall, call board, and **Sunday store-assignment rotation** are intentional.
- BOLO and Dataminr cards may show **demo** text. Never commit real suspect dossiers into the public demo repo.
- FL + TX work as **one operation**. The shared **live board** (below) syncs Incoming/Open alerts, on-station status, and live observation stores across browsers.

---

## Shared live board (FL & TX — same queue)

With Supabase configured, every browser sees the **same** call board and operator presence (on station / live obs / calls watching). Watching Wall still shows FL|TX columns; the underlying queue is shared.

Without keys, the app stays **local-only** and shows a banner: `Local only — not synced`.

### Click-by-click setup (free Supabase)

1. Go to [https://supabase.com](https://supabase.com) → sign in → **New project**.
2. Pick an org, name (e.g. `bealls-soc`), set a DB password (save it), choose a region, create the project. Wait until it is ready.
3. Left sidebar → **SQL Editor** → **New query**.
4. Open the file `supabase/schema.sql` in this repo → copy **all** of it → paste into the SQL Editor → **Run**.
5. Left sidebar → **Project Settings** (gear) → **API**.
6. Copy:
   - **Project URL** → this is `VITE_SUPABASE_URL`
   - **anon public** key → this is `VITE_SUPABASE_ANON_KEY`
7. In the project root (same folder as `package.json`), create a file named `.env.local` (never commit this file):

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

8. Restart the dev server so Vite picks up the env:

```bash
npm install
npm run dev
```

9. Open the URL Vite prints. The top sync banner should say:  
   **Live board — FL & TX see the same queue**

### How to test with two browser windows

1. Open the app in Chrome window A.
2. Open the **same URL** in a second window (or an Incognito window) as window B.
3. In A: add an Incoming alert, mark Done, go On Station, or set live observation stores.
4. In B: within about a second, the same Incoming/Open queue and operator presence should update.
5. If B still shows `Local only — not synced`, the env file is missing or the server was not restarted after adding `.env.local`.

### Auth note (demo vs production)

- This MVP uses the Supabase **anon** key with RLS that allows read/write for the demo table. That is fine for an internal concept demo on a **private** machine/network.
- **Do not** put the anon key into the public GitHub demo repo or a public Pages site unless you accept that anyone can write the board.
- Before real SOC use: gate the app to `@beallsinc.com` and tighten RLS (authenticated users only).

### Schema reference

Full SQL lives in `supabase/schema.sql` (table `soc_board`, single row `id = 'main'`, JSON payload with `incidents` + `operators`).

---

## Quick local check (optional — needs Node.js)

Most store work PCs **cannot** do this. Use the GitHub Pages demo URL instead.

```bash
npm install
npm run dev
```

To build:

```bash
npm install
npm run build
```

Optional live sync: add `.env.local` with Supabase keys (see **Shared live board** above), then restart `npm run dev`.

---

## If something breaks

1. Do not “fix” by pasting real case data into the public demo.
2. Keep using the private repo as source of truth.
3. Hand this file + the private project to whoever takes over hosting.
4. Live board stuck on local: confirm `.env.local` exists, keys are correct, SQL was run, and you restarted `npm run dev`.
