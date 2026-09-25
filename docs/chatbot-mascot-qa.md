# Terminal bird: implementation and verification

Completed locally on 2026-09-24–25. No commit, push, deployment, or production
database change has been made.

## Inspection and scope

The existing chatbot was shared by FAQ, recruitment and community. It is an
authored retrieval assistant with six knowledge bases and a shared FAQ corpus;
it does not stream a model response. Matching, authored replies, links, analytics
and existing knowledge-fetch deadlines/fallbacks are preserved. The legacy
runtime in `src/script.js` / `legacy/script.js` remains excluded from publication.

Following the expanded request, `SiteChatbot` now mounts once in each of the ten
app entries: home, newsroom, people, structure, our work, contact, legal, FAQ,
recruitment and community. It survives route changes within each app. Full-page
navigation restores the shared local transcript. The dialog stays in the page
tree; no portal or animation package was introduced. The original panel layout,
localized copy and suggestion controls remain. Open/closed state and unsent drafts
are not persisted across a full reload; the transcript is.

## Files changed

| Files | Purpose |
| --- | --- |
| All ten `*-app/src/main.jsx` files | One site-wide chatbot per app, using that app's i18n instance; remove a redundant home locale initializer caught by lint. |
| `home-app/vite.config.js`, `news-app/vite.config.js`, `people-app/vite.config.js`, `structure-app/vite.config.js`, `ourwork-app/vite.config.js`, `contact-app/vite.config.js`, `legal-app/vite.config.js` | Make `@icue/chatbot` available to other components; the remaining three apps already had the alias. |
| FAQ, recruitment and community `src/routes/Page.jsx` | Remove former route-level chatbot mounts and obsolete bindings; preserve existing page links. |
| `shared/chatbot/SiteChatbot.jsx`, `index.js`, `locales/{vi,en,de,fr,ko,ja}.json` | Shared integration, reusable exports and six-language labels, including optional sync controls. Existing app-specific chat labels take precedence. |
| `shared/chatbot/Chatbot.jsx`, `Chatbot.css` | Bird launcher/header/static avatars, state mapping, keyboard/touch focus, safe-area/viewport handling, sync panel, duplicate-send and stale-response guards. |
| `shared/chatbot/mascot/ChatMascot.jsx`, `ChatMascot.css`, `expressions.js` | Independent SVG terminal face, layered body, wing/tail/foot motion, sleeping and lifecycle handling. |
| `shared/chatbot/mascot/icue-bird.webp`, `icue-bird-core.webp`, `source/*.png`, `README.md` | Transparent production assets, editable generated sources, provenance and component API. Source PNGs are not bundled. |
| `shared/chatbot/lib/knowledgeAssets.js`, `knowledge.js` | Bundle the canonical authored KB files with valid URLs in every app; retrieval behavior unchanged. |
| `shared/chatbot/hooks/useChatHistory.js`, `lib/historyStore.js` | Shared local history, migration of old entries, stable IDs, bounded/validated messages and cross-tab merging. |
| `shared/chatbot/hooks/useHistorySync.js`, `lib/historySync.js`, `historyCrypto.js`, `historyApi.js` | Optional encrypted pairing, conflict-safe merging, reconnect/resume handling and request deadlines. |
| `shared/chatbot/HistorySettings.jsx`, `HistorySettings.css` | Localized pairing, masked/copyable code, disconnect and cloud-deletion controls. |
| `netlify/functions/chat-history.mjs`, `netlify.toml` | Ciphertext-only sync endpoint and runtime configuration notes. |
| `news-app/supabase/migrations/20260924121129_chatbot_device_sync.sql`, `news-app/supabase/tests/chatbot_device_sync.sql` | Private history storage, explicit grants/RLS and SQL assertions. |
| `shared/chatbot/Chatbot.test.mjs`, `history.test.mjs`, `tests/security/chatHistory.test.mjs`, `package.json` | Component, history, encryption, concurrency and endpoint regression checks. |
| `scripts/check-chatbot-mascot.mjs`, `check-chatbot-sync-api.mjs`, `serve-chatbot-sync-qa.mjs` | Repeatable browser checks, real API/database round trip and local-only test gateway. |
| `docs/chatbot-mascot-qa.md`, `docs/chatbot-history-sync.md` | Verification, architecture and production activation instructions. |

## Expressions and motion

| Actual trigger | Face |
| --- | --- |
| Closed/settled companion | `> _` |
| Launcher hover or keyboard focus | `> ?` |
| Open chat / successful reply | `^ ^` |
| Response delay and retrieval promise, or an active sync operation in settings | `> ...` |
| Fallback / clarification / unsupported-language response | `> ?` |
| Retrieval exception or sync failure shown in settings | `! x` |
| Closed launcher after 60 seconds without pointer/key interaction | `- -` |

The reusable API accepts `idle`, `greeting`, `curious`, `thinking`, `speaking`,
`happy`, `confused`, `error`, and `sleeping`. `speaking` supplies a pulsing `> _`
for future streaming use; the current retrieval assistant uses `thinking`.

Greeting, happy and confused reactions settle after 1.8 seconds. Idle adds
small wing tucks, an occasional foot tap, tail sway, breathing and blinking.
Greetings briefly move both wings and feet. Sleeping settles the appendages
and slows breathing. Motion uses CSS transform/opacity; facial glyphs are pixel
paths rather than fonts. The navy visor/reflection and live cyan glyphs are
separate layers. Static 28px transcript avatars have no motion or listeners.

## History

Local transcripts retain the original per-locale storage keys and follow the
visitor through all sections. Optional private device pairing adds encrypted
cloud history without changing the invite-only staff login. The server stores
ciphertext; concurrent writes merge with revision checks. Offline changes stay
local, closed panels still flush pending work, and reconnect/resume revalidates
before uploading. No visitor history is uploaded until they opt in.

See [history architecture and activation](chatbot-history-sync.md) for the
protocol, deletion behavior, storage limits and required deployment steps.

## Mobile, accessibility and performance

- The launcher is a real localized button with expanded/controls/haspopup
  attributes. Escape and close restore focus. The dialog and live transcript
  keep textual status; the decorative mascot is hidden from assistive technology.
- Touch opening focuses the close button and leaves the keyboard closed.
  Desktop opening focuses the input. IME composition does not submit early.
  Header/send and pairing controls have at least 44px targets and visible focus.
- Safe-area insets and visual viewport resize/scroll constrain the fixed panel.
  Short keyboard/landscape viewports hide the redundant launcher, reclaim its
  space and reserve room for navigation. Pairing settings scroll inside the panel.
- Visibility, pagehide/pageshow, freeze/resume and offline/online are handled
  without continuous React animation updates. Pending frames, timers, network
  requests and subscriptions are cleaned up. The open panel stays above the
  existing contact rail and below navigation drawers.
- Reduced motion removes mascot movement and transitions. Two 256px WebPs total
  **21,174 bytes**; full-size PNG sources stay out of published bundles. No GIF,
  sprite sheet, canvas or new production dependency was added. Sync polls only
  while a paired chat is open and the page is visible.
- No floating cookie banner is mounted in the inspected apps. The legal cookie
  preferences form remains intact. Physical hardware cutout behavior is still
  a device-verification item.

## Checks executed

| Check | Result |
| --- | --- |
| `npm run build` | Passed: all ten apps, prebuild/content checks, locale routing, route shells, publish boundary and chatbot verification. Existing large-chunk warnings remain. |
| `npm run test:chatbot` | 30 passed: 15 matching, 5 component/lifecycle, 10 history/crypto/sync. |
| `npm run test:security` | 20 passed, including 3 new endpoint tests. |
| `npm run test:recovery` | 43 passed. |
| `npm run audit:recovery` | 520 sources / 286 components parsed, no failures. |
| `node --check` on the endpoint and three QA scripts; `git diff --check` | Passed. |
| Targeted ESLint with `news-app/eslint.config.js` | No errors; six existing `useMemo` dependency warnings in the three route pages. |
| Real local HTTP → Netlify handler → PostgREST → Postgres → decryption | Passed, including duplicate/stale writes, anonymous denial and deletion. |
| Final migration applied to a fresh local Postgres database, then SQL assertions | Passed. |
| Supabase local security/performance advisors | No issues on the local test schema. |
| Chromium / WebKit browser suites | 31/31 Chromium and 31/31 WebKit cases passed; no page runtime errors. |

Browser coverage includes all ten apps at desktop and phone sizes, repeated
open/close, hover/keyboard access, real authored replies, fallback/error/retry,
320px reduced-motion layout, simulated 330px keyboard viewport, browser lifecycle
and reconnect events, portrait/landscape changes, history across app navigation,
inactivity/wake, six locales, and encrypted pairing between two isolated browser
contexts. The pairing flow also checks offline updates, reload restoration,
cloud deletion and retention of each device's local transcript.

Controls are hit-tested against overlapping page layers. Exception checks throw
at the browser's `Intl.Segmenter` boundary and then restore it; network checks
abort actual KB requests. No fabricated chatbot response is shipped or used in
these browser flows. Cross-device tests use the actual local API and database.

The initial browser sweep caught a recruitment binding removed during moving
its chat mount; that existing contact link was restored. A local QA credential
expired during a long interrupted session, was refreshed, and the real API and
paired-device flow then passed. Neither issue is left as an app limitation.

Separate newsroom carousel/article/hook edits appeared in the shared workspace
after the final browser runs. They were not made or altered by this task and are
not included in the file inventory above.

Evidence lives in `/private/tmp/icue-mascot-qa/`: per-engine JSON results and
screenshots for launcher, hover, greeting, thinking, response, fallback, error,
phone, keyboard simulation, landscape, reduced motion and masked pairing UI.
The workspace adapter executes the checked-in browser script using the existing
external Playwright installation:

```sh
node /private/tmp/icue-mascot-browser-check.mjs
node /private/tmp/icue-mascot-browser-check.mjs --webkit
```

To reproduce elsewhere, set `ICUE_PLAYWRIGHT_MODULE`, `ICUE_MASCOT_ENGINE`,
`ICUE_MASCOT_URL`, optionally `ICUE_BROWSER_EXECUTABLE` /
`PLAYWRIGHT_BROWSERS_PATH`, and run `scripts/check-chatbot-mascot.mjs`. Use
`ICUE_SYNC_QA=1` with the documented local database/gateway for pairing coverage.

## Remaining work outside this local implementation

- Apply the reviewed migration, configure the Netlify Functions runtime and
  deploy through the site's normal workflow before cross-device sync is live.
  Netlify's deployed edge-limit enforcement has not been exercised locally.
- Physical iOS Safari / Android Chromium, native keyboards, OS process eviction
  and hardware safe-area cutouts were not tested. WebKit/mobile viewport tests
  are engine/platform simulations, not a claim of physical-device testing.
- The transparent isolated artwork is usable now. A purpose-drawn layered/vector
  original could improve joint contours at larger sizes or stronger wing motion;
  no replacement asset is required for these compact launcher/header/avatar sizes.
