Fresh projects: run the complete generated `schema.sql` in the SQL editor. It
includes `schema-base.sql` and every checked-in migration in order. Configure
invite-only Auth, the public URL, and approved password recovery callbacks.

Existing projects: apply only pending files under `migrations/`. Do not run the
original base over a live database. Preserve the existing profile column grants
and service-only chatbot history permissions.

After adding a migration with `supabase migration new <name> --workdir news-app`,
run `npm run prepare:schema`. `npm run verify:schema` and the deployment build
reject a stale bootstrap. `npm run test:database` uses an isolated disposable
Postgres 17 Docker container, verifies both fresh setup and migration replay,
and exercises draft privacy, save rollback, storage cleanup and chatbot ACLs.

Deploy `secure_article_saves_and_drafts` before the new editor. The editor uses
the `save_article` RPC and deliberately fails rather than falling back to
partially updating published galleries. New drafts accept incomplete content;
publishing requires a title and body. Authors own their drafts, with existing
admin access preserved.

Gallery and cover removals enqueue cleanup in the same database transaction.
The browser removes confirmed files through the Storage API. The scheduled
`article-media-cleanup` Netlify function retries pending work every 15 minutes.
Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Functions scope only.
Cleanup tombstones prevent attaching files while they are being removed. SQL
never deletes Storage metadata directly. Draft records are protected by RLS;
the existing `article-media` bucket remains public for article assets.
