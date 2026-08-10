#!/usr/bin/env bash
# Rebuild and publish the public GitHub Pages demo (gh-pages branch).
# Use when the GitHub token lacks `workflow` scope for Actions, or for a one-off publish.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="${DEMO_REMOTE:-demo}"
REPO_URL="${DEMO_REPO_URL:-https://github.com/Skully101000/bealls-soc-dashboard-demo.git}"

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  git remote add "$REMOTE" "$REPO_URL"
fi

echo "Scrubbing staff-identifying fields for public demo…"
python3 scripts/scrub-for-public-demo.py

echo "Building…"
export VITE_BASE_PATH=/bealls-soc-dashboard-demo/
export VITE_DEMO=true
npm run build
cp dist/index.html dist/404.html

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -R dist/. "$TMP/"
cd "$TMP"
git init
git checkout -b gh-pages
git add -A
git -c user.name='soc-demo-bot' -c user.email='soc-demo@users.noreply.github.com' commit -m "Deploy SOC dashboard concept demo to GitHub Pages."
git remote add origin "$REPO_URL"
git push -f origin gh-pages

echo "Published: https://skully101000.github.io/bealls-soc-dashboard-demo/"
echo "Note: restore private soc-data.json from git if this scrubbed your working tree:"
echo "  git checkout -- src/app/data/soc-data.json"
