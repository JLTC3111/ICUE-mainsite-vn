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

```bash
cd news-app
npm install
npm run dev      # http://localhost:5173/newsroom/
npm run build    # outputs to ../public/newsroom/
```

## Deploy

Build once (`npm run build`). Output is `public/newsroom/`. Configure SPA fallback: `/newsroom/*` → `/newsroom/index.html`.

The glass CTA on the legacy `#/News` page links to `/newsroom/`.
