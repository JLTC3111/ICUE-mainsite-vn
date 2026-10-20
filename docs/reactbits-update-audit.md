# React Bits review — 2026-10-20

Compared the installed components with the JavaScript/CSS registries served by
[React Bits](https://reactbits.dev). Exact registry URLs and downloaded-response
SHA-256 values are recorded in `reactbits-source-snapshot.json` for repeatable
future comparisons. Components are adapted source, rather than an npm package;
updating package-lock files would not update them.

## Applied updates

| Component | Used by | Changes |
| --- | --- | --- |
| [Magic Bento](https://reactbits.dev/components/magic-bento) | Structure departments/documents; Newsroom assistant | Smooth pointer lighting, card-local spotlight, proximity edges independent of spotlight, wave across adjacent cards, bounded canvas stars replacing repeated DOM particles. Shared effect engine; pauses offscreen/hidden and follows live reduced motion. Retains custom card content/layout. Editor panels remain stationary. Demo analytics artwork and its extra icon packages are not part of the product. |
| [Spotlight Card](https://reactbits.dev/components/spotlight-card) | Our Work; Legal sections | Current falloff/edge lighting, pointer smoothing, nearby-card response, keyboard focus, optional beam/ambient/grain/flare controls. Keeps page surfaces, theme colors and square card geometry. Adds missing-observer fallback, live reduced motion and hidden/offscreen pauses. |
| [Animated Content](https://reactbits.dev/animations/animated-content) | Home cards | Current GSAP reveal engine: blur, rotation, tilt, wipes, stagger, mount/scroll triggers, repeat/scrub, stable callback refs and scoped cleanup. Home cards use a subtle blur/tilt entrance. Keeps snap scroller and reduced-motion behavior. |
| [Rotating Text](https://reactbits.dev/text-animations/rotating-text) | Vendored Newsroom component | Current effect presets, width fitting, optional hover pause and blur/highlight, safe empty/shorter text lists, grapheme splitting and reduced motion. No active import found; API stays available for existing consumers. |
| [Count Up](https://reactbits.dev/text-animations/count-up) | Our Work statistics | Duration-based animation, explicit decimals, correct locale grouping via formatToParts, callbacks at actual completion, and live reduced motion. Preserves the page's shared reveal pass (no extra visibility observer), one gradient text node and settled values on locale switches. |
| [Scroll Velocity](https://reactbits.dev/text-animations/scroll-velocity) | News archive partner strip | Drag-release momentum, optional velocity skew/scale and edge fade; bounded frame delta. Keeps link clicks, hover pause and static reduced-motion row. Adds keyboard pause and safe missing ResizeObserver behavior. |
| [Line Sidebar](https://reactbits.dev/components/line-sidebar) | Shared navigation drawers | Configurable smooth/linear/sharp falloff, radius and smoothing; viewport-based nested-link positions, reduced-motion settling, cancel work when drawer closes. Retains semantic anchors and route selection. |
| [Lanyard](https://reactbits.dev/components/lanyard) | Structure employee badge | Replaced the older Rapier/Fiber/GLB implementation with the current standalone Three.js source: procedural card faces and hardware, a 72-sample woven strap, custom physics, material finishes, automatic framing and idle settling. Preserves localized badge artwork, employee-profile clicks, drag threshold/cancellation, persistent renderer on image changes, phone exclusions and still-badge/reduced-motion fallback. Adds bounded image caching, immediate hidden/offscreen pauses, live reduced motion, missing-observer support and WebGL-failure/context-loss fallback. Uses the installed Three.js; no packages added. |
| [Card Nav](https://reactbits.dev/components/card-nav) | icue.vn shared app menu | Current spring/stagger renderer with native portal links, a custom three-dot vertical SVG toggle and inset rims. See [navigation review](reactbits-navigation-review.md). |

## Other components reviewed

| Component | Decision |
| --- | --- |
| Star Border | Awards already uses the current canvas-outline implementation supplied in this session, with local reduced-motion/visibility/fallback fixes and radius 0. |
| Scroll Expand | Current source's scroll/clip/zoom mechanism already present. Retained responsive images, wrapped long titles and collapsed reduced-motion track. |
| Border Glow | Current upstream mesh gradients/edge-angle mechanism already present. Retained the local throttled pointer path and cleanup rather than replacing it with unthrottled writes. |
| Accordion Gallery | Kept the expanded local implementation: parallax, keyboard/focus, image recovery, fullscreen/detail view, touch layout and responsive assets. Upstream's compact demo would remove these features. |
| Masked Heading | Kept localized image/SVG masking and visibility/reduced-motion guards. New upstream mesh-color/spotlight demos would change the site's established image-heading treatment. |
| Gradient Waves | Reviewed the new lit/swell shader and API changes. Kept the site's tuned shader, lower buffer scale, context-loss recovery, static CSS fallback and per-theme palette. This is a full-screen background, so the new demo settings are not a drop-in performance improvement. |
| Gooey Nav / Gooey Tabs | Updated to the current canvas renderer with native social links, controlled React Router selection, static graphics fallback and lifecycle guards. See [navigation review](reactbits-navigation-review.md). |
| Split Flap Text | Kept the phrase-level localized headline implementation; it accommodates variable-width CJK/Vietnamese strings, unlike the new fixed-cell departure-board presentation. |
| Circular Text | Kept shared footer-ring geometry, metallic tint styling and wrapper compatibility. New ring/center/drag markup would conflict with the existing footer logo composition. |
| Tilted Card / Pixel Transition | Kept the People photo integration, responsive intrinsic photo sizes and externally triggered identity handoff. New flip/hover-demo APIs are incompatible with that usage. No People theme system was added. |
| Profile Card | Kept the custom profile-modal entrance/contact layout and existing holographic material. New upstream frame markup would require a separate visual redesign. |
| Metallic Paint | Kept validated menu masks, static SVG fallback, bounded resolution, ready/error callbacks and the current Paper-derived shader interface. The new renderer's text-source/API changes are not a drop-in replacement for the menu. |
| Galaxy | Kept the optional, lazily loaded People background and its existing settings. No new background or theme behavior was imposed on People. |

## Validation and limits

Regression tests cover Bento interaction/lifecycle, reveal options, CountUp
locale changes, all new page theme controls, music contrast changes, Card Nav
interaction/settling/reflow, and Lanyard geometry, numerical physics, real
raycasting, image replacement, pause/resume, fallback and resource disposal.
The latest React regression run passed 88 tests. Graphics test doubles replace
GPU/drawing boundaries; the Three.js geometry, physics and raycasting are real.
Source-only app builds avoid regenerating media.
Live browser/GPU visual inspection was unavailable in this session.

## Source attribution

Adapted React Bits components are by David Haz and contributors, available under
[MIT + Commons Clause](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md).
The existing ICUE component adaptations and page styling remain in place.
