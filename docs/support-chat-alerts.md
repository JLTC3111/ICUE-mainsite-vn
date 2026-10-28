# Support chat alerts

Newsroom administrators enable chat alerts with **Notify me** beside **Go online**
in the Support inbox. The choice is saved per staff account in this browser;
chat availability and the existing article-notification bell remain independent.
Once enabled, alerts continue across newsroom routes and background tabs.

Each conversation has one persistent toast. Further visitor messages update its
preview and count. The entire toast supports pointer activation, Enter and Space;
activation opens that conversation and dismisses that version of the alert.
There is no expiry timer, fuse, automatic read-state dismissal, or swipe/Escape
dismissal. Pending alerts and the message cursor survive reloads in this tab.
Unread counts cover the whole inbox, including conversations outside the current
filter or page. New messages still alert when an open thread has marked them read.

The alert feed uses the existing administrator permission check in a private
database function behind a public invoker RPC. It does not expose raw chat tables
or return visitor email addresses or capability tokens. The client polls every
2.5 seconds while visible and every 10 seconds while hidden; browser timer
throttling can delay background checks. Returning to the tab or reconnecting
checks immediately. Requests are serialized and bounded batches drain in order.
A processed-message overlap catches recent transactions that commit below the
cursor, and deduplication survives reloads. Revoked access clears private alerts.

Apply `news-app/supabase/migrations/20261027180300_support_chat_alerts.sql` to an
existing database before releasing this frontend. Fresh databases use the
generated `news-app/supabase/schema.sql`. The migration is additive and does not
change the existing inbox/read APIs or article notifications.

Verification includes the alert-store regression tests, all existing application
tests and lint, fresh/upgrade PostgreSQL suites, the local database security
advisor, and Chrome checks against the actual SQL functions in an isolated test
database. Browser checks cover persistence, grouping, click/keyboard navigation,
open/read conversations, filtering/pagination, mute/resume, account permissions,
six-language phone layouts and reduced motion. No live customer messages are
created by these checks.

## React Bits sources

The JavaScript + CSS registry sources were retrieved on 2026-10-28:

- [Bell Toggle](https://www.reactbits.dev/micro/bell-toggle),
  [registry](https://reactbits.dev/r/BellToggle-JS-CSS.json).
- [Swipe Toast](https://www.reactbits.dev/micro/swipe-toast),
  [registry](https://reactbits.dev/r/SwipeToast-JS-CSS.json).

Both are vendored in `shared/ui` under the existing
[React Bits license](third-party/react-bits-LICENSE.md). The adaptations use the
repository's Lucide icons, add keyboard focus styling and cleanup/fallbacks, and
allow a toast's entire card to open a conversation. Bell Toggle also accepts a
`ringKey` so a new message can ring the bell when the unread count is unchanged.
The integration sets `duration={0}` and `dismissible={false}` on Swipe Toast.

Registry SHA-256 fingerprints:

- Bell Toggle: `fcc242ff73b427f0538e530f5e312a94839bb923e2c3690a417771632c47844e`
- Swipe Toast: `236de0dc2a7f2f9e83c3601fb7181c2be52f20b9d7e530d38172ae6dc7072bff`
