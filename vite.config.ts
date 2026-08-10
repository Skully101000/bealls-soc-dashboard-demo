import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages project sites need a subpath, e.g. /bealls-soc-dashboard-demo/
// Local/dev and most hosts use "/". Set via VITE_BASE_PATH in CI.
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
});
