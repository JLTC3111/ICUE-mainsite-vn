# Chat with the ICUE team

The shared chatbot now has **Assistant** and **Talk to our team** tabs in all
six site languages. The second tab sends messages to people through the
**Support inbox** at `/newsroom/support`.

## Staff use

Use the **login-door icon** in the shared contact bar to open chat management.
It has an accessible staff-login name and tooltip, with no visible text label.
It replaces the calendar and prompts signed-out visitors with **Staff sign-in**;
after sign-in, authorized staff arrive directly at `/newsroom/support`. Existing
sessions open the inbox immediately. The shortcut and sign-in screen follow the
site's selected language; the English host links to the main ICUE staff portal.

Use an existing newsroom administrator account. The inbox is also available
from the author tools menu. Select a visitor, read the
conversation and reply. The inbox shows unread visitor messages, open/resolved
filters, conversation pagination and **Mark resolved** / **Reopen** actions.
A visitor's next message also reopens a resolved thread. Drafts are kept per
conversation; uncertain sends retain their message IDs so a retry is safe.

Opening or replying to a conversation automatically lets that visitor know
**“A team member is helping you”**, with a green dot. A lease renews while the
selected conversation is visible; it expires within 45 seconds after staff
leave, switch conversations, or disconnect. Resolution clears it immediately.
Each visitor sees attendance for their own conversation. Staff do not need to
choose **Go online** to help a visitor who has already sent a message.

The inbox also shows whether each client is in the chat, away, has explicitly
left, or is inactive/disconnected. The selected thread includes a status badge
and a notice when the client is absent; staff can still leave replies for their
return. Closing the widget or navigating away sends a best-effort departure
signal. A lost heartbeat is detected after about 45 seconds while the staff inbox is
connected. Switching to the assistant or hiding the page reports away. Silence
alone does not imply departure. Separate window IDs prevent one closed tab from
overriding another tab where the same client is still chatting.

General availability for new chats is an explicit choice. Choose **Go online**
to advertise availability. Heartbeats renew every 15 seconds while
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

`20261025123313_chat_attendance.sql` adds the per-conversation attendance lease
and was also applied to the configured project. Existing conversations and the
public API signatures are preserved. Staff IDs stay private; the visitor gets
only an expiry timestamp after authorization checks.

`20261025130803_client_chat_presence.sql` adds private visitor-window presence
and the capability-checked `support_chat_visitor_presence` RPC. It was applied
to the same project. Heartbeats are opt-in to the team tab, renewed at most every
15 seconds, ordered by a per-window sequence and limited to 20 tracked windows
per conversation. Older connection rows are pruned on subsequent updates.

The public widget reads the existing publishable/anonymous configuration from
`/newsroom/supabase-config.json`, or the host app's existing `VITE_SUPABASE_*`
public settings. The staff inbox uses the existing authenticated Supabase
client. No new service credential or browser dependency is required.

The four chat tables live in the unexposed `icue_support` schema, with RLS
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
- `news-app/supabase/tests/chat_attendance.sql`: staff attendance without general
  availability, visitor isolation, expiry, reply renewal, resolution, reopened
  conversations and immediate removal of revoked staff from the status lookup.
- `news-app/supabase/tests/client_chat_presence.sql`: visitor ownership, private
  connection access, stale/reordered requests, multiple tabs, explicit closes,
  heartbeat expiry, staff visibility and the bounded connection count.
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
  six languages. Client-presence checks also cover native page exits, multiple
  tabs, connection loss, immediate reconnection and preserved staff drafts.
  All ten site apps build; locale, route and publish checks pass.
- Supabase's post-migration security advisor reported no warning/error for
  these objects. Its four informational “RLS enabled, no policy” findings are
  intentional: direct table access is denied and checked RPCs are the only path.

The database is ready. Website publishing is a separate deployment step; these
frontend changes have not been published by this task.
