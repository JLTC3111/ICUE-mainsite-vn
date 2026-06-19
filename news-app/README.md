# ICUE News

React + Vite news platform backed by Supabase, served at **`/newsroom/`** on the main ICUE site.

**Legacy archive** (unchanged): `http://localhost:5173/#/News` → old static news grid.

| # | Surface | Path |
|---|---------|------|
| 1 | Login | `/newsroom/login` |
| 2 | Upload / authoring | `/newsroom/write` |
| 3 | Edit article | `/newsroom/edit/:id` |
| 4 | News grid | `/newsroom/` |
| 5 | Article detail | `/newsroom/article/:slug` |

Also: `/newsroom/dashboard`, `/newsroom/profile`.

## Develop

**Option A — live HMR (recommended while editing the newsroom):**

```bash
cd news-app
npm install
npm run dev      # http://localhost:5173/newsroom/
```

**Option B — main site dev server (`/` + `#/News` + prebuilt newsroom):**

```bash
npm run build:newsroom   # from repo root — rebuild after news-app changes
npm run dev              # http://localhost:5173/newsroom/ serves ../newsroom/
```

For continuous rebuilds while using the root dev server: `cd news-app && npm run build:watch`.

## Deploy

Build once (`npm run build` inside `news-app`). Output is `../newsroom/` at the repo root. Netlify `_redirects` handles SPA fallback: `/newsroom/*` → `/newsroom/index.html`.

The glass CTA on the legacy `#/News` page links to `/newsroom/`.
