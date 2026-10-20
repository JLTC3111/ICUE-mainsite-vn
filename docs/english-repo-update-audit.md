# English repository review — 2026-10-20

Reviewed `/Users/skycastle3/Desktop/ICUE-mainsite-en` read-only after the VN
updates. Its worktree was clean. No English files were changed.

The English site has a React Home app and legacy HTML pages; it does not have
the VN Structure, People, Newsroom, Legal, FAQ, recruitment/community or Our Work
React apps. There is no matching Magic Bento, Lanyard or React awards component
to patch directly. Copying VN app directories would be a migration, not an
update to an existing English component.

| Area | Existing English implementation | Update needed |
| --- | --- | --- |
| AnimatedContent | `home-app/src/components/reactbits/AnimatedContent.jsx` uses the older web-animation reveal and old props | Port the refreshed reveal options if feature parity with VN Home is desired. Preserve English snap scrolling and the present card layout. |
| Music contrast | `shared/contact-sidebar/useMusicBarColor.js` watches only the video root attributes, samples canvas pixels, and polls every 2.5 seconds | Port CSS-based sampling plus root theme/class observers, background-transition completion and visibility handling. It lacks the new VN page-theme hook, so this needs adapting to actual English theme controls. |
| Recovery notice | `shared/resilience/recovery.css` still inherits colors and uses transparent buttons | Port the self-contained light/dark contrast styles and inline startup stylesheet delivery together with the matching boot-controller changes. |
| Sidebar icons | Colored Zalo/Messenger and separate enlarged calendar sizing still present | Port monochrome SVGs and normalized icon sizing if the English sidebar should match VN. Preserve English labels/links. |
| Hamburger | Shared drawer toggle still uses a fixed white background | Apply theme tokens when adding/adapting English theme controls. The new VN-only root attribute is not currently published in English. |
| Awards | `legacy/pages/notableAwards.html` and `legacy-embed/pages/notableAwards.html` | Square-card/theme styling must be adapted to legacy HTML; the VN React StarBorder cannot be copied into an HTML page without integration work. |
| Lanyard / Magic Bento | No corresponding component files/imports found | No equivalent existing component to optimize or upgrade. |

Do not copy translated content, deploy configuration, route hosts, or generated
assets as part of these shared-component updates. `GridScan` is an English-only
React Bits component and needs its own source/visual review if it is upgraded.
