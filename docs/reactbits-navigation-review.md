# React Bits navigation review — 2026-10-20

Reviewed the current JavaScript + CSS registry sources from reactbits.dev.
Cursor Grid and Halftone Reveal remain recommendations. Card Nav was subsequently
requested for the shared app menu on icue.vn and has now been implemented there.

| Component | Fit for ICUE | Decision |
| --- | --- | --- |
| [Cursor Grid](https://reactbits.dev/animations/cursor-grid) | A restrained background for a home or Our Work introduction. The current WebGL2 source supports grid styles, cursor trails, click pulses, bounded DPR, visibility pause and a reduced-motion path. | Review only. A contained section would keep pointer effects away from long reading and data-entry sessions. |
| [Halftone Reveal](https://reactbits.dev/animations/halftone-reveal) | An editorial treatment for selected project or community photographs, with the original image available on touch devices and when graphics are unavailable. The source uses an image texture and a persistent reveal mask. | Review only. Preserve the site's existing image loading, accessible alternative text and local assets if adopted. |
| [Card Nav](https://reactbits.dev/components/card-nav) | App menu in the dedicated Newsroom, People, Structure and Our Work headers. | Implemented with three app cards, a custom three-dot vertical SVG toggle, inset rims and restrained height animation. Uses existing Lucide icons without the registry's two Hugeicons packages. |
| [Gooey Nav](https://reactbits.dev/components/gooey-nav) | Existing Newsroom social links and route-aware legal document tabs. | Updated to the current WebGL2 pill/drop renderer, shared by both consumers. |

## Navigation cleanup

HR and Contract link to the other ICUE applications from their authenticated
sidebars using ordinary links. The popup controls have been removed from the HR
header, Contract navigation, and both login pages. Cross-app links retain
`target="_blank"` and `rel="noopener noreferrer"`.

At the user's subsequent request, both the Vietnamese and English repositories
remove the app launcher from `home-app/src/components/PillSiteHeader.jsx` and
`shared/main-site-nav/MainSiteHeader.jsx`. This applies to all screen sizes and
all pages using those shared header components.

## Card Nav adaptation

`shared/ui/CardNav.jsx` and `CardNav.css` contain the current registry component,
adapted for the compact launcher in `shared/app-switcher/AppSwitcher.jsx`. The
public-site launcher now has a custom three-dot vertical SVG icon and a soft inset
rim. The dots inherit the current text color for both themes. Its expanded panel presents Website,
HR and Contract as cards, marks the current app, and preserves native external
links with localized accessible labels. The website card is informational while
the visitor is on the website.

The panel remains portalled beyond transformed or clipped headers. It uses the
source's spring engine without bounce or stagger, stops requesting frames after settling, keeps
closing content inert, supports live reduced-motion changes, and falls back to
window resize events when ResizeObserver is unavailable. Desktop placement uses
expanded content height before animation. Escape, outside dismissal, restored focus and the
mobile focus/scroll guard are retained in the dedicated section headers.

On 2026-10-29, the submenu became the ICUE ecosystem navigator. Its localized
header introduces the three platforms. Each card includes its public/internal
category, description, four core functions, and a footer with the destination
domain. The current platform has a subtle highlight and a localized “You are
here” status; the other two retain native links opening in a new tab. Desktop
cards share grid rows so their dividers and footer actions align. At 760px and
below they become a single-open accordion, initially expanded on the current
platform. Hidden actions leave the tab order, arrow/Home/End keys navigate the
accordion headings, and the mobile focus guard considers only visible controls.

The ecosystem browser review covered light and dark themes from 320px to 1440px,
including the desktop/mobile boundary, divider alignment and keyboard behavior.
The shared URL data and the People app's HR button are unchanged.

## Gooey Nav adaptation

The renderer is vendored in `shared/ui/GooeyNav.jsx` and `GooeyNav.css`; Newsroom's
existing module remains a compatibility entry point. The legal wrapper supplies
React Router links and controlled selection, so reloads and browser history keep
the correct active document. Social actions preserve their original external
URLs, monochrome base artwork and colored icons inside the moving pill. Their
hover treatment also works with keyboard focus.

Local additions provide a static fallback when WebGL2 or shader compilation is
unavailable, live reduced-motion changes, visibility and intersection pauses,
missing-observer fallbacks, context-loss recovery, and GPU/listener cleanup.
Selection can be empty without leaving a frame loop running. The active text
color is chosen using linearized luminance. No new packages were added.

Regression checks exercise actual React rendering and native-link behavior,
controlled selection, hover/focus, empty and resized item lists, animated
settling, reduced motion, hidden/offscreen pause, graphics failure, recovery and
cleanup. Graphics tests use a WebGL test double; live browser/GPU appearance
remains unverified because computer access is unavailable.

Source: David Haz and React Bits contributors, under the repository's existing
[MIT + Commons Clause license](third-party/react-bits-LICENSE.md). Registry URLs
and content hashes are recorded in `reactbits-navigation-snapshot.json`.
