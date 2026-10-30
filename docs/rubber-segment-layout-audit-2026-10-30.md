# Rubber Segment layout audit — 30 October 2026

The newsroom effects toggle has been restored to the original single CPU icon button. `PerformanceModeToggle.jsx` matches the existing committed version; the “Lite / Full” segment has been removed. Its original CSS is unchanged.

The user requires confirmation before any further layout changes. The following layout differences from the Rubber Segment integration remain present for review; this audit does not authorize further redesign or rollback.

| Area | Layout difference | Source |
| --- | --- | --- |
| People header navigation | Home and Organization links share a padded segment track instead of separate links. The group remains hidden on narrow screens. | `people-app/src/components/Header.jsx` |
| People background toggle | One state-labelled button became two explicit Off/On choices, increasing width. | `people-app/src/components/Header.jsx` |
| People group navigation | Experts/Core Team use the new track, padding and 44px size, inside a horizontal overflow wrapper. Existing HR button markup and styles are preserved. | `people-app/src/components/PageShell.jsx` |
| Structure header navigation | Home/People links share a padded track. The original mobile hiding and search-disabled behavior are retained. | `structure-app/src/components/Header.jsx` |
| Dashboard filters | All/Drafts/Published use a shared track and a 20px bottom margin. | `news-app/src/pages/Dashboard.jsx` |
| Support inbox availability | One availability button became an Away/Online pair, increasing width beside Bell Toggle. | `news-app/src/pages/SupportInbox.jsx` |
| Support inbox filters | The queue filter row uses a 32px segment with 10px container padding. | `news-app/src/pages/SupportInbox.jsx` |
| Customer/staff portal selector | Original two-button navigation became a full-width shared track with a 22px bottom margin. | `news-app/src/pages/CustomerPortal.jsx` |
| AI Assist modes | Review/Improve/Draft use a shared track with new control sizing and 16px bottom spacing. | `news-app/src/pages/AiAssist.jsx` |
| Article/caption/comment translation locales | Existing locale buttons became one horizontally scrollable track. Control sizing and wrapping behavior change. | `news-app/src/components/ArticleTranslationsEditor.jsx`, `CaptionsDrawer.jsx`, `CommentTranslationsDrawer.jsx` |
| Assistant/team chat tabs | Original buttons became a 44px segment row, retaining panel IDs and keyboard switching. | `shared/chatbot/Chatbot.jsx`, `LiveChat.css` |

Existing Pill/Gooey navigation, Dock, CardNav, animated theme/video switches, Bell Toggle, Structure ripple tabs and the Our Work header label animation were preserved. Form checkboxes and rich list/carousel selectors were not converted into segments.

A separate working-tree edit also removes the People link from the newsroom header's primary links. That edit was not part of the Rubber Segment integration and was preserved as found.

The earlier newsroom lead-story redesign was requested in the preceding task. The latest requested addition places plain body-text previews in the existing main-story and three top-story cards: four lines for the lead, three lines for the top cards. Latest-story rows, article publishing and full article content are unchanged.

The build failures were caused by missing platform-specific Rolldown optional dependencies. Those packages were restored. The app installer now includes optional dependencies, uses a project-owned npm cache, and checks that Vite actually loads before continuing. No authentication behavior was changed for that repair.
