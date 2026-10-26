# Chat with the ICUE team

The shared chatbot now has **Assistant** and **Talk to our team** tabs in all
six site languages. The second tab sends messages to people through the
**Support inbox** at `/newsroom/support`.

## Staff use

Use the **login-door icon** in the shared contact bar to open chat management.
It has an accessible staff-login name and tooltip, with no visible text label.
It replaces the calendar and opens the full-page portal at
`/newsroom/portal?mode=staff`. The portal separates customer access from assigned
staff access. After sign-in, administrators can manage chats at
`/newsroom/support`; assigned authors can use the newsroom. The shortcut and sign-in screen follow the
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

The browser stores a random 256-bit guest conversation capability, its expiry
and any uncertain outgoing message. This resumes the thread across pages and reloads in the same
browser/origin. It is separate from the assistant's encrypted history sync and
does not pair live conversations across devices or domains. When browser
storage is blocked, the current page still works and explains that the
connection cannot be saved.

Assistant messages are never automatically sent to staff. The team tab explains
that its messages are shared with the ICUE team. It offers the existing contact
page when the backend is unavailable. Guest support conversations and their files
expire after **24 hours of client inactivity**. Active visitor heartbeats and
visitor messages renew that deadline; staff reads and replies do not. Expired
conversations cannot be read or revived, even before the cleanup worker runs.
The browser also clears expired guest support history and pending drafts.

### Customer accounts and the Prompt Bar

The visitor composer adapts the Prompt Bar for human support: a growing text
area, a Photos & files menu, file chips, upload/error states, removal, retry and
a stop control. It accepts PDF, PNG and JPEG files, at most **10 MB each** and
**5 files per message**. File-only messages work. A guest notice links to the
customer portal and explains the 24-hour retention window.

The compact layout follows the Prompt Bar reference: a plus control, a recipient
label and square send/stop controls. The attachment popup matches the composer
width and renders outside scrolling forms so it is not clipped. Keyboard users
can open it with the arrow keys and close it with Escape without closing chat.
The composer, popup, messages, file cards and notices share scoped light/dark
tokens in `shared/chatbot/chatTheme.css`. They follow the host page's theme;
embedded hosts can set `data-icue-chat-theme` or override the tokens. The customer
workspace uses its own light surface palette.

Customers can sign up and sign in at `/newsroom/portal`. Signup requires matching
passwords before any Auth request. Confirmation labels and mismatch feedback
are translated into all six languages. Email confirmation and password recovery
use the existing Supabase configuration and allowlisted
`/newsroom/login` callback; customer callbacks continue to the portal. Signing
in claims the current guest conversation under the verified account ID,
including its messages and files. Returning from the chat prompt reopens the
team tab on the original page. Customers can list and resume their own saved
conversations on another device. Saved account conversations are excluded from
guest expiry. Signing out clears the private browser view and pending drafts.

Public registrations receive the new **customer** profile role. Staff roles
require explicit administrative assignment. Customer identities are blocked
from newsroom editing and other authenticated business-table writes; their
private access is through checked support RPCs. Profile role writes remain
protected. Existing administrator and author roles are preserved.

### Private files and cleanup

Files use the private `support-chat` Storage bucket. The `support-chat-files`
Edge Function validates request size, extension, MIME and file signatures
before uploading. Database reservations bind the file hash, size, name and
conversation; retries reuse the same reservation. The bucket independently
limits MIME types and file size. Restrictive policies prevent existing broad
Storage policies from granting direct browser access.

Every download rechecks a valid guest capability or the signed-in owner/staff
identity. Downloads use an authenticated POST, return attachment disposition
and no-store/nosniff headers, and do not expose permanent public file URLs. The
conversation is limited to 50 MB and 20 reservations per 10 minutes.

A Supabase Cron job runs every five minutes. Its private dispatcher reads a
cleanup secret from Vault and invokes the Edge Function. Expired guest rows
and their messages/presence/file metadata are removed; physical file paths
remain in a private retry queue until the Storage API confirms deletion.
Failed/deleted accounts and discarded drafts also queue files. Unsent upload
reservations/files expire after one hour. A lost upload acknowledgement is
verified by its byte hash, and rejected draft files do not erase valid chat
history. No cleanup relies on a browser staying open.

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

`20261026150317_customer_account_role.sql` and
`20261026150318_support_files_accounts_retention.sql` were applied to the same
configured project on 2026-10-26. They add the customer role, account ownership,
private files and cleanup state. Existing guest conversations receive a fresh
24-hour expiry when the migration is applied. The `support-chat-files` Edge
Function is deployed, and `icue-support-guest-cleanup` is active every five
minutes. A fresh project also needs that Edge Function deployed and a privileged
call to `icue_support.install_cleanup('<project Edge Function URL>')` to provision
its Vault secret and schedule. This operation never places secrets in frontend
configuration or migration source.

The public widget reads the existing publishable/anonymous configuration from
`/newsroom/supabase-config.json`, or the host app's existing `VITE_SUPABASE_*`
public settings. The customer portal and staff inbox share the existing authenticated Supabase
client. The upload Edge Function uses Supabase-provided runtime credentials;
no service key is exposed to the browser and no new browser dependency is required.

The chat tables and cleanup state live in the unexposed `icue_support` schema, with RLS
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
- `support_files_accounts.sql` verifies customer/staff isolation, file ownership,
  storage boundaries, idempotency, account claiming and guest cleanup. All SQL
  suites pass on fresh and upgraded full schemas. Production authorization
  assertions also passed in a transaction that rolled back all test changes.
- The live Edge Function accepted a private test PDF, rejected spoofed bytes,
  reused retries, and denied public/wrong-capability access. Its actual cleanup
  dispatcher returned HTTP 200 and deleted the test conversation and stored file.
- Attachment browser checks use the compiled UI, real SQL and the actual Edge
  handler with an isolated authentication/storage boundary. They cover the file
  picker, customer signup/sign-in, staff downloads, account history, sign-out,
  cross-account isolation, mobile layout and guest cleanup.
- Private support tables intentionally have no direct RLS policies: raw access
  is denied, and checked RPCs are the only data path. Supabase's
  [informational no-policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
  is expected for these private tables; the new support objects have no security
  warnings from the post-migration advisor check.

The database is ready. Website publishing is a separate deployment step; these
frontend changes have not been published by this task.
