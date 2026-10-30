# Codebase audit fixes — 2026-10-30

The nine findings from the codebase audit are addressed in source and covered by regression tests.

| Finding | Change | Regression coverage |
| --- | --- | --- |
| Customer accounts could invoke paid AI | Gemini and FLUX require a verified token and a current database-owned `author`/`admin` role before provider calls. Role lookup failures fail closed. | Customers, missing/unknown roles, spoofed metadata, revoked roles, stalled role lookups, authorized staff. |
| Password retained after logout | Credentials and visibility state clear after successful authentication, signup confirmation, logout, and identity changes. | Sign-in/sign-out, external identity changes, signup confirmation. |
| Previous account's chat previews visible | Identity-bound portal state resets before the new account's view commits. Pending auth handoffs remain mounted. | Account switch with failed or delayed conversation loading, handoff failure and native return navigation. |
| Public customer profile enumeration | A restrictive SELECT policy limits customer records to their owner and administrators; public staff bylines remain readable. | Anonymous/customer/author/admin/service access, including an additional broad legacy read policy. |
| Unsent chat draft lost on sign-in | Account drafts retain their creation capability until an owned server conversation is confirmed. Meaningful guest work takes priority over an older saved account selection; ordinary signed-in typing also persists before the first send. | New/returning accounts, empty guest records, same-account refresh, draft reload and uncertain first-send recovery/claim without message duplication. |
| People carousel locked by deep link | A requested profile is applied once per route request rather than after each carousel interaction. | Next, thumbnail selection, locale changes, updated requested profile. |
| Shareable locale removed | People, Structure and Our Work retain `lang`, other query parameters, hash and router state while removing the obsolete `site` hint. | Startup cleanup in all three apps. |
| Hidden People links still focusable | Inactive slides are inert and their links leave the tab order. | Active/inactive profile keyboard state. |
| Structure modal focus left behind | Dialog focus is initialized and contained, background portals are inert, and prior focus/scroll state is restored. | Tab/Shift+Tab, Escape, callback updates, late portals, cleanup. |

The normal navigation tests now exercise this repository's shared component in all three platform states and the localized footer links. They no longer discover arbitrary neighboring checkouts as implicit fixtures. HR and Contract source in those separate repositories was not changed.

Development dependencies are pinned to patched Vite versions: root/Home `6.4.5`, Newsroom/People/Structure `8.1.6`, and the remaining apps `8.2.4`. Newsroom overrides its development-only Zod dependency to `4.6.6`. Final scans of all eleven lockfiles report zero vulnerabilities. On this machine a temporary npm cache was used to avoid existing root-owned cache entries; no system ownership or global npm settings were changed.

For production rollout, apply [20261029184204_protect_customer_profile_privacy.sql](../news-app/supabase/migrations/20261029184204_protect_customer_profile_privacy.sql) to the shared Supabase project and deploy the updated site/functions. The migration only changes the profile read policy, preserves existing permissive policies, and adds a restrictive guard so a broad legacy policy cannot reopen customer reads. The regenerated bootstrap includes it for fresh installations. No production database or hosting changes were made during implementation.

Validation: all 426 unit/security/React/chatbot/recovery tests pass, Newsroom lint passes, and all ten Vite application bundles build. Fresh and upgrade PostgreSQL suites pass, including the new privacy guard and support-alert migration reapplication. All eleven dependency scans report zero vulnerabilities. Builds used temporary output directories so generated asset synchronization did not overwrite the current photo edits. The People theme and HR-button customization are preserved.

The optional real-browser smoke run did not launch: its Chrome execution approval/tool call did not complete and was interrupted. No browser assertion results or screenshots are claimed. The actual-source React/DOM regression checks above did complete successfully.
