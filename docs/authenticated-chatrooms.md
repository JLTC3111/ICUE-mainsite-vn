# Authenticated ICUE chatrooms

The new workspace is `/newsroom/chatrooms`, linked from the customer portal,
support inbox, site Contact navigation, home contact CTA, collaboration footers,
FAQ help CTA, newsroom callout and chatbot contact replies. These customer
links preserve the selected language, hand English-host visitors to the
Vietnamese newsroom host, and keep local previews on their local host. Signed-out
visitors reach the chatroom's sign-in gate. Direct email/phone links, legal
contacts and recruitment application actions retain their specific destinations.
Existing guest support and saved one-to-one support remain
available. This change is prepared in the repository; it has not been deployed
to the live website or production database.

## Accounts and access

Every room request checks the signed-in account against `auth.users` and the
current database-owned `profiles.role`. Email must be confirmed; anonymous,
deleted and banned accounts are denied. Editable user metadata never grants a
role. Public signup continues to create a `customer`.

- The member commons admits explicitly assigned `member`, `author`, `manager`,
  `admin` and `owner` accounts. Customers cannot list or open it.
- Customers see only private rooms to which they have been added.
- Managers, admins and owners can create private rooms with multiple customers,
  add/remove participants, and archive/reopen their own assigned rooms. A
  privileged role alone does not expose another manager's private room.
- Removal revokes access to messages and downloads on subsequent requests.
  Archiving preserves readable history and stops new messages/uploads.
- New chat roles do not gain newsroom publishing, business-table or general
  Storage permissions. Existing author/admin access remains intact.

Raw room tables are in the unexposed `icue_rooms` schema with RLS and revoked
browser access. Public RPC wrappers use invoker rights; checked private
implementations provide the only data path. Private files cannot be fetched
directly through public Storage or a guessed URL.

## Messages and interface

The responsive workspace includes six-language copy, room switching, earlier
messages, per-room in-memory drafts, failure/retry states and private file
downloads. It refreshes every 2.5 seconds while visible, pauses when hidden,
and refreshes after reconnect/page restoration. History uses 50-message pages.

The Tiptap composer exposes bold, italic, underline and strikethrough. Enter
sends; Shift+Enter starts a new paragraph. Rich content is a bounded JSON
document, validated again in PostgreSQL and rendered with React elements.
Links, images, scripts, arbitrary HTML, arbitrary SVG and unsupported marks
cannot enter the message document. Messages allow 4,000 text characters, five
files, and 30 sends per account per minute. Stable message IDs make uncertain
send retries idempotent and reject a changed payload under the same ID.

Wave, heart and celebration stickers use application-owned animated SVGs.
They respect reduced-motion preferences. Uploaded SVGs are intentionally
unsupported. Animated PNG/WebP uploads are rejected; use a sticker or MP4.

## Media verification and deletion

The website uses the native Netlify `room-chat-files` function. It accepts PNG,
JPG/JPEG, WebP and MP4, **4 MiB per file**, with MP4 limited to **30 seconds**,
H.264 video and optional AAC audio. The smaller file cap accommodates Netlify's
buffered binary request limits. Video is rewritten to at most 1280 × 720.

Each upload follows this sequence:

1. Bound the request body and verify the current account and room membership.
   A database budget limits attempts before expensive decoding, including
   corrupt/rejected attempts: 20 per account per 10 minutes.
2. Match the extension, declared MIME and actual file signature. Native FFmpeg
   and FFprobe fully decode/rewrite media, remove metadata and reject unsupported,
   corrupt, truncated or overly complex input. Native processing has concurrency,
   duration, pixel, memory-allocation, protocol and execution-time bounds.
3. Reserve the regenerated file's size/hash in PostgreSQL, upload only those
   bytes to the private `room-chat` bucket, then finalize through a service-only
   RPC. Raw uploads are temporary and removed even on processing failure.
4. Every download checks current membership and verifies the stored byte size
   and SHA-256. A corrupt stored object is revoked, queued and removed.

Incomplete or invalid input never becomes a downloadable object. Interrupted
reservations and unsent files expire after one hour. Deleted-account files and
discarded files enter a durable physical-deletion queue. The existing
five-minute Vault-authenticated cleanup dispatcher now calls both support and
room workers. Deletion is acknowledged only after Storage confirms success;
failures retry. A room holds at most 200 MiB of reserved/stored files.

The Supabase Edge `room-chat-files` adapter uses pinned ImageMagick WASM to fully
decode, strip and reencode still images (4 MiB / 8 megapixels). It supplies the
scheduled cleanup endpoint and can provide an image-only fallback. MP4 fails
closed there because Edge has no full native transcoder. The website uses the
native function for all supported formats. Media verification is not a claim
of universal malware detection; keep native decoder dependencies maintained.

## IP and VPN signals

The native `room-chat-network` function obtains IP exclusively from Netlify's
server `context.ip`; it ignores browser-provided IPs and forwarding headers.
Auth verifies the token, and a checked room bootstrap verifies the current
account before recording. Without a trusted IP, the log records unavailable.

Only authorized room managers can inspect recent participant observations.
Logs retain seven days; cleanup removes older rows. The workspace discloses IP
logging and the external lookup. VPN/proxy results are advisory, with no
automatic access denial.

Lookup uses **keyless proxycheck.io v3**, which offers 100 free checks per server
IP per day. No API key, credits, subscription or paid fallback is accepted by
this integration. A six-hour per-instance cache reduces requests. Exhaustion,
missing flags or provider failure returns `unknown`; a negative provider result
means `not_detected`, not proof of absence. Set
`ROOM_CHAT_DISABLE_FREE_VPN_LOOKUP=true` to retain IP logging without any external
lookup. A website cannot reliably detect a visitor's firewall; firewall status
always remains unknown.

Provider documentation: <https://proxycheck.io/api/>. Trusted IP context:
<https://docs.netlify.com/build/functions/api/>.

## Release and verification

1. Apply `news-app/supabase/migrations/20261109071612_authenticated_chatrooms.sql`
   to the existing configured project through the normal migration workflow.
   Fresh installations use the generated `schema.sql` instead. The migration
   must be run as a whole: new enum values commit before use.
2. Deploy the Supabase Edge `room-chat-files` function with its pinned Deno lock
   and gateway JWT verification disabled for Vault-authenticated Cron calls.
   The handler itself verifies account access through checked RPCs and verifies
   cleanup through the existing Vault key; gateway JWT checks cannot authorize
   that scheduled call.
   Preserve the existing support cleanup configuration/Vault secret. Its
   endpoint must use the project's standard `*.supabase.co` URL. On a fresh
   installation, provision the existing `icue_support.install_cleanup` first.
3. Build/deploy the site and Netlify functions together. Runtime-only
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are required
   by the native functions. Never expose the service key via `VITE_*`. The
   deployment configuration bundles the pinned platform FFmpeg/FFprobe binaries.
   Use a Linux x64 Netlify build; native modules must be installed on that target.
4. Assign chat roles through existing privileged administration. Signup cannot
   self-select staff/member roles. Verify one member, two isolated customers and
   a manager before inviting production participants.

Checks: `npm test`, `npm run test:database`, and `npm run build:newsroom`.
The SQL runner tests both fresh and upgraded schemas in disposable PostgreSQL.
The security suites cover auth, room/file isolation, malformed rich content,
retries, role revocation, quotas, byte integrity, cleanup and network trust.
Native-media tests exercise real decoder binaries; `FFMPEG_BIN` can select an
existing maintained binary for local testing. The Deno image decoder suite is:

```sh
deno test --allow-read --node-modules-dir=none \
  --config news-app/supabase/functions/room-chat-files/deno.json \
  news-app/supabase/functions/room-chat-files/imageSanitizer.test.ts
```

No production users, customer messages or production Storage objects were
created by this implementation's isolated tests.
