# Audit fixes and saved account drafts — 8 October 2026

The seven findings from the audit of `dc761ef25` are addressed. Draft saving is
manual, using **Save Draft**, as requested.

## Findings addressed

| Finding | Change |
| --- | --- |
| Failed article edits could destroy the published gallery | Uploads are prepared first; `save_article` commits article fields and gallery rows together under RLS. Failed commits preserve the old article and media. Save identities make an unchanged manual retry safe after a lost response. Stale editor timestamps are rejected. |
| Public names could reveal private account emails | Auth triggers, fresh setup, and browser profile creation use a neutral byline. The migration repairs historical email fallbacks while preserving explicitly supplied names and existing role permissions. |
| Denied session storage could prevent six apps from mounting | Shared guarded storage helpers make persistence optional. Reads, writes, and the newsroom schema fallback survive storage denial. |
| Anonymous reactions could mutate drafts | Heart/clap count and mutation RPCs now require a published article. Public engagement still works. |
| Article deletion retained gallery and cover files | Deletes and replacements enqueue known gallery and both cover paths in the database transaction. Browser and scheduled cleanup use the Storage API, retain failed work for retry, and check remaining references before removal. Foreign URLs never authorize deletion of local files. |
| Fresh database setup omitted required features | The checked-in schema is generated from the base plus all migrations. Fresh setup and upgrade replay are documented and tested; builds reject an outdated generated schema. |
| Dependency advisories affected all 11 lockfiles | Patched `source-map-js` is pinned throughout. Unused root server/build dependencies and commands for a missing server were removed. All 11 dependency audits returned zero vulnerabilities. |

AI endpoints now have request deadlines, payload limits, and Netlify rate limits.
Market and password-recovery upstream requests also have bounded deadlines.
The stale recovery test mock is repaired. Deployment builds run tests and lint;
the added GitHub workflow also runs the database suites.

## Saved drafts

- Signed-in authors can save incomplete or empty articles. Publishing still
  requires a title and body in both the editor and save RPC.
- The dashboard has **Saved drafts**, **Published**, and **All** filters, an
  account draft count, untitled labels, and a **Resume** action.
- Draft edits stay open after saving and show saving, saved, or unsaved status.
  A failed save retains entered content and allows manual retry. Reconnecting
  does not automatically send a write.
- Published articles use **Update**; saving them as drafts is rejected.
- Account changes discard the previous working copy and save session. Cached
  drafts and document titles are hidden when account or admin access changes.
- The workflow is translated into all six existing languages and fits the
  mobile editor layout.

## Verification

| Check | Result |
| --- | --- |
| Root test command | 251 passing: 55 security, 23 React, 43 recovery, 55 chatbot, 8 home media, 67 newsroom |
| Newsroom lint | Passed |
| Production builds | All ten apps passed; newsroom rebuilt after the final account-access changes |
| Routing and publication | 2,052 locale transitions; route shells, sitemap, robots, rewrites, required assets, fonts, and chatbot checks passed |
| Isolated PostgreSQL 17 | Four suites passed: fresh setup and migration replay, each with article/draft and chatbot access-control checks |
| Chrome against the production build | Incomplete save, reload, failed-save preservation, no reconnect writes, manual retry, dashboard resume, and mobile layout passed |
| Dependency audits | Zero reported vulnerabilities across root and ten apps |
| Patch whitespace | `git diff --check` passed |

Database tests exercise rollback, author/admin boundaries, anonymous draft
feedback rejection, media caps, shared file references, cleanup authorization,
first publication timestamps, idempotent retries, stale edits, and grants.
Browser tests use synthetic accounts and mocked APIs. No paid provider request,
real recovery email, or live article save/delete was used for verification.

## Hosted migration and deployment

`20261008080411_secure_article_saves_and_drafts` was applied successfully to the
configured Supabase project. Read-only checks confirmed the invoker save RPC,
cleanup RLS, anonymous save denial, role-write denial, and draft feedback denial.
The migration repaired 15 automatically inferred email bylines; none remain.
The local migration version matches the hosted migration history.

The frontend and Netlify Functions have not been deployed. Deploy them with the
updated build command. The new editor requires the applied save RPC and has no
nontransactional fallback. Configure `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in **Functions scope only** for the scheduled cleanup
function; never expose the service key through a `VITE_` variable. Scheduled
cleanup runs every 15 minutes on the published deployment.

Draft database records are restricted to their author and existing admins.
The existing `article-media` bucket remains public: anyone possessing an asset
URL can retrieve that asset, including a draft upload. Restricting object
listings does not make public URLs private. A private draft-media bucket would
require a separate signed-URL and publication workflow.

## Hosting follow-up

The post-migration Supabase advisor no longer flags mutable search paths for the
newsroom helpers repaired here. It still flags intentional public engagement
and scoped authenticated definer RPCs, and shared-project functions belonging
to other applications. Those notices are not a blanket security clearance.

Three hosted configuration notices remain: email OTP expiry exceeds an hour,
leaked-password protection is disabled, and the hosted Postgres version has
security patches available. These need a separate shared-project configuration
and database-upgrade review. See Supabase guidance for
[production security](https://supabase.com/docs/guides/platform/going-into-prod#security),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection),
and [database upgrades](https://supabase.com/docs/guides/platform/upgrading).
