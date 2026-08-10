# SOC Dashboard — Staff Rollout Notes

Plain-English handoff for whoever owns this after the builder leaves.  
Keep this file with the project. You do **not** need to be a developer to follow it.

---

## What this app is

A **Security Operations Center (SOC) dashboard** for Bealls LP/SOC staff. It shows store priorities, watching lists, call board, BOLO/lookouts, maps, and operator rotation.

Today it is mainly a **local / demo-ready** app. Sample BOLO and alert data are **fake training examples**, not real case files.

Florida and Texas SOC sites already appear in the same app (FL / TX badges). That is fine for now — one shared tool for both locations.

---

## Hard rules (do not skip)

1. **Never put this on a public website** (no open Vercel/Netlify/GitHub Pages link anyone can Google).
2. Staff access must be gated to **company email only** (`@beallsinc.com`) before anyone outside the SOC folder uses it.
3. Do **not** paste real internal file paths (for example `S:\SOC\…`) or real case intel into the demo data in the code.
4. If you are unsure whether a link is private: **assume it is public** until email login is confirmed.

---

## What you still need to fill in

| Item | Value |
|------|--------|
| Company email domain (for login gate) | `beallsinc.com` (staff emails look like `name@beallsinc.com`) |
| Who owns Cloudflare / hosting login | ________________________ |
| Who can add/remove SOC staff | ________________________ |
| Backup contact if owner leaves | ________________________ |

---

## Next step (recommended): Cloudflare Pages + Zero Trust Access

Goal: staff open a private link, sign in with their **@beallsinc.com** email, then see the dashboard. Outsiders get blocked.

Rough path (someone with a company card/login can do this in an afternoon):

1. Create a **Cloudflare** account (work email `@beallsinc.com` if signup allows it; otherwise a personal email is fine — see Phase 1 checklist).
2. Deploy this project with **Cloudflare Pages** (upload the built `dist` folder — this project is **not** on Git yet).
3. Turn on **Cloudflare Zero Trust → Access** in front of that site.
4. Access policy: **Allow** emails matching `*@beallsinc.com` (everyone with a Bealls Inc email). Later you can tighten to a smaller SOC list if needed.
5. Test with one FL and one TX operator before announcing to the whole team.

Until that gate exists, run the app **only on trusted machines** (`npm run dev` / local use). Do not email a public URL.

*(IT will not set this up for you in many stores — that is why the steps below are written for a non-developer owner plus one helpful admin.)*

### Phase 1 build settings (for whoever clicks in Cloudflare)

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Output folder | `dist` |
| Secrets / env vars | **None required** for Phase 1 |
| Preferred deploy | **Direct Upload** of `dist` (drag-and-drop or Wrangler) — there is no Git repo in this folder yet |
| SPA URL rewrite | Not required today (the app does not use page URLs / React Router) |

---

## What to tell your successor

- This folder is the source of truth. Read **this file first**, then `README.md` for how to run/build.
- Priority / Opportunity stores, Watching Wall, Incoming/Open call board, and **Sunday store-assignment rotation** are intentional — do not “clean them up” without asking SOC leads.
- BOLO and Dataminr cards may still show **demo** text until real data is wired in. Replace samples carefully; never commit real suspect dossiers into public repos.
- FL + TX work as **one operation**. Later, **Phase 2 — a shared live board** (same incidents/assignments updating for both sites in real time) is strongly recommended so the two floors stay in sync. Same app today is OK; shared live data is the next big win.

---

## Quick local check (optional)

On a work computer with Node.js installed:

```bash
npm install
npm run dev
```

Open the local address it prints. You should see a thin banner: **Internal use only — authorized SOC staff**.

To prepare files for Cloudflare upload:

```bash
npm install
npm run build
```

That creates a `dist` folder. Upload **that** folder (not the whole project) when using Direct Upload.

---

## If something breaks

1. Do not “fix” by publishing the site publicly.
2. Keep using the last known good local copy.
3. Hand this file + the project folder to whoever takes over hosting/Access.

---

## Phase 1 checklist — Cloudflare Pages + Zero Trust (click-by-click)

For a non-tech SOC lead. Do these in order. Stop if anything asks you to make the site “public to the whole internet” without a login screen.

### A. Create a Cloudflare account

1. Open a browser and go to: `https://dash.cloudflare.com/sign-up`
2. Prefer signing up with a **@beallsinc.com** work email if the signup page accepts it.
3. If company email is blocked, spam-filtered, or signup fails: use a **personal email** instead. That is OK for Phase 1. Write down which email you used in the table above under “Who owns Cloudflare.”
4. Finish signup, verify the email, and turn on **two-factor authentication (2FA)** when Cloudflare offers it (phone app or text). Do not skip this.
5. You do **not** need to buy a domain or move Bealls’ website DNS for Phase 1. Cloudflare can give the dashboard its own `*.pages.dev` address.

### B. Build the upload folder on a work computer

1. Make sure **Node.js** is installed (from `https://nodejs.org` — LTS version is fine).
2. Open the project folder: `soc-dashboard` (the folder that contains `package.json` and this file).
3. Open Terminal (Mac) or Command Prompt / PowerShell (Windows) **in that folder**.
4. Type: `npm install` → press Enter. Wait until it finishes.
5. Type: `npm run build` → press Enter. Wait until it finishes.
6. Confirm a new folder named **`dist`** appeared inside the project. That is what you upload.

### C. Deploy with Cloudflare Pages (Direct Upload — preferred; no Git)

This project is **not** set up as a Git repository yet, so do **not** look for “Connect to GitHub” as the main path.

**Option 1 — Drag and drop `dist` (simplest)**

1. Sign in at `https://dash.cloudflare.com`
2. In the left menu, click **Workers & Pages** (wording may say **Workers** or **Compute** on newer dashboards).
3. Click **Create** → **Pages** → **Upload assets** (or **Direct Upload**).
4. Project name: type something clear, e.g. `soc-dashboard` → Continue / Create.
5. Drag the entire **`dist`** folder onto the upload area (or use Browse and select the files inside `dist`).
6. Click **Deploy site**.
7. When it finishes, Cloudflare shows a link like `https://soc-dashboard.pages.dev` (your name may differ). **Copy that link but do not email it to the whole team yet.**

**Option 2 — Wrangler command line (if someone tech-comfortable helps)**

1. In the project folder, after `npm run build`, they can run Cloudflare’s upload tool (`npx wrangler pages deploy dist --project-name=soc-dashboard`).
2. Follow the browser login prompt if asked.
3. Same result: a `*.pages.dev` link. No secrets or API keys are required in the project files for Phase 1.

### D. Turn on Zero Trust Access (email gate)

Do this **before** sharing the link widely. The site may be reachable until Access is on — treat the URL as sensitive.

1. In the Cloudflare dashboard, go to **Zero Trust** (sometimes under a separate Zero Trust / Cloudflare One home: `https://one.dash.cloudflare.com`).
2. If asked to create a Zero Trust / Cloudflare One team: pick a short team name (e.g. `bealls-soc`) and continue. Free / Zero Trust free tier is enough to start.
3. In Zero Trust, open **Access** → **Applications**.
4. Click **Add an application**.
5. Choose **Self-hosted**.
6. Application name: e.g. `SOC Dashboard`.
7. Session duration: leave the default (or pick something like 24 hours).
8. Application domain / URL: select or type your Pages hostname (the `something.pages.dev` from step C). Protect the whole site (root path `/`).
9. Click **Next** to policies.

### E. Access policy — only @beallsinc.com

1. Policy name: e.g. `Allow Bealls staff`.
2. Action: **Allow**.
3. Include rule:
   - Selector: **Emails ending in** (or **Email domain** / **Emails** — wording varies).
   - Value: `beallsinc.com`  
   - Or if it asks for a full pattern: `*@beallsinc.com`
4. Do **not** add “Everyone” or “Any email” as an include rule.
5. Save / Deploy the application and policy.
6. Optional later: instead of the whole company domain, switch to an allow-list of specific SOC emails only.

### F. Test before announcing

1. Open the Pages link in a **private / incognito** window.
2. You should see a **Cloudflare Access** login / email prompt — not the raw dashboard with no gate.
3. Sign in with **your @beallsinc.com** work email. Complete the one-time code / login email Cloudflare sends.
4. Confirm the SOC dashboard loads after login.
5. Sign out (or use another private window). Try a **personal Gmail** (or any non-beallsinc.com address).
6. Confirm that personal Gmail is **blocked** or never gets in.
7. Repeat once with a second SOC person (ideally the other site: FL or TX).

Only after steps 3–6 pass should you share the link with the floor.

### G. Handoff — who inherits the account

Fill this in and keep a printed or shared copy with SOC leadership (not in a public chat):

| Handoff item | Write it here |
|--------------|----------------|
| Cloudflare login email | ________________________ |
| Who knows the password | ________________________ |
| Who has 2FA / recovery codes | ________________________ |
| Backup person if owner leaves | ________________________ |
| Pages project name + URL | ________________________ |

If the owner leaves Bealls, transfer the Cloudflare login **and** 2FA recovery codes to the backup person the same week. Losing Access admin access locks the whole team out of updates.

### Phase 1 done when

- [ ] Site is on Cloudflare Pages  
- [ ] Zero Trust Access is on  
- [ ] Policy allows `*@beallsinc.com` only  
- [ ] Work email works; personal Gmail fails  
- [ ] Owner + backup are written in the tables above  
