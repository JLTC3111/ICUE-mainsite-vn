# Dark mode review — 20 October 2026

The Notable Awards page uses the existing sun/moon switch in the header. It
shares the saved `aboutUs_theme` preference with About Us and Past Projects,
and follows the system preference until the visitor selects a theme.

This update completes the awards palette for certification badges, timeline
borders and year markers, browser color scheme, sidebar separators, floating
controls, and the calendar popup. Certification logos retain white tiles so
the original artwork stays legible. Award and certification cards use the
supplied canvas React Bits Star Border with square corners and theme-matched
trails. Animation pauses outside the viewport and in hidden tabs; reduced
motion keeps a static edge highlight.

## Additional pages updated

| Pages | Dark mode coverage |
| --- | --- |
| FAQs (`/faqs`) | Header switch, expanded answers, category cards and contact action. |
| Privacy, Terms, GDPR, Cookies (`/legal/*`) | Document-specific accents, contents navigation, tables, callouts, action labels, cookie settings and feedback. |
| News archive and archived articles (`/news-archive`, `/news-archive/:articleId`) | Header switch, mobile cards, desktop carousel, article text, captions, navigation, code blocks and pagination. Partner artwork keeps a light plate. |
| Recruitment (`/recruitment`) | Search, expanded postings, benefits, empty states and application actions. |
| Structure (`/structure/`) | Header switch, organization page surfaces, document search, language control and raised/inset controls. Existing dark profile cards and dialogs remain legible. |
| Contact (`/contact`) | Fields, placeholders, topic choices, consent, validation, disabled/ready/hover submit states and feedback. The external map retains its provider's own rendering. |
| Community Activities (`/community-activities`) | Programme surfaces, captions and photo dialog controls. |

These pages explicitly opt into `shared/ui/usePageTheme.js`. They use the
existing `aboutUs_theme` preference so a choice carries between them and the
awards/about/project pages. Without a saved choice, they follow the system.
Cross-tab changes are observed, and leaving an archive route clears its
document theme so other home-app pages keep their own behavior.

## Existing support to preserve

- About Us and Past Projects: shared `useAboutTheme` preference and header toggle.
- People already has dark mode, as confirmed by the user. It is excluded from this update; no People files or theme controls were changed.
- Our Work: `ThemeProvider`, a saved preference, system fallback, and a header toggle.
- Newsroom readers and article detail: `NewsroomThemeProvider` and dedicated dark styles. The AI assistant also follows this preference; dashboard, editor, login, and profile routes are not all covered by the reader theme.

People, Our Work, and Newsroom retain their own theme systems and preference
keys. Shared styles for the newly updated pages require an opt-in attribute;
they do not apply to the People app.
