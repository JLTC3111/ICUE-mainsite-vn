# Chat with the ICUE team

The shared chatbot now has **Assistant** and **Talk to our team** tabs in all
six site languages. The second tab sends messages to people through the
**Support inbox** at `/newsroom/support`.

## Staff use

Sign in with an existing newsroom administrator account, open **Support inbox**
from the author tools menu, and choose **Go online**. Select a visitor, read the
conversation and reply. The inbox shows unread visitor messages, open/resolved
filters, conversation pagination and **Mark resolved** / **Reopen** actions.
A visitor's next message also reopens a resolved thread. Drafts are kept per
conversation; uncertain sends retain their message IDs so a retry is safe.

Availability is an explicit choice. Heartbeats renew every 15 seconds while
the inbox is mounted, including in a background window. Choose **Go away** or
leave the inbox to stop availability. If the browser or connection disappears,
the database expires availability after 45 seconds. Demoted administrators
are immediately excluded from the availability lookup.

## Visitor use

Visitors can send a first message without an account. Name and email are
optional. They see actual online/away status, typing indicators, timestamps,
sent/seen receipts, older messages and the conversation's resolution state.
Replies refresh every 2.5 seconds while the team tab is visible. Hidden pages
and closed panels stop polling; reopening or reconnecting refreshes the thread.

The browser stores a random 256-bit conversation capability and any uncertain
outgoing message. This resumes the thread across pages and reloads in the same
browser/origin. It is separate from the assistant's encrypted history sync and
does not pair live conversations across devices or domains. When browser
storage is blocked, the current page still works and explains that the
connection cannot be saved.

Assistant messages are never automatically sent to staff. The team tab explains
that its messages are shared with the ICUE team. It offers the existing contact
page when the backend is unavailable. Conversation content is retained in the
database until an owner removes it; this feature does not add a retention job.

## Database and configuration

`20261025070642_human_live_chat.sql` was applied to the site's configured
Supabase project `idkfmgdfzcsydrqnjcla` on 2026-10-25. Its local filename matches
the applied migration history. The generated `news-app/supabase/schema.sql`
includes it for fresh installations. Existing installations should apply only
the missing migration through their normal migration workflow.

The public widget reads the existing publishable/anonymous configuration from
`/newsroom/supabase-config.json`, or the host app's existing `VITE_SUPABASE_*`
public settings. The staff inbox uses the existing authenticated Supabase
client. No new service credential or browser dependency is required.

The three chat tables live in the unexposed `icue_support` schema, with RLS
enabled and direct table/sequence access revoked from anonymous and signed-in
clients. Public RPC wrappers use invoker rights. Private implementations check
the hashed visitor capability or the current user's database-controlled admin
role before every operation. An ordinary newsroom author cannot read or reply
to conversations, advertise availability, or change resolution status.

Capabilities stay in POST bodies and browser storage, never URLs or analytics.
Only the page pathname is saved. Each message is limited to 4,000 characters;
writes are serialized per conversation, limited to 30 per sender per minute,
and deduplicated by the client message ID. Responses contain no capability hash.
The UI renders message content as text. Anonymous RPCs are intentionally public;
these per-conversation limits are not a site-wide bot/CAPTCHA control.

## Verification and deployment

- `npm test`: full security, React, recovery, chatbot, home-media and newsroom
  tests, plus newsroom lint. Chatbot checks cover isolation from the assistant,
  safe retries after lost acknowledgements, stale reads, blocked storage,
  polling pause/resume and expiry of online/typing state.
- `news-app/supabase/tests/human_live_chat.sql`: actual SQL assertions for visitor
  ownership, admin/author separation, retries, receipts, pagination, typing,
  expiry, resolution/reopening and message limits. The existing
  `npm run test:database` runner includes it for fresh and upgraded databases.
- Local SQL verification also passed against fresh and upgraded full newsroom
  schemas in disposable PGlite databases. Only PGlite's unavailable pgcrypto
  extension declaration was omitted; the support code uses built-in SHA-256.
- A visitor/admin/visitor exchange passed against the live PostgreSQL database
  in a transaction; all verification messages and availability changes were
  rolled back.
- Browser verification passed with the real UI and a disposable SQL database,
  using a local authentication boundary: visitor/staff replies, availability,
  typing, seen receipts, offline retries, resolution/reopening, reload recovery,
  separate assistant drafts, keyboard tabs, mobile/compact viewports and all
  six languages. All ten site apps build; locale, route and publish checks pass.
- Supabase's post-migration security advisor reported no warning/error for
  these objects. Its three informational “RLS enabled, no policy” findings are
  intentional: direct table access is denied and checked RPCs are the only path.

The database is ready. Website publishing is a separate deployment step; these
frontend changes have not been published by this task.
