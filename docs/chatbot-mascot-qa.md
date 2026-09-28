# Terminal bird: implementation and verification

Completed locally on 2026-09-24–25. No commit, push, deployment, or production
database change has been made.

## 2026-09-28 background music synchronization

The launcher now follows actual background audio playback through the same
`useBackgroundMusic` hook as the utility rail. Playing or resuming immediately
selects walking with headphones and music notes, including while chat is open.
Pointer/keyboard input and long playback cannot interrupt listening. Playback
cancels the idle deadlines; pause, end, buffering or an audio error returns the
bird to its current chat reaction or idle. Every stopped interval starts a
fresh countdown to coffee at 60 seconds and sleep at 120 seconds. Idle stages
belong to their own cycle, so restarting music cannot leave a stale coffee or
sleep pose to reappear on the next pause. Visibility still pauses animation.

This replaces the earlier automatic 30-second listening stage described below:
silence no longer starts the walking/headphone animation. Chat replies retain
their textual status while playback controls the decorative bird. The home
development asset sync now includes the existing background track on demand.

Validation: 55 chatbot tests and 15 React tests passed, including repeated
play/pause, late mounting during playback, native media interruptions, hidden
pages, rejected playback and listener cleanup. Targeted ESLint, all ten app
builds, locale/route checks and publish/content checks passed. Real playback
checks passed in Chromium and WebKit at desktop and phone sizes and with
reduced motion, including replay after the media element reaches its end.
Screenshots and results are in `/private/tmp/icue-music-browser-qa/`.

## 2026-09-27 final state and body-pose update

Coffee now adds a gentle tail wiggle after the seated pose settles. A small
`MascotMotion` wrapper captures moving layers before state changes and eases
their offsets into the next CSS animation. This removes snapping when walking,
head nods, footsteps and other loops stop or change. Pose easing remains 650ms;
the mug and headphones fade in, and sleep shading eases with the body.
Handoffs cancel on hide, reduced motion, deactivation and unmount, and an
interrupted handoff starts from the currently visible frame. No animation
frame loop, dependency or additional artwork was added.

The tail and transition refinement passed Chromium and WebKit review at
1200px and 390px. Seven state changes were checked for transform continuity,
along with rapid interruptions, handoff cleanup, a moving coffee tail,
reduced-motion changes, page hiding and unmounting. Evidence is in
`/private/tmp/icue-mascot-transition-qa/`; the WebKit desktop cleanup assertion
was rerun after allowing the excited-to-happy transition to finish. The
rebuilt site's idle sequence also passed in both engines, with persistent
regression checks for the walking-to-coffee handoff and coffee tail movement.
All 36 chatbot tests, targeted ESLint, ten app builds and publish/content
verification passed after this refinement.

The inactivity sequence has three stages: at 30 seconds the bird walks while
listening to music with headphones, a gentle head nod, alternating steps,
swaying wings and two drifting notes. At 60 seconds it puts the headphones
away, sits down with `^^` and holds a small plain muted blue-grey coffee mug
with subtle steam. The mug is 78% of its original size and uses subdued shading.
At 120 seconds it puts away the mug and lies down with its head turned toward the right,
keeping `> _` with one eye open. The rounded body rests behind the head, with
folded wings and small tucked toe tips. The mug, steam, headphones and notes
are SVG; the folded wings reuse masks of the original artwork. Headphones
follow the head's motion wrapper, with the band behind the crest and earcups
at the sides of the head. Music is decorative and does not play audio.

The three deadlines reset on keyboard/pointer input or hover. Opening chat or
hiding the page cancels all three; returning to the page starts a fresh cycle.
Regression checks cover all stages, interruptions, the one-eye-open glyphs,
prop removal, open-chat suppression, visibility and timer cleanup (36 chatbot
tests passed). Earlier verification below predates this final pose refinement.

The earlier in-app browser review covered the preceding 30/60-second
coffee/sleep sequence. The final 30/60/120-second sequence is checked locally
with the updated regression suite and Chromium/WebKit review described below.
No new bitmap assets were created, and HR/Contract were not changed.

Final pose review: all 15 expressions and three composed reply states were
rendered on light and dark backgrounds in Chromium and WebKit. Animation
progress, alternating walking steps, fitted head-attached headphones,
the smaller mug, exact 30/60/120-second boundaries,
accessory cleanup, hover/keyboard wake, open-chat suppression and page resume
passed at 1440px, 390px and 320px (reduced motion). The right-facing sleep pose
is retained when motion is disabled. Screenshots and test results are in
`/private/tmp/icue-final-mascot-review/`. Timing checks pause the test clock to
keep real elapsed time from crossing a boundary during assertions. Walking
checks sample after movement starts, when the feet occupy opposite stride
phases. The temporary gallery was removed after review.

All 36 chatbot tests and targeted mascot ESLint passed. All ten app builds,
publish checks, route checks and 2,052 locale-preserving transitions passed.
The existing large-bundle build warning remains.

The rebuilt site's final music-at-30s, coffee-at-60s and sleep-at-120s sequence,
accessory removal, hover wake and chat opening passed in both Chromium and
WebKit. Results are in `/private/tmp/icue-final-mascot-regression/final-rest/`.
The broader integration pass covered all ten sections, six locales, phone
layouts, reduced motion and network/retrieval recovery; its boundary-timing
case was rerun with the paused clock against the final build.

The existing WebPs now form a reusable head/torso/appendage rig. Sleep lies down
with the cheek on a folded wing, feet tucked away, a horizontal body and a slow
belly breath. Reading sits and holds the book; thinking brings a wing to the
chin; idea, happy, affectionate completion, handoff and error have distinct
body language. The face follows the head; floating effects remain upright.
Pose wrappers transition separately from animation, so reduced motion retains
the correct still pose. Hover wakes the whole bird and restarts inactivity.

Validation: 35 chatbot tests passed, including sleep/wake timing and reading
pose priority during pending retrieval and completed document replies. Browser
inspection covered the nine poses, lying down and returning to idle, and the
real 390px Main launcher sleeping and holding a book after a document reply.
The temporary pose preview was removed after review. No new bitmap assets,
animation intervals, or changes to HR/Contract were introduced.

## 2026-09-26 micro-animation update

Main-site bird only; HR and Contract repositories/accessories are untouched.
`ChatMascot` now accepts independent `expression`/`effect` props while preserving
the existing `state` and size variants. `BirdEffects.jsx` supplies the book,
bulb, hearts, sparkles and drifting sleep symbols as SVG paths. No images or
dependencies were added. Handoff is available in the component API but remains
untriggered until the app has an actual cross-app transfer action.

Validation for this update: 35 chatbot tests passed, including once-per-opening
sequencing, interrupted reactions, real retrieval notification, effect cleanup,
sleep/wake, composable static variants and unchanged conversation/history flows.
Targeted ESLint and the home production build passed (existing bundle-size
warnings remain). In-app browser review covered the actual document/book,
process/bulb and greeting/hearts responses, plus desktop and 390px mobile panel
clearance. Reduced-motion CSS disables all mascot animations and transitions;
the timed state progression still removes temporary effects. The broader
cross-engine results below belong to the earlier 2026-09-24–25 audit.

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
| `shared/chatbot/Chatbot.jsx`, `Chatbot.css` | Bird launcher, text-only header, terminal message badges, state mapping, keyboard/touch focus, safe-area/viewport handling, sync panel, duplicate-send and stale-response guards. |
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
| Closed launcher hover or keyboard focus | `^^` |
| Open chat | `><` + one small hop/flutter/sparkles → `^^` → `>_` |
| Successful authored reply | `^^` + two brief hearts |
| Knowledge lookup / sourced FAQ or document answer | `>...` / `^^` + open book |
| Authored planning/process/application guidance | `^^` + brief bulb |
| Response delay and retrieval promise, or an active sync operation in settings | `> ...` |
| Fallback / clarification / unsupported-language response | `> ?` |
| Retrieval exception or sync failure shown in settings | `! x` |
| Background music playing (takes priority over other reactions) | `^^` + walking with headphones, gentle head nod and drifting music notes |
| Closed launcher after 60 seconds without music or pointer/key interaction | `^^` + seated coffee break with a small plain blue-grey mug |
| Closed launcher after 120 seconds without music or pointer/key interaction | `> _` + lying down facing right with three drifting `z` symbols |

The reusable API accepts `idle`, `greeting`, `excited`, `curious`, `thinking`, `speaking`,
`happy`, `reading`, `idea`, `handoff`, `confused`, `error`, `coffee`, `listening`, and `sleeping`.
Expressions and SVG effects can be composed independently. Handoff provides
`>→` for a future actual app-transfer action; no such action currently exists in
the Main chatbot. `speaking` supplies a pulsing `> _`
for future streaming use; the current retrieval assistant uses `thinking`.

Opening settles to happy after 650ms, then idle after 1.8 seconds. Happy and
confused reactions settle after 1.8 seconds. Idle adds
paired wing wiggles, an occasional foot tap, tail sway, breathing and blinking.
Speaking gently flaps the tail. Greetings briefly raise/flutter both wings.
Reading holds the book in a seated pose; sleeping folds the wings, tucks the
feet and rests the head on the ground while the belly breathes slowly.
Motion uses CSS transform/opacity; facial glyphs are pixel
paths rather than fonts. The navy visor/reflection and live cyan glyphs are
separate layers. Static 28px transcript badges use a pale background with navy
pixel `> _`, `^ ^`, `> <`, or `- -` expressions and have no motion or listeners.
Message bubbles use 8px corners. The transparent launcher is 104px on desktop,
64px on mobile, and plays one 8px hop below an open panel. Hover does not loop
the hop, wings, hearts, sparkles or bulb. Effects use the same vector layer and
respect reduced motion; the existing WebP assets are unchanged.

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
  no replacement asset is required for the compact launcher.
