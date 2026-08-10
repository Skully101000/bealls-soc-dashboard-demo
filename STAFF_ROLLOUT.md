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

Pushes to `main` on the **public demo** repo run a GitHub Action that builds the site and deploys GitHub Pages. No npm install is required on viewer PCs.

Private repo can keep the same workflow file for reference; **private** GitHub Pages usually needs a paid GitHub plan. That is why the clickable demo lives on the **public** demo repo.

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
- FL + TX work as **one operation**. Later, a shared live board is the next big win for both floors.

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

---

## If something breaks

1. Do not “fix” by pasting real case data into the public demo.
2. Keep using the private repo as source of truth.
3. Hand this file + the private project to whoever takes over hosting.
