# ICUE News

A performance-oriented React + Vite news platform backed by Supabase, designed to
sit alongside the main `icue.vn` site. It ships five core surfaces:

| # | Surface | Route | Subdomain |
|---|---------|-------|-----------|
| 1 | Login (minimalist, gradient) | `/login` | `newslogin.icue.vn` |
| 2 | Upload / authoring (Medium-style, rich text + media) | `/write` | `news.icue.vn` |
| 3 | Edit existing article | `/edit/:id` | `news.icue.vn` |
| 4 | News grid (latest news) | `/` | `news.icue.vn` |
| 5 | Article detail | `/article/:slug` | `news.icue.vn` |

Supporting pages: `/dashboard` (an author's own articles) and `/profile`
(display name, full name, bio, avatar).

## Stack

- **React 19 + Vite** (rolldown build, manual chunks)
- **Supabase** — Auth, Postgres (RLS), Storage
- **TipTap** — Medium-style rich text editor (bold/italic/underline, headings,
  quotes, lists, links, inline images, alignment)
- **i18next** — multi-language (VI + EN included; add more in `src/locales`)

## 1. Configure environment

Copy `.env.example` to `.env` and fill in your Supabase credentials
(Project Settings → API):

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
VITE_PUBLIC_NEWS_ORIGIN=https://news.icue.vn
VITE_LOGIN_ORIGIN=https://newslogin.icue.vn
```

## 2. Set up the database

In the Supabase dashboard → SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
This creates:

- `profiles` (auto-created per auth user via trigger; role `author`/`admin`)
- `articles` (HTML + TipTap JSON, slug, status, date/time, read time)
- `article_media` (capped at **10 images + 2 videos** per article by a trigger)
- Storage buckets `avatars` and `article-media` (public read, per-user write)
- Row Level Security: published articles are public; drafts and writes are
  restricted to the owner or an admin.

**Invite-only access:** in Authentication → Providers/Settings, disable signups.
Create users from the dashboard, then promote your first admin:

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

## 3. Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the production build
```

Locally, login is at `/login`. In production it also lives on
`newslogin.icue.vn` (the root of that host redirects to the form).

## 4. Deploy (two subdomains, one build)

Build once and serve `dist/` from both `news.icue.vn` and `newslogin.icue.vn`.
The app is a SPA using history routing, so configure a catch-all rewrite to
`index.html`:

- **Vercel** — `vercel.json` is included.
- **Netlify** — `public/_redirects` is included.
- **Nginx** — `try_files $uri /index.html;`

## Performance notes

- Route-level code splitting via `React.lazy`; the heavy TipTap editor (~440 KB)
  is its own chunk and never loads for anonymous readers.
- Manual vendor chunks (`react`, `supabase`, `editor`, `i18n`, `router`) for
  long-term caching.
- `content-visibility: auto` + `contain-intrinsic-size` on cards to skip
  off-screen rendering work.
- All images use `loading="lazy"` + `decoding="async"`; videos use
  `preload="metadata"`. Storage assets are served with a 1-year cache header.
- `React.memo` on presentational components; `useMemo`/`useCallback` on hot paths.
- `prefers-reduced-motion` respected globally.
