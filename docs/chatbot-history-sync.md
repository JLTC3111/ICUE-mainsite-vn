# Optional cross-device chat history

Implemented locally on 2026-09-24–25. No production migration, deployment,
commit, or push has been performed.

## Visitor flow

Open the bird, then use **Sync history** in the header. On the first device,
create a private pairing code. On another device, paste that code into the same
panel. Existing local conversations are merged, with separate threads for
Vietnamese, English, German, French, Korean, and Japanese. No newsroom account
or change to invite-only staff authentication is involved.

The pairing code grants access to the shared history, so the UI keeps it masked
and explains that it must remain private. It is never put into a URL or chat
analytics. Users can disconnect a device or delete the cloud copy. Deletion
invalidates subsequent sync attempts by other devices while retaining their
local messages; old devices cannot recreate the deleted copy automatically.

Local history works without configuring the sync backend. Ordinary visitors
who do not opt in make no history-sync requests.

## Implementation

- `shared/chatbot/lib/historyStore.js` owns the local store and cross-tab
  subscriptions. The existing `icueChatbotHistory:<locale>` keys are retained.
  Legacy entries receive stable IDs. Merges deduplicate and deterministically
  order messages; each locale retains up to 50 recent messages / 120 KB, with a
  4,000-character message limit. Link protocols and imported fields are checked.
- `historyCrypto.js` generates a 256-bit random pairing secret and uses HKDF to
  derive separate authentication and AES-256-GCM encryption keys. A fresh 96-bit
  IV is used per encryption. The code and encryption key remain in the browser;
  only the derived authentication token and ciphertext go to the server.
- `historySync.js` merges the latest server revision before writing. Revision
  checks prevent one device from overwriting another. A conflict triggers a
  bounded re-read/merge/retry. Lost creation responses reuse the same capability
  on retry within the current page. Pending local writes survive closing chat.
- Sync reacts to local changes, opening chat, reconnecting, and browser resume.
  A 30-second poll runs only while chat is open and the document is visible.
  Hidden/frozen pages abort requests and clear timers. Network failures keep
  messages locally; resuming re-reads the server before writing. Requests have
  deadlines and stale responses cannot attach to a disconnected identity.
- `netlify/functions/chat-history.mjs` exposes GET, PUT and DELETE. It derives the
  row ID from a SHA-256 hash of the bearer token, accepts bounded ciphertext only,
  checks request origin, excludes cookies, and returns non-cacheable responses.
  It never accepts a client-selected row ID or returns upstream credentials.
  A Netlify edge rule limits the endpoint to 90 requests/minute per IP/domain.
- `public.chat_history_vaults` has RLS enabled, with all privileges revoked from
  PUBLIC, anon and authenticated. Only the server service role has explicit
  table grants. No browser Supabase SDK or additional production package was
  added. Ciphertext is retained until the owner deletes it; there is no automatic
  retention sweep in this change.

## Production activation

1. Review and apply **only**
   `news-app/supabase/migrations/20260924121129_chatbot_device_sync.sql` to the
   intended ICUE Supabase database through the normal migration workflow. Do not
   blindly push unrelated historical migrations.
2. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Netlify's
   **Functions runtime**. Never prefix the service key with `VITE_` or place it
   in a public runtime config. The handler does not use newsroom sessions.
3. Deploy the reviewed site/function changes through the existing workflow.
   Check the deployment log confirms the endpoint's rate-limit configuration.
4. Run pairing, concurrent updates, offline/resume and delete/reconnect checks
   on the deployed site and real iOS/Android devices.

Without the migration/runtime configuration, the localized UI reports that sync
is unavailable and keeps the local conversation working. Existing local history
and chatbot retrieval do not depend on cloud availability. Deployment has not
been attempted in this task.

## Local verification

The tests use a disposable Postgres 17 + PostgREST 14.16 environment, with
locally generated test credentials. No production data is read or changed.

- `npm run test:chatbot`: matching, component, crypto, local history, concurrent
  sync, network failure, stale identity, delete and lost-response checks.
- `npm run test:security`: endpoint validation, row ownership, revision guards,
  origin rejection, access errors and existing site security regressions.
- `news-app/supabase/tests/chatbot_device_sync.sql`: SQL assertions for RLS,
  denied anonymous/staff reads, service grants, malformed data and stale writes.
- `node scripts/serve-chatbot-sync-qa.mjs`: local gateway on 3117, forwarding the
  built Vite site on 3116 and PostgREST on 54340; runs the actual Netlify handler.
- `node scripts/check-chatbot-sync-api.mjs`: actual HTTP/database/encryption,
  conflict, anonymous denial and deletion round trip against that gateway.
- `ICUE_SYNC_QA=1 ICUE_MASCOT_URL=http://127.0.0.1:3117` enables the paired-device
  browser case in `scripts/check-chatbot-mascot.mjs`.

The QA gateway signs credentials valid for one day using a public test-only
secret. Its credentials must never be used outside the disposable local setup.
Restart the gateway when that period expires.

Supabase's [explicit-grants change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
and [API security guidance](https://supabase.com/docs/guides/api/securing-your-api)
were checked before writing the migration. The function follows Netlify's
[documented edge rate-limit configuration](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).
