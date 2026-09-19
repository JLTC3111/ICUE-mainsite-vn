# Mobile resume and reconnect audit

- Repository: `JLTC3111/ICUE-mainsite-vn`
- Base: `570f566bae2d4141ec1f44aedce68e9401696999`
- Repair branch: `fix/mobile-resume-recovery`
- Laptop branch: `codex/laptop-music-bars`
- Integration branch: `integration/mobile-recovery`
- Revalidated: 2026-09-19 (combined iPhone and laptop work)
- iPhone repair PR: [#4](https://github.com/JLTC3111/ICUE-mainsite-vn/pull/4)

## Scope and result

Recovery faults were found and repaired across the ten apps. All 502 production JavaScript/TypeScript sources under the app source trees, shared code, and root runtime directories were inventoried and parsed, including 280 JSX/TSX files. Async operations and lifecycle owners received targeted review. The full production build and 119 tests pass.

This is source, build, and targeted behavior coverage. It does not certify every interaction on every component or device. The inventory below distinguishes component sources from other runtime sources; syntax validation alone is not a functional test. Regression tests do not write to production services.

## Repairs

| Failure | Resulting behavior |
| --- | --- |
| Reconnect signals received while hidden were lost. | Shared lifecycle subscriptions retain online/freeze/back-forward signals until the page is visible and online. A new short background trip is not suppressed by the previous trip’s deduplication interval. |
| Rejected imports/configuration stayed cached. | Failed loaders become retryable. React lazy boundaries create a fresh lazy instance on retry and keep neighboring UI mounted. Optional decorations have their own boundary. |
| Failed i18next backend entries could remain terminal. | Recovery invokes the actual locale loader, installs the resource bundle, and notifies consumers without overwriting a newer language choice. |
| Stalled requests left pages loading indefinitely. | Requests have cancellation and deadlines covering response bodies: 20 seconds for GET/HEAD and 90 seconds for mutations. Logical engagement-read RPCs use a 20-second deadline. |
| Stale reads overwrote newer data or optimistic mutations. | Abort signals, request versions, and active-effect guards reject older results. Notification reconnect supersedes hung counts; reaction/comment reads pause around active mutations. |
| Background reads replaced unsaved drafts. | Editor recovery retries initial reads only. Ready editor drafts remain intact. Auth-driven profile updates populate fields only while they are pristine. |
| Temporary failures erased ready content or resembled empty feeds. | Invalid public JSON is an error. Ready feeds/articles/lists/translations survive transient failures. Failed initial reads expose retry controls. |
| Translation caches retained missing or old data. | Read caches expire and invalidate on recovery; an old in-flight request cannot repopulate an invalidated cache. Successful empty responses remove deleted translations. |
| Auth/profile events raced each other or sign-out. | Concurrent profile reads are deduplicated; read errors cannot trigger profile creation. Transient errors retain a known profile. Older session/profile results are ignored after account changes. |
| Rejected sign-in or save operations got stuck or displayed false success. | Sign-in/password flows settle on rejection. Profile and article-media writes check returned errors. Contact/login/profile/reaction submissions have synchronous duplicate guards. |
| Images/video/reveal effects stayed blank. | Failed images retry without changing signed URLs or responsive sources. Home-video recovery respects its toggle and preserves position. GradientWaves rebuilds GPU resources after context restoration. Contact reveals have a fallback. |
| Recovery could repeat writes. | No automatic replay was added for saves, emails, comments, reactions, or form posts. Reset-email fallback is limited to an absent endpoint. Article resume does not repeat its view write. |

## Application coverage

| Application | Runtime files | JSX/TSX | Scope |
| --- | ---: | ---: | --- |
| `home-app` | 78 | 43 | Shared recovery, route and UI-locale downloads, model-viewer module retry, failed background-video reload with playback-position restoration, and GradientWaves context restoration. |
| `news-app` | 170 | 99 | Feed, article, dashboard, AI lists, comments, reactions, notifications, and market reads recover. Initial editor reads retry without replacing ready drafts. Auth/profile races and false save-success states repaired. |
| `people-app` | 30 | 22 | Shared recovery and UI locales; isolated Galaxy boundary and retryable GSAP loading for PixelTransition. |
| `structure-app` | 38 | 29 | Shared recovery and UI locales; recoverable routes and EmployeeLanyard imports. |
| `ourwork-app` | 21 | 12 | Shared root/media recovery; existing bundled locales retain their loading behavior. |
| `contact-app` | 17 | 9 | Shared recovery and UI locales; isolated sidebar; bounded form request and duplicate-submit guard; reveal fallback and resume handling. |
| `legal-app` | 18 | 8 | Shared recovery and UI locales; failed legal-language downloads retry with an explicit notice and Vietnamese fallback. |
| `faq-app` | 10 | 5 | Shared recovery and UI locales; isolated optional sidebar chunk. |
| `recruitment-app` | 17 | 10 | Shared recovery and UI locales; isolated optional sidebar chunk. |
| `community-app` | 13 | 7 | Shared recovery and UI locales; isolated optional sidebar chunk. |
| `shared` | 77 | 29 | Shared lifecycle, requests, loading, media, locales, clock, and chatbot recovery. |
| `components` | 5 | 5 | Included in the production-source syntax and lifecycle scan. |
| `lib` | 1 | 0 | Included in the production-source syntax and lifecycle scan. |
| `src` | 6 | 2 | Included in the production-source syntax and lifecycle scan. |
| `legacy` | 1 | 0 | Included in the production-source syntax and lifecycle scan. |

## Validation

| Check | Result |
| --- | --- |
| `npm run audit:recovery` | 502 runtime sources parsed; 280 JSX/TSX; zero errors. |
| `npm run test:recovery` | 29 passed (Shared recovery). |
| `npm test --prefix news-app` | 67 passed (Newsroom). |
| `npm run test:home-media` | 8 passed (Home video). |
| `npm run test:chatbot` | 15 passed (Chatbot matching). |
| `npm run build` | All ten app builds and all prebuild/final gates pass. |
| Locale routing | 2,052 locale-preserving transitions verified. |
| Routes | Five route shells, sitemap, robots, and Netlify rewrites verified. |
| Publish boundary | 12 required files and 83 self-hosted fonts verified. |
| Chatbot content | 26 intents and 16 FAQ records verified in six languages; the existing nine variable claims remain held for review. |
| ESLint | All 42 changed newsroom JavaScript/JSX sources pass without warnings. |
| Production browser preview | Desktop/mobile music controls, independent bar motion, keyboard playback, reduced motion, and track completion pass. Background video continues when music pauses or ends; no page runtime errors. |
| `git diff --check` | Pass. |

The regression harness executes the actual source modules with real React and mocks only platform/service boundaries. Cases cover lifecycle event ordering, deadlines, cancelled requests, loader retries, real i18next backend failure, cache invalidation races, draft preservation, auth/profile races, duplicate submissions, hung notification counts, and article refresh without duplicate view writes.

Tracked assets, legacy files, and fonts omitted by the restored sparse checkout were restored before the initial full build. The combined result was rebuilt on the laptop with the locked dependencies. Existing bundle-size warnings remain. These local checks do not perform production writes.

## Integration status

The iPhone repair commit `9e75e6850d936c08fdfac93697681a1ec4ec21b5` is published in PR #4. The latest laptop music-bar changes were committed and pushed separately as `8a796db8c0964e46c97a94853734d83704f6e8d7` on `codex/laptop-music-bars`.

Both branches are combined in `integration/mobile-recovery` by merge commit `850d4304e84639a1f7964d5a3a092f49108adf1f`, with no conflicts and both source commits preserved. All checks above were rerun successfully on this combined tree before preparing one integration PR to main. The music icon uses four independently eased bars, follows playback state, and respects reduced motion; background video remains independently controlled.

## Remaining validation and limitations

- Physical iOS/Android suspension, Safari back-forward cache, and browser memory eviction have not been tested against this branch. Synthetic events do not reproduce an OS killing the tab.
- GPU context loss/restoration and 3D model asset downloads need device-level checks. Tests cover the shared lifecycle and home-video manager, not a real GPU.
- Signed-in publishing, profile updates, notification Realtime, reset emails, contact delivery, and large uploads need environment-specific acceptance tests. Tests mock these services to avoid production writes.
- Multi-step article/media uploads remain nontransactional. Partial or uncertain server writes can require reconciliation before a manual retry; no automatic mutation replay was added.
- Unsaved in-memory drafts survive resume refreshes but are not persisted across browser/OS process termination.
- Generic runtime exceptions expose Retry/Reload. Only loading failures automatically retry; deterministic render bugs still require a code fix.
- The build/test result covers the combined iPhone and laptop integration described above; future source changes require their own validation.

## Complete production-source inventory

All files below passed parsing. Async and Lifecycle are scan indicators used to identify review targets; a dash means the scan did not find a matching construct, not that the file has no runtime dependencies.

| Source | Kind | Async | Lifecycle |
| --- | --- | --- | --- |
| `community-app/src/App.jsx` | JSX/TSX | — | Yes |
| `community-app/src/components/Lightbox.jsx` | JSX/TSX | — | Yes |
| `community-app/src/components/PageLanguageMenu.jsx` | JSX/TSX | — | — |
| `community-app/src/components/PhotoFigure.jsx` | JSX/TSX | — | — |
| `community-app/src/components/ProgrammeSection.jsx` | JSX/TSX | — | — |
| `community-app/src/data/photos.js` | Runtime | — | — |
| `community-app/src/data/programmes.js` | Runtime | — | — |
| `community-app/src/hooks/useMainSite.js` | Runtime | — | — |
| `community-app/src/lib/detectLanguage.js` | Runtime | — | — |
| `community-app/src/lib/i18n.js` | Runtime | Yes | — |
| `community-app/src/lib/siteOrigin.js` | Runtime | — | — |
| `community-app/src/main.jsx` | JSX/TSX | Yes | — |
| `community-app/src/routes/Page.jsx` | JSX/TSX | Yes | Yes |
| `components/motion-primitives/animated-group.tsx` | JSX/TSX | — | — |
| `components/motion-primitives/text-effect.tsx` | JSX/TSX | — | — |
| `components/motion-primitives/text-scramble.tsx` | JSX/TSX | — | Yes |
| `components/motion-primitives/text-shimmer-wave.tsx` | JSX/TSX | — | — |
| `components/motion-primitives/text-shimmer.tsx` | JSX/TSX | — | — |
| `contact-app/src/App.jsx` | JSX/TSX | — | Yes |
| `contact-app/src/components/ContactForm.jsx` | JSX/TSX | — | — |
| `contact-app/src/components/ContactRail.jsx` | JSX/TSX | — | — |
| `contact-app/src/components/MetaBar.jsx` | JSX/TSX | — | — |
| `contact-app/src/components/MotionText.jsx` | JSX/TSX | — | Yes |
| `contact-app/src/components/OfficeMap.jsx` | JSX/TSX | — | — |
| `contact-app/src/components/PageLanguageMenu.jsx` | JSX/TSX | — | — |
| `contact-app/src/data/contactChannels.js` | Runtime | — | — |
| `contact-app/src/hooks/useContactForm.js` | Runtime | Yes | — |
| `contact-app/src/hooks/useMainSite.js` | Runtime | — | — |
| `contact-app/src/hooks/useReveal.js` | Runtime | — | Yes |
| `contact-app/src/lib/detectLanguage.js` | Runtime | — | — |
| `contact-app/src/lib/i18n.js` | Runtime | Yes | — |
| `contact-app/src/lib/netlifyForm.js` | Runtime | Yes | — |
| `contact-app/src/lib/siteOrigin.js` | Runtime | — | — |
| `contact-app/src/main.jsx` | JSX/TSX | Yes | — |
| `contact-app/src/routes/ContactPage.jsx` | JSX/TSX | Yes | Yes |
| `faq-app/src/App.jsx` | JSX/TSX | — | Yes |
| `faq-app/src/components/FaqAccordion.jsx` | JSX/TSX | — | Yes |
| `faq-app/src/components/PageLanguageMenu.jsx` | JSX/TSX | — | — |
| `faq-app/src/data/categoryIcons.js` | Runtime | — | — |
| `faq-app/src/hooks/useMainSite.js` | Runtime | — | — |
| `faq-app/src/lib/detectLanguage.js` | Runtime | — | — |
| `faq-app/src/lib/i18n.js` | Runtime | Yes | — |
| `faq-app/src/lib/siteOrigin.js` | Runtime | — | — |
| `faq-app/src/main.jsx` | JSX/TSX | Yes | — |
| `faq-app/src/routes/Page.jsx` | JSX/TSX | Yes | Yes |
| `home-app/src/App.jsx` | JSX/TSX | Yes | Yes |
| `home-app/src/components/ErrorBoundary.jsx` | JSX/TSX | — | — |
| `home-app/src/components/HeroVideoTitle.jsx` | JSX/TSX | Yes | Yes |
| `home-app/src/components/HomeBeamNetwork.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/HomeCard.jsx` | JSX/TSX | — | — |
| `home-app/src/components/HomeHero.jsx` | JSX/TSX | — | — |
| `home-app/src/components/HomeSection.jsx` | JSX/TSX | — | — |
| `home-app/src/components/PillSiteHeader.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/RouteHead.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/SiteLanguageMenu.jsx` | JSX/TSX | — | — |
| `home-app/src/components/aboutUs/AboutGradientWaves.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/aboutUs/AboutModelViewer.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/aboutUs/AboutTextSlider.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/aboutUs/BalloonButton.jsx` | JSX/TSX | — | — |
| `home-app/src/components/aboutUs/CurvedText.jsx` | JSX/TSX | — | — |
| `home-app/src/components/aboutUs/useAboutTheme.js` | Runtime | — | Yes |
| `home-app/src/components/awards/AwardCard.jsx` | JSX/TSX | — | — |
| `home-app/src/components/awards/AwardIcon.jsx` | JSX/TSX | — | — |
| `home-app/src/components/awards/AwardsHero.jsx` | JSX/TSX | — | — |
| `home-app/src/components/awards/AwardsReveal.jsx` | JSX/TSX | — | — |
| `home-app/src/components/awards/AwardsTimeline.jsx` | JSX/TSX | — | — |
| `home-app/src/components/awards/CertificationCard.jsx` | JSX/TSX | — | — |
| `home-app/src/components/magicui/AnimatedBeam.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/magicui/PixelImage.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/magicui/RainbowButton.jsx` | JSX/TSX | — | — |
| `home-app/src/components/magicui/TextAnimate.jsx` | JSX/TSX | — | — |
| `home-app/src/components/magicui/WarpBackground.jsx` | JSX/TSX | — | — |
| `home-app/src/components/motion-primitives/TextEffect.jsx` | JSX/TSX | — | — |
| `home-app/src/components/reactbits/AccordionGallery.jsx` | JSX/TSX | Yes | Yes |
| `home-app/src/components/reactbits/AnimatedContent.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/reactbits/GradientWaves.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/reactbits/MaskedHeading.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/reactbits/ScrollExpand.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/reactbits/ScrollReveal.jsx` | JSX/TSX | — | — |
| `home-app/src/components/reactbits/ScrollVelocity.jsx` | JSX/TSX | — | Yes |
| `home-app/src/components/reactbits/StarBorder.jsx` | JSX/TSX | — | Yes |
| `home-app/src/data/aboutUsContent.js` | Runtime | — | — |
| `home-app/src/data/galleryPlaceholders.js` | Runtime | — | — |
| `home-app/src/data/homeContent.js` | Runtime | — | — |
| `home-app/src/data/newsArchive/copy/de.js` | Runtime | — | — |
| `home-app/src/data/newsArchive/copy/en.js` | Runtime | — | — |
| `home-app/src/data/newsArchive/copy/fr.js` | Runtime | — | — |
| `home-app/src/data/newsArchive/copy/ja.js` | Runtime | — | — |
| `home-app/src/data/newsArchive/copy/ko.js` | Runtime | — | — |
| `home-app/src/data/newsArchive/copy/vi.js` | Runtime | — | — |
| `home-app/src/data/newsArchive/lang.js` | Runtime | — | — |
| `home-app/src/data/newsArchive/meta.js` | Runtime | — | — |
| `home-app/src/data/newsArchive/resolve.js` | Runtime | — | — |
| `home-app/src/data/newsArchive/shell.js` | Runtime | — | — |
| `home-app/src/data/newsArchiveArticles.js` | Runtime | — | — |
| `home-app/src/data/newsArchiveContent.js` | Runtime | — | — |
| `home-app/src/data/newsArchiveMeta.js` | Runtime | — | — |
| `home-app/src/data/notableAwardsContent.js` | Runtime | — | — |
| `home-app/src/data/pastProjectsContent.js` | Runtime | — | — |
| `home-app/src/hooks/useArchiveCopy.js` | Runtime | — | — |
| `home-app/src/hooks/useHeavyVisualEffects.js` | Runtime | — | Yes |
| `home-app/src/hooks/useHomeBackgroundVideo.js` | Runtime | — | Yes |
| `home-app/src/hooks/useHomeBackgroundVideoEnabled.js` | Runtime | — | Yes |
| `home-app/src/hooks/useRainText.js` | Runtime | — | Yes |
| `home-app/src/hooks/useSwiperNavContrast.js` | Runtime | — | Yes |
| `home-app/src/legacy/modelViewer.js` | Runtime | Yes | — |
| `home-app/src/lib/archiveMarkdown.js` | Runtime | — | — |
| `home-app/src/lib/debugLog.js` | Runtime | — | — |
| `home-app/src/lib/detectLanguage.js` | Runtime | — | — |
| `home-app/src/lib/homeBackgroundVideo.js` | Runtime | — | Yes |
| `home-app/src/lib/i18n.js` | Runtime | Yes | — |
| `home-app/src/lib/responsiveImage.js` | Runtime | — | — |
| `home-app/src/lib/routeMeta.js` | Runtime | — | — |
| `home-app/src/lib/routes.js` | Runtime | — | — |
| `home-app/src/lib/siteLinks.js` | Runtime | — | — |
| `home-app/src/main.jsx` | JSX/TSX | Yes | — |
| `home-app/src/pages/AboutUsPage.jsx` | JSX/TSX | — | Yes |
| `home-app/src/pages/HomePage.jsx` | JSX/TSX | — | Yes |
| `home-app/src/pages/NewsArchiveArticlePage.jsx` | JSX/TSX | — | Yes |
| `home-app/src/pages/NewsArchivePage.jsx` | JSX/TSX | — | Yes |
| `home-app/src/pages/NotableAwardsPage.jsx` | JSX/TSX | — | — |
| `home-app/src/pages/PastProjectDetailPage.jsx` | JSX/TSX | — | Yes |
| `home-app/src/pages/PastProjectsPage.jsx` | JSX/TSX | — | Yes |
| `legacy/script.js` | Runtime | Yes | Yes |
| `legal-app/src/App.jsx` | JSX/TSX | — | Yes |
| `legal-app/src/components/BlurFade.jsx` | JSX/TSX | — | — |
| `legal-app/src/components/CookiePreferences.jsx` | JSX/TSX | — | — |
| `legal-app/src/components/GooeyTabs.jsx` | JSX/TSX | — | — |
| `legal-app/src/components/PageLanguageMenu.jsx` | JSX/TSX | — | — |
| `legal-app/src/components/ScrollProgress.jsx` | JSX/TSX | — | — |
| `legal-app/src/components/SpotlightSection.jsx` | JSX/TSX | — | — |
| `legal-app/src/legal/content/de.js` | Runtime | — | — |
| `legal-app/src/legal/content/en.js` | Runtime | — | — |
| `legal-app/src/legal/content/fr.js` | Runtime | — | — |
| `legal-app/src/legal/content/ja.js` | Runtime | — | — |
| `legal-app/src/legal/content/ko.js` | Runtime | — | — |
| `legal-app/src/legal/content/vi.js` | Runtime | — | — |
| `legal-app/src/legal/structure.js` | Runtime | — | — |
| `legal-app/src/legalDocuments.js` | Runtime | Yes | — |
| `legal-app/src/lib/detectLanguage.js` | Runtime | — | — |
| `legal-app/src/lib/i18n.js` | Runtime | Yes | — |
| `legal-app/src/main.jsx` | JSX/TSX | — | — |
| `lib/utils.ts` | Runtime | — | — |
| `news-app/src/App.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/AnimatedShinyText.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ArticleComparisonCarousel.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/ArticleForm.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/ArticleHtmlContent.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ArticleImageComparison.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/ArticleMasonry.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ArticleMoreStories.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/ArticlePagedContent.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/ArticleParallaxCarousel.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/ArticleSearch.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/ArticleSourceItem.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ArticleSources.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ArticleSourcesEditor.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ArticleThumbnail.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ArticleTranslationsEditor.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/ArticleTranslator.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ArticleViewCounter.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/AuthorLink.jsx` | JSX/TSX | — | — |
| `news-app/src/components/BentoArticleGrid.jsx` | JSX/TSX | — | — |
| `news-app/src/components/BentoCardBackground.jsx` | JSX/TSX | — | — |
| `news-app/src/components/BentoCardComparison.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/BentoGrid.jsx` | JSX/TSX | — | — |
| `news-app/src/components/BentoYCarousel.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/CaptionsDrawer.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/CategoryFilter.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/CircularText/CircularText.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ClapButton.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/CommentSection.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/CommentTranslationEditor.jsx` | JSX/TSX | Yes | — |
| `news-app/src/components/CommentTranslationsDrawer.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/CoverComparisonEditor.jsx` | JSX/TSX | — | — |
| `news-app/src/components/DatePickerField.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/EditorOutlineRail.jsx` | JSX/TSX | — | — |
| `news-app/src/components/EditorSection.jsx` | JSX/TSX | — | — |
| `news-app/src/components/EmployeeNameHighlighter.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ErrorBoundary.jsx` | JSX/TSX | — | — |
| `news-app/src/components/Footer.jsx` | JSX/TSX | — | — |
| `news-app/src/components/GooeyNav.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/Header.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/HeartButton.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/HighlightedText.jsx` | JSX/TSX | — | — |
| `news-app/src/components/HyperText.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/LanguageSwitcher.jsx` | JSX/TSX | — | — |
| `news-app/src/components/Layout.jsx` | JSX/TSX | — | — |
| `news-app/src/components/Lens.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/components/MagicHighlightMarkView.jsx` | JSX/TSX | — | — |
| `news-app/src/components/MagicUnderlineMarkView.jsx` | JSX/TSX | — | — |
| `news-app/src/components/MarketStrip.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/MarketTicker.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/MediaGallery.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/MediaUploadIcons.jsx` | JSX/TSX | — | — |
| `news-app/src/components/MediaUploader.jsx` | JSX/TSX | — | — |
| `news-app/src/components/NewsroomThemeToggle.jsx` | JSX/TSX | — | — |
| `news-app/src/components/NotificationBell.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/PerformanceModeToggle.jsx` | JSX/TSX | — | — |
| `news-app/src/components/ProtectedRoute.jsx` | JSX/TSX | — | — |
| `news-app/src/components/RetroGrid.jsx` | JSX/TSX | — | — |
| `news-app/src/components/RichTextEditor.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/RotatingText.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/ScrollProgress.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/SocialGooeyNav.jsx` | JSX/TSX | — | — |
| `news-app/src/components/TimePickerField.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/TranslateElapsedPill.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/TranslationSkeleton.jsx` | JSX/TSX | — | — |
| `news-app/src/components/VnMarketTicker.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/WordRotate.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/icons/DevIcon174.jsx` | JSX/TSX | — | — |
| `news-app/src/components/icons/DevIcon218.jsx` | JSX/TSX | — | — |
| `news-app/src/components/icons/PhosphorCpu.jsx` | JSX/TSX | — | — |
| `news-app/src/components/icons/PhosphorHandsClapping.jsx` | JSX/TSX | — | — |
| `news-app/src/components/icons/PhosphorHeart.jsx` | JSX/TSX | — | — |
| `news-app/src/components/icons/PhosphorYoutubeLogo.jsx` | JSX/TSX | — | — |
| `news-app/src/components/magicui/AnimatedShinyText.jsx` | JSX/TSX | — | — |
| `news-app/src/components/magicui/AnimatedThemeToggler.jsx` | JSX/TSX | — | — |
| `news-app/src/components/magicui/BorderBeam.jsx` | JSX/TSX | — | — |
| `news-app/src/components/magicui/HeroVideoDialog.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/magicui/RainbowButton.jsx` | JSX/TSX | — | — |
| `news-app/src/components/magicui/Ripple.jsx` | JSX/TSX | — | — |
| `news-app/src/components/magicui/ShinyButton.jsx` | JSX/TSX | — | — |
| `news-app/src/components/magicui/SlidingNumber.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/magicui/TextAnimate.jsx` | JSX/TSX | — | — |
| `news-app/src/components/motion-primitives/ImageComparison.jsx` | JSX/TSX | — | — |
| `news-app/src/components/motion-primitives/TextLoop.jsx` | JSX/TSX | — | Yes |
| `news-app/src/components/react-bits/MagicBento.jsx` | JSX/TSX | — | Yes |
| `news-app/src/context/AuthContext.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/context/NewsroomSearchContext.jsx` | JSX/TSX | — | Yes |
| `news-app/src/context/NewsroomThemeContext.jsx` | JSX/TSX | — | — |
| `news-app/src/context/PerformanceProfileContext.jsx` | JSX/TSX | — | Yes |
| `news-app/src/hooks/useArticleTitleTranslations.js` | Runtime | — | Yes |
| `news-app/src/hooks/useClickOutside.js` | Runtime | — | Yes |
| `news-app/src/hooks/useDocumentTitle.js` | Runtime | — | — |
| `news-app/src/hooks/useElapsedMs.js` | Runtime | — | Yes |
| `news-app/src/hooks/useMainSite.js` | Runtime | — | — |
| `news-app/src/hooks/useMediaQuery.js` | Runtime | — | Yes |
| `news-app/src/hooks/useNotifications.js` | Runtime | Yes | Yes |
| `news-app/src/hooks/usePageResume.js` | Runtime | — | — |
| `news-app/src/hooks/usePopoverPosition.js` | Runtime | — | Yes |
| `news-app/src/lib/aiDraft.js` | Runtime | — | — |
| `news-app/src/lib/articleDropCap.js` | Runtime | — | — |
| `news-app/src/lib/articleHtmlSegments.js` | Runtime | — | — |
| `news-app/src/lib/articlePagination.js` | Runtime | — | — |
| `news-app/src/lib/articleReadModel.js` | Runtime | Yes | — |
| `news-app/src/lib/articleSources.js` | Runtime | — | — |
| `news-app/src/lib/articles.js` | Runtime | Yes | — |
| `news-app/src/lib/assistClient.js` | Runtime | — | — |
| `news-app/src/lib/assistHistory.js` | Runtime | Yes | — |
| `news-app/src/lib/authRedirect.js` | Runtime | — | — |
| `news-app/src/lib/authReset.js` | Runtime | Yes | — |
| `news-app/src/lib/authorLinks.js` | Runtime | — | — |
| `news-app/src/lib/bentoArticles.js` | Runtime | — | — |
| `news-app/src/lib/bentoLayout.js` | Runtime | — | — |
| `news-app/src/lib/browserTranslator.js` | Runtime | Yes | Yes |
| `news-app/src/lib/categories.js` | Runtime | — | — |
| `news-app/src/lib/commentTranslations.js` | Runtime | Yes | — |
| `news-app/src/lib/dateFormatting.js` | Runtime | — | — |
| `news-app/src/lib/dayPickerLocale.js` | Runtime | — | — |
| `news-app/src/lib/defaults.js` | Runtime | — | — |
| `news-app/src/lib/emblaParallax.js` | Runtime | — | — |
| `news-app/src/lib/engagement.js` | Runtime | Yes | — |
| `news-app/src/lib/fetchMarketApi.js` | Runtime | Yes | — |
| `news-app/src/lib/fluxAssist.js` | Runtime | Yes | — |
| `news-app/src/lib/fluxServer.js` | Runtime | Yes | — |
| `news-app/src/lib/geminiAssist.js` | Runtime | Yes | — |
| `news-app/src/lib/geminiServer.js` | Runtime | Yes | Yes |
| `news-app/src/lib/helpers.js` | Runtime | — | — |
| `news-app/src/lib/highlightMatches.js` | Runtime | — | — |
| `news-app/src/lib/i18n.js` | Runtime | Yes | — |
| `news-app/src/lib/importantPhrases.js` | Runtime | — | — |
| `news-app/src/lib/lazyWithRetry.js` | Runtime | — | — |
| `news-app/src/lib/lensGlass.js` | Runtime | Yes | Yes |
| `news-app/src/lib/localeCodes.js` | Runtime | — | — |
| `news-app/src/lib/marketQuotesFetch.js` | Runtime | Yes | — |
| `news-app/src/lib/marketTicker.js` | Runtime | Yes | — |
| `news-app/src/lib/mediaComparison.js` | Runtime | — | — |
| `news-app/src/lib/mediaTranslations.js` | Runtime | — | — |
| `news-app/src/lib/newsroom.js` | Runtime | — | — |
| `news-app/src/lib/newsroomTheme.js` | Runtime | — | — |
| `news-app/src/lib/notifications.js` | Runtime | Yes | — |
| `news-app/src/lib/pageResume.js` | Runtime | — | — |
| `news-app/src/lib/performanceProfile.js` | Runtime | — | — |
| `news-app/src/lib/postgrestRequest.js` | Runtime | — | — |
| `news-app/src/lib/publicArticles.js` | Runtime | Yes | — |
| `news-app/src/lib/publicSupabase.js` | Runtime | Yes | — |
| `news-app/src/lib/publicTranslate.js` | Runtime | Yes | — |
| `news-app/src/lib/referrerLang.js` | Runtime | — | — |
| `news-app/src/lib/searchArticles.js` | Runtime | — | — |
| `news-app/src/lib/serverEnv.js` | Runtime | — | — |
| `news-app/src/lib/siteOrigin.js` | Runtime | — | — |
| `news-app/src/lib/supabase.js` | Runtime | Yes | — |
| `news-app/src/lib/supabaseConfig.js` | Runtime | Yes | — |
| `news-app/src/lib/supabaseLoader.js` | Runtime | Yes | — |
| `news-app/src/lib/tiptapLineHeight.js` | Runtime | — | — |
| `news-app/src/lib/tiptapMagicHighlight.js` | Runtime | — | — |
| `news-app/src/lib/translate.js` | Runtime | Yes | — |
| `news-app/src/lib/translateUtils.js` | Runtime | — | — |
| `news-app/src/lib/translationCompleteness.js` | Runtime | — | — |
| `news-app/src/lib/videoEmbeds.js` | Runtime | — | — |
| `news-app/src/lib/vnMarketQuotesFetch.js` | Runtime | Yes | — |
| `news-app/src/lib/vnMarketTicker.js` | Runtime | Yes | — |
| `news-app/src/main.jsx` | JSX/TSX | Yes | — |
| `news-app/src/pages/AiAssist.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/pages/ArticleDetail.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/pages/Dashboard.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/pages/Edit.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/pages/Login.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/pages/NewsGrid.jsx` | JSX/TSX | — | Yes |
| `news-app/src/pages/Profile.jsx` | JSX/TSX | Yes | Yes |
| `news-app/src/pages/Upload.jsx` | JSX/TSX | Yes | — |
| `news-app/src/registry/magicui/highlighter.jsx` | JSX/TSX | — | — |
| `ourwork-app/src/App.jsx` | JSX/TSX | — | Yes |
| `ourwork-app/src/components/Header.jsx` | JSX/TSX | — | — |
| `ourwork-app/src/components/PageShell.jsx` | JSX/TSX | — | — |
| `ourwork-app/src/components/ThemeToggle.jsx` | JSX/TSX | — | — |
| `ourwork-app/src/components/magicui/AnimatedThemeToggler.jsx` | JSX/TSX | — | — |
| `ourwork-app/src/components/magicui/ScrollProgress.jsx` | JSX/TSX | — | — |
| `ourwork-app/src/components/reactbits/CountUp.jsx` | JSX/TSX | — | Yes |
| `ourwork-app/src/components/reactbits/SplitFlapText.jsx` | JSX/TSX | — | — |
| `ourwork-app/src/components/reactbits/SpotlightCard.jsx` | JSX/TSX | — | — |
| `ourwork-app/src/contexts/ThemeContext.jsx` | JSX/TSX | — | — |
| `ourwork-app/src/data/ourWorkScopes.js` | Runtime | — | — |
| `ourwork-app/src/hooks/useMainSite.js` | Runtime | — | — |
| `ourwork-app/src/hooks/useOurWorkMotion.js` | Runtime | — | Yes |
| `ourwork-app/src/hooks/useScrolled.js` | Runtime | — | Yes |
| `ourwork-app/src/lib/assets.js` | Runtime | — | — |
| `ourwork-app/src/lib/detectLanguage.js` | Runtime | — | — |
| `ourwork-app/src/lib/i18n.js` | Runtime | — | — |
| `ourwork-app/src/lib/siteOrigin.js` | Runtime | — | — |
| `ourwork-app/src/lib/theme.js` | Runtime | — | — |
| `ourwork-app/src/main.jsx` | JSX/TSX | — | — |
| `ourwork-app/src/routes/OurWorkPage.jsx` | JSX/TSX | — | Yes |
| `people-app/src/App.jsx` | JSX/TSX | — | Yes |
| `people-app/src/components/BorderGlow/BorderGlow.jsx` | JSX/TSX | — | Yes |
| `people-app/src/components/CircularText/CircularText.jsx` | JSX/TSX | — | — |
| `people-app/src/components/Footer.jsx` | JSX/TSX | — | — |
| `people-app/src/components/Header.jsx` | JSX/TSX | — | — |
| `people-app/src/components/InteractiveBackground/Galaxy/Galaxy.jsx` | JSX/TSX | — | Yes |
| `people-app/src/components/InteractiveBackground/InteractiveBackground.jsx` | JSX/TSX | Yes | Yes |
| `people-app/src/components/InteractiveBackground/galaxyPreset.js` | Runtime | — | — |
| `people-app/src/components/LanguageSwitcher.jsx` | JSX/TSX | — | — |
| `people-app/src/components/MetallicPaint/MetallicPaint.jsx` | JSX/TSX | — | Yes |
| `people-app/src/components/PageShell.jsx` | JSX/TSX | — | — |
| `people-app/src/components/PixelTransition/PixelTransition.jsx` | JSX/TSX | Yes | Yes |
| `people-app/src/components/ProfileCarousel.jsx` | JSX/TSX | — | Yes |
| `people-app/src/components/ProfileNav.jsx` | JSX/TSX | — | — |
| `people-app/src/components/ProfilePanel.jsx` | JSX/TSX | — | — |
| `people-app/src/components/ProfilePhoto.jsx` | JSX/TSX | — | Yes |
| `people-app/src/components/ShimmerButton/ShimmerButton.jsx` | JSX/TSX | — | — |
| `people-app/src/components/ShinyButton/ShinyButton.jsx` | JSX/TSX | — | — |
| `people-app/src/components/TiltedCard/TiltedCard.jsx` | JSX/TSX | — | — |
| `people-app/src/contexts/InteractiveBackgroundContext.jsx` | JSX/TSX | — | — |
| `people-app/src/data/people.js` | Runtime | — | — |
| `people-app/src/hooks/useBackgroundVideo.js` | Runtime | — | Yes |
| `people-app/src/hooks/useMainSite.js` | Runtime | — | — |
| `people-app/src/hooks/useSwipe.js` | Runtime | — | — |
| `people-app/src/lib/i18n.js` | Runtime | Yes | — |
| `people-app/src/lib/people.js` | Runtime | — | — |
| `people-app/src/lib/siteOrigin.js` | Runtime | — | — |
| `people-app/src/main.jsx` | JSX/TSX | Yes | — |
| `people-app/src/routes/CoreTeamPage.jsx` | JSX/TSX | — | — |
| `people-app/src/routes/ExpertsPage.jsx` | JSX/TSX | — | — |
| `recruitment-app/src/App.jsx` | JSX/TSX | — | Yes |
| `recruitment-app/src/components/BenefitGrid.jsx` | JSX/TSX | — | — |
| `recruitment-app/src/components/Gallery.jsx` | JSX/TSX | — | — |
| `recruitment-app/src/components/Glyph.jsx` | JSX/TSX | — | — |
| `recruitment-app/src/components/Highlight.jsx` | JSX/TSX | — | — |
| `recruitment-app/src/components/JobCard.jsx` | JSX/TSX | — | — |
| `recruitment-app/src/components/JobSearch.jsx` | JSX/TSX | — | Yes |
| `recruitment-app/src/components/PageLanguageMenu.jsx` | JSX/TSX | — | — |
| `recruitment-app/src/data/contentKeys.js` | Runtime | — | — |
| `recruitment-app/src/data/icons.js` | Runtime | — | — |
| `recruitment-app/src/data/jobs.js` | Runtime | — | — |
| `recruitment-app/src/hooks/useMainSite.js` | Runtime | — | — |
| `recruitment-app/src/lib/detectLanguage.js` | Runtime | — | — |
| `recruitment-app/src/lib/i18n.js` | Runtime | Yes | — |
| `recruitment-app/src/lib/siteOrigin.js` | Runtime | — | — |
| `recruitment-app/src/main.jsx` | JSX/TSX | Yes | — |
| `recruitment-app/src/routes/Page.jsx` | JSX/TSX | Yes | Yes |
| `shared/chatbot/Chatbot.jsx` | JSX/TSX | Yes | Yes |
| `shared/chatbot/hooks/useChatHistory.js` | Runtime | — | — |
| `shared/chatbot/index.js` | Runtime | — | — |
| `shared/chatbot/lib/botCopy.js` | Runtime | — | — |
| `shared/chatbot/lib/knowledge.js` | Runtime | Yes | — |
| `shared/chatbot/lib/matching.js` | Runtime | — | — |
| `shared/contact-sidebar/ContactSidebar.jsx` | JSX/TSX | — | — |
| `shared/contact-sidebar/DeferredContactSidebar.jsx` | JSX/TSX | Yes | Yes |
| `shared/contact-sidebar/backgroundSampling.js` | Runtime | — | Yes |
| `shared/contact-sidebar/index.js` | Runtime | — | — |
| `shared/contact-sidebar/useAdaptiveIconColor.js` | Runtime | — | Yes |
| `shared/contact-sidebar/useAudioVisualizer.js` | Runtime | Yes | Yes |
| `shared/contact-sidebar/useCalendarClock.js` | Runtime | — | Yes |
| `shared/contact-sidebar/useMusicBarColor.js` | Runtime | Yes | Yes |
| `shared/debug/debugLog.js` | Runtime | Yes | Yes |
| `shared/drawer-menu/DrawerMenu.jsx` | JSX/TSX | — | — |
| `shared/drawer-menu/DrawerMenuPanel.jsx` | JSX/TSX | — | Yes |
| `shared/drawer-menu/DrawerMenuToggle.jsx` | JSX/TSX | — | — |
| `shared/drawer-menu/LineSidebarNav.jsx` | JSX/TSX | — | Yes |
| `shared/drawer-menu/index.js` | Runtime | — | — |
| `shared/drawer-menu/useDrawerResize.js` | Runtime | — | Yes |
| `shared/drawer-menu/useLineSidebarProximity.js` | Runtime | — | Yes |
| `shared/faq-content/content/de.js` | Runtime | — | — |
| `shared/faq-content/content/en.js` | Runtime | — | — |
| `shared/faq-content/content/fr.js` | Runtime | — | — |
| `shared/faq-content/content/ja.js` | Runtime | — | — |
| `shared/faq-content/content/ko.js` | Runtime | — | — |
| `shared/faq-content/content/vi.js` | Runtime | — | — |
| `shared/faq-content/index.js` | Runtime | — | — |
| `shared/home-layout/HomeLayoutGuard.jsx` | JSX/TSX | — | Yes |
| `shared/i18n/FlagIcon.jsx` | JSX/TSX | — | — |
| `shared/i18n/LanguageFlagMenu.jsx` | JSX/TSX | — | Yes |
| `shared/i18n/LanguageSwitcher.jsx` | JSX/TSX | — | — |
| `shared/i18n/langFlags.js` | Runtime | — | — |
| `shared/main-site-nav/LanguageFlagLink.jsx` | JSX/TSX | — | Yes |
| `shared/main-site-nav/MainSiteHeader.jsx` | JSX/TSX | — | — |
| `shared/main-site-nav/MainSiteNav.jsx` | JSX/TSX | — | Yes |
| `shared/main-site-nav/MetallicMenuIcon.jsx` | JSX/TSX | Yes | Yes |
| `shared/main-site-nav/ThemeToggle.jsx` | JSX/TSX | — | — |
| `shared/main-site-nav/VideoToggle.jsx` | JSX/TSX | — | — |
| `shared/main-site-nav/bridge.js` | Runtime | — | — |
| `shared/main-site-nav/buildDrawerNav.js` | Runtime | — | — |
| `shared/main-site-nav/languageSwitcher.js` | Runtime | — | — |
| `shared/main-site-nav/metallicPaintSupport.js` | Runtime | — | — |
| `shared/main-site-nav/navContent.js` | Runtime | — | — |
| `shared/main-site-nav/navLinks.jsx` | JSX/TSX | — | — |
| `shared/motion-primitives/TextScramble.jsx` | JSX/TSX | — | Yes |
| `shared/resilience/AppRecovery.jsx` | JSX/TSX | — | Yes |
| `shared/resilience/ExpiringCache.js` | Runtime | — | — |
| `shared/resilience/RecoveryBoundary.jsx` | JSX/TSX | — | — |
| `shared/resilience/lazyWithRecovery.jsx` | JSX/TSX | — | — |
| `shared/resilience/localeRecovery.js` | Runtime | Yes | — |
| `shared/resilience/mediaRecovery.js` | Runtime | — | Yes |
| `shared/resilience/pageResume.js` | Runtime | — | Yes |
| `shared/resilience/requests.js` | Runtime | Yes | Yes |
| `shared/resilience/usePageResume.js` | Runtime | — | Yes |
| `shared/site-footer/Footer.jsx` | JSX/TSX | — | — |
| `shared/site-footer/footerContent.js` | Runtime | — | — |
| `shared/site-footer/footerLinks.js` | Runtime | — | — |
| `shared/site-meta/useDocumentMeta.js` | Runtime | — | Yes |
| `shared/site-routes/capabilityStatement.js` | Runtime | — | — |
| `shared/site-routes/mainSitePaths.js` | Runtime | — | — |
| `shared/site-routes/newsArchiveRedirects.js` | Runtime | — | — |
| `shared/site-routes/notableAwardsRedirects.js` | Runtime | — | — |
| `shared/site-routes/pastProjectsRedirects.js` | Runtime | — | — |
| `shared/storage/safeLocalStorage.js` | Runtime | — | — |
| `shared/text/normalizeUnicode.js` | Runtime | — | — |
| `shared/text/sanitizeArticleHtml.js` | Runtime | — | — |
| `shared/ui/AnimatedViewToggle.jsx` | JSX/TSX | — | Yes |
| `shared/ui/BorderGlow/BorderGlow.jsx` | JSX/TSX | — | Yes |
| `shared/ui/CircularText/CircularText.jsx` | JSX/TSX | — | Yes |
| `shared/ui/Dock.jsx` | JSX/TSX | — | Yes |
| `shared/ui/MetallicPaint/MetallicPaint.jsx` | JSX/TSX | — | Yes |
| `shared/ui/VideoText.jsx` | JSX/TSX | — | Yes |
| `shared/ui/cn.js` | Runtime | — | — |
| `shared/vite/serveSiteFonts.js` | Runtime | — | — |
| `shared/zalo/zaloLink.js` | Runtime | — | Yes |
| `src/app-entry.js` | Runtime | — | — |
| `src/card.js` | Runtime | Yes | — |
| `src/home/mount.jsx` | JSX/TSX | — | — |
| `src/main.js` | Runtime | — | Yes |
| `src/nav/mount.jsx` | JSX/TSX | — | — |
| `src/script.js` | Runtime | Yes | Yes |
| `structure-app/src/App.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/CircularText/CircularText.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/DepartmentsGrid.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/DeptIcon.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/DocumentSearch.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/EmployeeLanyard.jsx` | JSX/TSX | Yes | Yes |
| `structure-app/src/components/Footer.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/Header.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/LanguageSwitcher.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/LegalDocuments.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/MagicBento/MagicBento.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/MetallicPaint/MetallicPaint.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/OrgChart.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/PageShell.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/ProfileCard/ProfileCard.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/ProfileModal.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/employeeLanyardConfig.js` | Runtime | — | — |
| `structure-app/src/components/magicui/AnimatedBeam.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/magicui/DiaTextReveal.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/magicui/InteractiveGridPattern.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/magicui/LightRays.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/magicui/RippleButton.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/magicui/WordRotate.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/components/motion-primitives/AnimatedGroup.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/motion-primitives/TextShimmerWave.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/motion-primitives/TransitionPanel.jsx` | JSX/TSX | — | — |
| `structure-app/src/components/reactbits/Lanyard/Lanyard.jsx` | JSX/TSX | — | Yes |
| `structure-app/src/contexts/InteractiveBackgroundContext.jsx` | JSX/TSX | — | — |
| `structure-app/src/data/departments.js` | Runtime | — | — |
| `structure-app/src/data/documents.js` | Runtime | — | — |
| `structure-app/src/data/orgProfiles.js` | Runtime | — | — |
| `structure-app/src/hooks/useClickOutside.js` | Runtime | — | Yes |
| `structure-app/src/hooks/useMainSite.js` | Runtime | — | — |
| `structure-app/src/lib/detectLanguage.js` | Runtime | — | — |
| `structure-app/src/lib/i18n.js` | Runtime | Yes | — |
| `structure-app/src/lib/siteOrigin.js` | Runtime | — | — |
| `structure-app/src/main.jsx` | JSX/TSX | Yes | — |
| `structure-app/src/routes/StructurePage.jsx` | JSX/TSX | Yes | Yes |
