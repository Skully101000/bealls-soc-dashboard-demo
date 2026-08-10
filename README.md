# Bealls SOC Dashboard (private source)

Security Operations Center dashboard concept for Bealls LP/SOC.

## Demo website (open in browser — no install)

Staff who only need to **look** at the idea should use the public GitHub Pages demo:

**https://Skully101000.github.io/bealls-soc-dashboard-demo/**

- That link runs in the browser. No npm, no download.
- Opening **this** private GitHub repo only shows source files — it does **not** run the app.
- Public demo repo: https://github.com/Skully101000/bealls-soc-dashboard-demo  
  (**Demo only — not a live SOC system.** Do not put real BOLOs or secrets there.)

See `STAFF_ROLLOUT.md` for handoff notes.

## Run locally (needs Node.js)

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## Build

```bash
npm install
npm run build
```

Output goes to `dist/`.

For the GitHub Pages demo path, CI sets:

- `VITE_BASE_PATH=/bealls-soc-dashboard-demo/`
- `VITE_DEMO=true`

## Refresh data from Excel

```bash
npm run import-data
```

## Stack

- React 18 + TypeScript
- Vite + Tailwind CSS v4
- `lucide-react`, `recharts`, `react-leaflet` + `leaflet`

## Notes

- Sample/demo data is for concept preview. Replace carefully; never commit real suspect dossiers into the public demo repo.
- Photos for BOLO cards currently link to Unsplash placeholders.
