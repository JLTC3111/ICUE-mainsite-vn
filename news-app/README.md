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

Also: `/newsroom/dashboard`, `/newsroom/profile`, `/newsroom/assist` (Intelligent Editor / AI assist for logged-in authors).

## AI Assist

Protected route at `/newsroom/assist`. Calls `POST /newsroom/api/gemini-article` with the user’s Supabase session. Requires Netlify env:

- `GEMINI_API_KEY` (Builds + Functions scopes)
- optional `GEMINI_MODEL` (default `gemini-3.5-flash-lite`; falls back across lite/flash models on 404/429)

**Generate Image** on the same page calls `POST /newsroom/api/flux-image` (Cloudflare Workers AI FLUX). Requires:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` (Workers AI permission)
- optional `CLOUDFLARE_FLUX_MODEL` (default `@cf/black-forest-labs/flux-1-schnell`)

If you see **429**, that is Gemini quota/capacity — wait and retry, or enable billing / raise limits in [Google AI Studio](https://aistudio.google.com/).

### Chat history + text translation cache

Apply migration on Supabase:

`news-app/supabase/migrations/20260724180000_assist_history_and_text_translations.sql`

Creates:
- `assist_threads` / `assist_messages` — per-user AI Assist history (RLS)
- `text_translations` — hash-keyed cache for freeform Assist reply translations (service-role writes)

Article/comment MT already uses `article_translations` / `comment_translations`.

**Important:** translation cache writes need `SUPABASE_SERVICE_ROLE_KEY` (Builds + Functions). Without it, language switches re-run Google Translate every time. Cache hits skip Google Detect/Translate; the client still calls `/api/translate-article` but the server returns `cached: true` from the DB.

Locally, put `GEMINI_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN` in `news-app/.env` so the Vite market API plugin can proxy the same endpoints.

## Notifications

Bell + dropdown in the header for signed-in admins and authors. Apply migration on Supabase:

`news-app/supabase/migrations/20260730120000_notifications.sql`

Events are raised by database triggers, so they fire regardless of which client path wrote the row:

| Event | Fires when |
|---|---|
| `article_published` | an article first transitions to `published` — **edits never notify** |
| `article_deleted` | the article row is deleted (the notice outlives the article) |
| `views_milestone` | `view_count` crosses 100 / 500 / 1k / 5k / 10k / 50k / 100k |
| `hearts_milestone` | hearts cross 1 / 5 / 10 / 25 / 50 / 100 / 250 / 500 / 1k |
| `claps_milestone` | claps cross the same thresholds as hearts |

Recipients are the article's author plus every admin; whoever caused the event is never notified about their own action. Thresholds live in `newsroom_view_milestones()` / `newsroom_reaction_milestones()` — edit those two functions to retune, no app changes needed.

Everything this feature adds is namespaced `newsroom_*` (table `newsroom_notifications`, enum `newsroom_notification_type`, the RPCs below). This project already has unrelated `notifications` and `hr_notifications` tables; nothing here reads, writes, or alters them.

Rows are read under RLS (`recipient_id = auth.uid()`) and read state changes only through `mark_newsroom_notification_read` / `mark_all_newsroom_notifications_read` / `dismiss_newsroom_notification`. The migration also adds the table to the `supabase_realtime` publication so the badge updates live; without Realtime the client falls back to polling every 90s plus on tab focus. If the migration has not been applied, the bell hides itself rather than erroring.

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
