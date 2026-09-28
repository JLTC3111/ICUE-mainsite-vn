# Local chatbot knowledge

The bird retrieves published or authored text. It does not call an AI API,
generate prose, download a model, or send questions to a search service.
After the static knowledge files have loaded, retrieval also works offline.
This does not make the entire website available offline.

## Content and sources

Each of the six `public/chatbot/kb.<language>.json` files contains 52 topics:

- 26 authored service, process, contact and recruitment answers.
- 9 project records from `home-app/src/locales/*` and `pastProjectsContent.js`.
- 10 public profiles from `people-app/src/data/people.json`.
- 3 role descriptions from `recruitment-app/src/data/jobs.js`.
- 4 institute/about records from the home locales.

The seven eligible FAQ answers remain available from `shared/faq-content`.
The nine existing FAQ claims awaiting review remain excluded from retrieval.

Site-derived records carry a source path, a visible source link and a SHA-256
fingerprint of their answer and structured facts. The fingerprint detects
content drift; it is not an editorial approval or a review date. These records
quote the site's current descriptions, including their existing qualifications.
Only public information should be added to files delivered to the browser.

## Updating the knowledge

1. Edit the original project, profile, job or about content in all six locales.
   Site records marked `source.kind: "site"` are regenerated; do not edit their
   answers in the output JSON. Removing a source record removes its generated
   answer at the next build.
2. Edit the original 26 answers directly in `public/chatbot/kb.*.json`.
   Maintain matching IDs/order across languages and keep source links useful.
3. Add real question variants in `shared/chatbot/content/questionVariants.js`.
   Add new project aliases or question templates in `siteTopics.js`.
4. Add representative questions and expected topics to `content/questions.json`.
   Include ambiguous and unrelated questions alongside successful matches.
5. Run `npm run prepare:chatbot`, `npm run verify:chatbot` and
   `npm run test:chatbot`, then rebuild the affected apps.

Every app's `prebuild` and `predev` prepares the files automatically before
asset copying. During an already-running dev session, rerun `prepare:chatbot`
after changing source content. `verify:chatbot` fails if outputs are stale.
The generator does not create translations or mark content as reviewed;
content owners should review claims and translations in their source files.

## Matching and follow-ups

The scorer uses the existing keywords/phrases plus authored aliases. It handles
one Latin typing error in words of at least five letters, including adjacent
transpositions. Numbers, short words and CJK characters are never fuzzy-matched.
Stop words are language-specific, so Vietnamese “vui lòng” does not erase the
meaning of English “how long”.

Known project/person names are removed only from language detection, not from
search. Named records require a known entity or an exact authored candidate;
general phrasing such as “tell me about…” cannot select an arbitrary profile.
An exact named entity wins near ties with broad service terms. Existing
confidence thresholds and clarification for competing matches remain in place.

`Chatbot` holds only `{ intentId, language }` as temporary conversation context.
Short, explicitly authored follow-ups can request documents, duration, cost,
next steps, location, scale or role requirements. Services reuse the approved
general guidance; jobs use application guidance; project locations/scales and
job requirements come from structured source facts. Unavailable details receive
a clarification with a source/contact link, without an invented commitment.

A successful new topic replaces the context. Unrelated/fallback replies,
retrieval errors, locale changes and page reloads clear it. Closing and
reopening the same chat retains it. Context is not added to stored/synced
transcripts; response analytics contain topic IDs, not question text.

## Verification

`npm run test:chatbot` runs the maintained 67-question bank across all six
languages, chained follow-ups, source parity, typo boundaries, topic changes,
context lifecycle and the existing mascot/history regressions.

`scripts/check-chatbot-knowledge.mjs` exercises the actual chat UI with all six
locales, source links, multi-turn follow-ups, unavailable facts and offline
retrieval. It accepts `ICUE_PLAYWRIGHT_MODULE`, `ICUE_BROWSER_EXECUTABLE`,
`ICUE_KNOWLEDGE_ENGINE`, `ICUE_KNOWLEDGE_URL` and `ICUE_KNOWLEDGE_OUTPUT`, following
the existing external Playwright QA setup. No browser test dependency is shipped.

Verified locally on 2026-09-28: 52 automated tests passed, including the
67-question bank; all ten app builds, content/publish checks and targeted ESLint
passed. Chromium desktop and WebKit phone checks passed for all six languages,
including the translated app interfaces, source links, chained follow-ups,
offline retrieval and panel layout. Browser evidence is stored in
`/private/tmp/icue-knowledge-qa/`. No production deployment was performed.
