# Awards, Legal, FAQ and Recruitment recovery audit

Date: 2026-09-21. Changes are local to this repository; no deployment was performed.

Reporter clarification: the original failure occurred in Microsoft Edge at
`https://icue.vn/notable-awards` and displayed a blank page after restarting
macOS. This was the public deployment. Edge's browser connection was
unavailable in this session, so the Chrome/WebKit results below do not claim
direct verification of the user's Edge tab or identify its exact cause.

## Live deployment check

The public Awards URL was fetched on 2026-09-21 at approximately 12:54 UTC.
It returned HTTP 200 from Netlify and referenced `/assets/index-BKVWf696.js`.
The entry module, Awards module (`NotableAwardsPage-D4KgMqQN.js`), and Awards
stylesheet returned HTTP 200 with the expected content types.

The public HTML did not contain `data-icue-boot-recovery`; its entry module
did not contain the new required-download recovery signals. The Legal,
FAQ, and Recruitment HTML also lacked the early recovery controller. The
live Awards root contains only a `noscript` fallback before React renders,
so a startup-script failure with JavaScript enabled can leave it blank.

The verified local build uses `/assets/index-DunVQgPv.js` and includes the
new controller in the generated route shells. The fixes still require
production deployment. Current successful HTTP responses do not establish
which request or runtime error failed in the original Edge session.

## Findings and repairs

| Reproduced failure | Repair |
| --- | --- |
| Failing the initial JavaScript download left all four apps blank. React recovery never started, so reconnecting did nothing. | A dependency-free recovery controller runs from the HTML before the application modules. It waits for visibility/connectivity, bounds a stalled startup to 20 seconds, and permits at most two automatic document retries. The restored path, language, query and fragment are preserved. |
| A failed Awards module remained cached by the browser. Creating another React lazy component did not recover it. WebKit retained the failure even across document reloads. | Awards opts into recovery of its required page download. A retry uses an import map with fresh URLs for non-entry modules, keeping shared dependencies consistent and avoiding a second copy of the application entry. Successful recovery removes the internal URL marker. |
| A failed initial language module could strand a restored tab in its fallback language. | The selected language's initial download participates in startup recovery. All four pages retain the selected language in their URL. |
| Failed styles could leave a page unstyled. | Styles retry in place, with a delay and a two-attempt limit, without replacing ready page state. |
| Stalled visibility observers kept Awards cards and Legal sections transparent. | Reveals have a two-second fallback and respond to resume even when offline. Missing observers also leave readable content. |
| FAQ and Recruitment crashed before rendering when session storage was denied. | Storage access is optional and guarded. Language restoration no longer depends on storage. |
| Rotating a phone into the wider FAQ layout discarded the open answer. | Answer state is retained above the panel that moves between layouts. |

Ordinary resume does not reload a ready page. Tests retain open FAQ answers and Recruitment search text across reconnect and rotation. Automatic document recovery is limited to startup resources and the explicitly opted-in Awards page. Existing form and mutation recovery behavior is unchanged.

## Verification

- Full `npm run build`: all ten applications, legal/FAQ/recruitment content checks, 2,052 locale transitions, route-shell checks, and publication-boundary checks pass. Existing bundle-size warnings remain.
- Regression tests: 43 shared recovery, 67 Newsroom, 8 home-media, and 15 chatbot tests pass (133 total).
- Final browser matrix: 95/95 checks pass in Chrome and 95/95 in WebKit (190 total).
- The generated HTML includes the early controller for Awards, FAQ, Recruitment, and all four Legal document routes.
- The browser matrix uses Chrome and WebKit at desktop 1440 × 1000, tablet 834 × 1112, and phone 390 × 844, with rotation checks for tablet and phone.
- Scenarios cover initial module failure, offline startup/reconnection, stylesheet failure, unavailable browser storage, stalled visibility observers, failed Awards/language downloads, ordinary resume, refresh, and opening restored deep links after restarting the owned test-browser process.
- Persistent entry and Awards-module failures verify that automatic reloads stop after two attempts and that the visible reload button remains usable after service recovers.
- Legal navigation checks include Privacy, Terms, GDPR, and Cookies. Failure injection targets the shared Legal app through the Privacy route.

The final browser results and screenshots are written by `scripts/check-page-recovery.mjs` to `/private/tmp/icue-page-recovery-qa/` by default. `ICUE_RECOVERY_OUTPUT` changes the artifact directory.

## Reproduction

Build the site with `npm run build`, then serve the built apps using the root Vite server:

```sh
./node_modules/.bin/vite --host 127.0.0.1 --port 3112 --strictPort
```

Run `node scripts/check-page-recovery.mjs` with a Playwright installation available. Set `ICUE_PLAYWRIGHT_MODULE` to an existing Playwright module if it is not installed in this repository. Optional settings:

- `ICUE_RECOVERY_ENGINE=webkit` selects the installed WebKit browser; default is Chromium.
- `ICUE_BROWSER_EXECUTABLE` selects an installed Chromium/Chrome executable.
- `ICUE_RECOVERY_URL` changes the preview origin.
- `ICUE_RECOVERY_SCENARIOS` accepts a comma-separated subset for focused checks.

## Limits

These are real browser-engine tests with emulated viewport/touch settings and controlled network failures. They do not claim a physical macOS reboot, iPad/iPhone/Android testing, or an OS killing and restoring an actual user's tab. Resume events are injected; the final restart checks close and relaunch the isolated browser process and reopen the deep links.

Recovery code can run only after the HTML reaches the browser. It cannot execute inside a browser-owned network error page. The reported public-website failure is unrelated to whether a local preview server was restarted.
