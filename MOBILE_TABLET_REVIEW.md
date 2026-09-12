Mobile and tablet review — 11 September 2026

Reviewed the responsive layouts, shared navigation, touch scrolling, chat sizing, video lifecycle, and decorative rendering. Confirmed issues were fixed locally. Existing workspace edits were preserved.

| Issue | Evidence and correction |
| --- | --- |
| Drawer links unreachable on short screens | At 844 × 390, the first links started above the viewport. Centering now uses auto margins, so overflowing menus start inside the scrollable area. |
| Drawer taller than the screen | At 320 × 568, content-box sizing produced a 672px drawer after padding. Explicit border-box sizing keeps the entire drawer inside the viewport and makes the last submenu links reachable. |
| Closed drawer remained keyboard-focusable | Added `inert` while closed. Verified that hidden links cannot receive focus. |
| Horizontal page overflow | Footer sizing, rotating footer decorations, and off-screen profile effects expanded mobile layout viewports. Corrected footer box sizing and contained the decorative overflow. The 56 route/viewport checks now report no horizontal page overflow. |
| Chat clipped in landscape and vulnerable to keyboard overlap | The landscape chat panel began above the viewport. Its height is now bounded, it follows visual viewport resizing, and compact layouts preserve room for the conversation. Chat and contact inputs use 16px text. |
| Video work continued after teardown | Cancelled queued preloads, retry timers, resize callbacks, and media listeners. Stale play promises cannot retry a replacement or detached video. Six regression tests cover these lifecycle failures. |
| Rotation requested larger video assets | Phone landscape viewports retain the 540p assets. The mobile selection also includes the layout's 768px boundary. |
| Motion/network preferences only checked initially | Home video now reacts to reduced-motion and connection changes. Playback and loading stop when the context disallows video. |
| Static menu shader kept rendering | With reduced motion enabled, the menu submitted 30 draw calls in 500ms. After the fix, both Home and Contact measured zero repeated draws over the same interval; normal animation resumed when reduced motion was disabled. Both shader layers pause and observe preference changes live. |

Validation covered 14 routes at 360 × 800, 820 × 1180, 844 × 390, and 1180 × 820: Home, About, Projects, Awards, News Archive, Newsroom, Our Work, Contact, Privacy, FAQs, Recruitment, Community, People, and Structure. These checks found no horizontal page overflow, clipped first drawer links, or JavaScript runtime errors after the layout fixes.

Additional checks covered 320 × 568, 768 × 1024, 1024 × 768, 1366 × 1024, and a 1440 × 900 desktop control. They verified footer width, drawer focus, touch scrolling, submenu expansion, and access to the final links. Separate browser checks exercised rotation, video toggles, live reduced-motion/data-saver changes, and a simulated keyboard viewport resize.

All ten app builds passed. The assembled production output passed route verification, 2,052 locale transitions, and publish-boundary checks. The six home-media regression tests and 15 existing chatbot tests passed. Run the persistent media tests with `npm run test:home-media`.

Further performance opportunities remain in the optional 3D views. The About piano runtime is approximately 298KB gzip; the tablet badge runtime is approximately 1.13MB gzip. The badge already loads after profile selection and its 3D rendering is disabled on phones. Physical tablet profiling would help determine whether lighter runtime assets or a still-image option would provide worthwhile savings.

Browser testing used local Chromium emulation. Physical iPhone/iPad Safari behavior, native keyboard behavior, battery use, and frame rates on real mobile hardware were not measured.

Follow-up — 12 September 2026: reproduced the News Archive card text disappearing after touch. A leftover `.card:hover` rule changed the title, summary, location, and date to white while the swiper kept its transparent background over the white page. Removed the obsolete card hover rules. Chromium checks confirmed readable text at rest, after a tap, under persistent hover, and after a swipe; article links also worked. Covered touch viewports at 360, 390, 430, 768, 820, and 1024 pixels wide, plus mouse controls at 980 and 1440 pixels. The home production build and assembled route verification passed.

The expanded touch/hover review covered the converted Home pages and the public interfaces of all nine standalone apps. Static inspection covered 167 stylesheets and the related mouse, touch, pointer, and focus handlers. Six additional issues were reproduced and corrected:

| Issue | Evidence and correction |
| --- | --- |
| About headings became faint after touch | Generic `h2:hover` changed the copper heading to aqua over white. Removed the legacy global heading hover rules from `styles.css`, keeping component-specific heading styles in control. |
| Home card images faded on touch | The pixel effect hid the original image when touch created a persistent hover state. Limited the effect to a fine pointer that supports hover; touch keeps the original image visible. |
| About statements stopped advancing after a tap | A synthesized mouse-enter event permanently paused the timer. Pointer handlers now pause only for an actual mouse. |
| Completing an About statement left it dimmed | Tapping during the entry fade cancelled its animation at partial opacity. Completing the text now restores opacity and transform. Removed the competing CSS opacity transition from this slider so that restoration is immediate. |
| Tablet gallery skipped the first expansion tap | Touch focus selected the panel before its click handler ran, causing the lightbox to open immediately. Automatic focus selection now requires keyboard-visible focus; pointer hover selection requires a mouse. First tap expands, second tap opens. |
| Partner logos stopped moving after a tap | The same synthesized mouse-enter event left the strip paused. Mouse hover still pauses it; touch release resumes movement, and ordinary logo taps still reach their links. |

Browser coverage included 15 distinct public routes at 390 × 844 and 820 × 1180. The corrected Home pages and Core Team passed the subsequent hover sweep. Additional light/dark checks covered About, Projects, Awards, and Newsroom; no disappearing text was found in the tested standalone states. Twenty standalone interaction checks passed across Our Work, Contact, FAQ, Recruitment, Community, Legal, Experts, Core Team, Structure, and Newsroom. These exercised topic selection, disclosures, gallery controls, profile changes, tabs, and article navigation; Newsroom loaded ten published cards at each viewport.

Focused regressions confirmed that touch no longer stalls the statements or logos, completing a statement during its fade restores the full text at opacity 1, and the tablet gallery requires the intended two taps. Desktop checks at 1440 × 900 retained mouse hover behavior, gallery keyboard selection and Enter/Escape controls, and the pixel image's reduced-motion fallback. Carousel dwell timing was shortened only inside the browser test harness; production timing remains 45 seconds. The updated Home production build, route verification, and publish-boundary checks passed. Authenticated editor/admin actions and physical Safari devices were outside this pass.
