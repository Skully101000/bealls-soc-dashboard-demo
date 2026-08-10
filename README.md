# Security Operations Center Dashboard

This is a standalone React + TypeScript + Tailwind CSS project, reconstructed
from your Figma Make project so you own the code and can edit it freely —
in Claude, in VS Code, or with any developer.

## Run it locally

You'll need [Node.js](https://nodejs.org) (v18 or newer) installed.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## Refresh data from Excel

When your station assignments workbook is updated, re-import it:

```bash
npm run import-data
# or pass a custom path:
python3 scripts/import-assignments.py "/path/to/Store Assignments.xlsx"
```

This reads **Top_Stores**, **Assignments**, **Stores** (time slots), and **Dataminr Alerts** into `src/app/data/soc-data.json`.

## Edit it

Everything lives in **`src/app/App.tsx`** — it's one large file containing
the whole dashboard (nav, incidents, operators, stores, BOLO, maps, etc.)
plus all the sample data (stores, operators, incidents). Colors and design
tokens are in `src/styles/theme.css`.

Because it's now plain code, you can:
- Ask Claude Code (or paste sections into claude.ai) to make changes
- Hand it to any React developer
- Edit it directly yourself

## Deploy it as a live website

The easiest options, in order of simplicity:

1. **Vercel** — `npx vercel` in this folder, or drag-and-drop the project at [vercel.com/new](https://vercel.com/new)
2. **Netlify** — drag the `dist/` folder (after `npm run build`) onto [app.netlify.com/drop](https://app.netlify.com/drop)
3. **GitHub Pages** — push this folder to a GitHub repo and connect it to Pages

To build a production version first:

```bash
npm run build
```

This outputs static files to `dist/`, which any static host can serve.

## Stack

- React 18 + TypeScript
- Vite (dev server & bundler)
- Tailwind CSS v4
- `lucide-react` (icons), `recharts` (charts), `react-leaflet` + `leaflet` (map)

## Notes

- Sample/demo data (stores, operators, incidents, BOLO subjects) is hardcoded
  in `App.tsx` — replace it with a real API or database whenever you're ready.
- Photos for BOLO cards currently link to Unsplash placeholder images.
