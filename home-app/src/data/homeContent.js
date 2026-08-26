import { articleUrl, projectCardUrl } from '../lib/siteLinks'
import { ROUTE_PATHS } from '../lib/routes'
import { newsroomUrl, withLocale } from '../../../shared/site-routes/mainSitePaths.js'

/**
 * Structure here, words in the locale files.
 *
 * Everything below — ids, images, hrefs, which section is `alt`, which cards
 * are image-only — is layout and does not change with language. The titles,
 * descriptions, link labels and alt text all come from `home.*` in
 * src/locales/, so a reader on the Korean or German page gets the whole home
 * page rather than a translated menu on top of Vietnamese copy.
 *
 * The card keys (`laoCai`, `auCoPark`, …) are the join between the two: rename
 * one here and the same key has to move in all five locale files.
 */
const SECTION_LAYOUT = [
  {
    id: 'home-past-projects',
    key: 'pastProjects',
    linkHref: ROUTE_PATHS.pastProjects,
    cards: [
      { key: 'laoCai', image: '/pastProjects/pp_1.webp', href: projectCardUrl(1) },
      { key: 'subdivision6b', image: '/pastProjects/pp_3.webp', href: projectCardUrl(3) },
      { key: 'dongYen', image: '/pastProjects/pp_5.jpg', href: projectCardUrl(5) },
    ],
  },
  {
    id: 'home-our-work',
    key: 'ourWork',
    alt: true,
    linkHref: ROUTE_PATHS.ourWork,
    cards: [
      { key: 'evaluation', image: '/work/ourWork_img1.webp', href: ROUTE_PATHS.ourWork },
      { key: 'survey', image: '/work/ourWork_img2.webp', href: ROUTE_PATHS.ourWork },
      { key: 'infrastructure', image: '/work/ourWork_img3.webp', href: ROUTE_PATHS.ourWork },
      { key: 'aerial', image: '/work/ourWork_img4.jpg', href: ROUTE_PATHS.ourWork },
    ],
  },
  {
    id: 'home-news',
    key: 'news',
    linkHref: newsroomUrl('vi'),
    cards: [
      { key: 'auCoPark', image: '/news/articles/Card_1.webp', href: articleUrl(1) },
      { key: 'conservationForum', image: '/news/articles/Card_2.webp', href: articleUrl(2) },
      { key: 'yagi', image: '/news/articles/Card_3.jpg', href: articleUrl(3) },
    ],
  },
  {
    // The photographs moved into recruitment-app/public/media/ when the page
    // became its own app: it builds to /recruitment with emptyOutDir, so
    // anything else sitting in that directory was deleted on every build.
    id: 'home-recruitment',
    key: 'recruitment',
    alt: true,
    linkHref: ROUTE_PATHS.recruitment,
    cards: [
      { key: 'culture', image: '/recruitment/media/office.webp', href: ROUTE_PATHS.recruitment, imageOnly: true },
      { key: 'growth', image: '/recruitment/media/event.webp', href: ROUTE_PATHS.recruitment, imageOnly: true },
      { key: 'impact', image: '/recruitment/media/survey.webp', href: ROUTE_PATHS.recruitment, imageOnly: true },
    ],
  },
]

export function buildHero(t, locale) {
  return {
    bannerLabel: t('home.hero.bannerLabel'),
    bannerHref: newsroomUrl(locale),
    title: t('home.hero.title'),
    subtitle: t('home.hero.subtitle'),
    ariaLabel: t('home.hero.ariaLabel'),
    actions: [
      { label: t('home.hero.actions.contact'), href: withLocale(ROUTE_PATHS.contact, locale), variant: 'primary' },
      { label: t('home.hero.actions.pastProjects'), href: withLocale(ROUTE_PATHS.pastProjects, locale), variant: 'ghost' },
    ],
  }
}

/*
 * Sections whose cards link to a standalone app, and therefore have to carry
 * the reader's locale. `ourWork` was alone here while /recruitment was a
 * Vietnamese-only page injected into this app; it renders all six languages of
 * its own now, so its three cards were handing over a bare path and leaving the
 * locale to whatever localStorage happened to hold. The news and past-project
 * cards are absent on purpose: they point at legacy `?id=` templates that have
 * no locale to carry.
 */
const LOCALIZED_CARD_SECTIONS = new Set(['ourWork', 'recruitment'])

export function buildHomeSections(t, locale) {
  return SECTION_LAYOUT.map((section) => ({
    id: section.id,
    alt: section.alt,
    linkHref: section.key === 'news'
      ? newsroomUrl(locale)
      : withLocale(section.linkHref, locale),
    title: t(`home.sections.${section.key}.title`),
    description: t(`home.sections.${section.key}.description`),
    linkLabel: t(`home.sections.${section.key}.linkLabel`),
    cards: section.cards.map((card) => ({
      image: card.image,
      href: LOCALIZED_CARD_SECTIONS.has(section.key) ? withLocale(card.href, locale) : card.href,
      imageOnly: card.imageOnly,
      title: t(`home.sections.${section.key}.cards.${card.key}.title`),
      description: t(`home.sections.${section.key}.cards.${card.key}.description`),
      imageAlt: t(`home.sections.${section.key}.cards.${card.key}.imageAlt`),
    })),
  }))
}

/** Stable across languages — the beam network only needs the shape. */
export const SECTION_COUNT = SECTION_LAYOUT.length
export const CARD_COUNTS = SECTION_LAYOUT.map((section) => section.cards.length)
