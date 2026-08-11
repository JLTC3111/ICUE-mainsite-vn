import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import WordRotate from '../components/WordRotate'
import { AnimatedShinyText } from '../components/magicui/AnimatedShinyText'
import CategoryFilter from '../components/CategoryFilter'
import ArticleViewCounter from '../components/ArticleViewCounter'
import AuthorLink from '../components/AuthorLink'
import TranslationLineSkeleton from '../components/TranslationSkeleton'
import useMediaQuery from '../hooks/useMediaQuery'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useMainSite } from '../hooks/useMainSite'
import { usePageResume } from '../hooks/usePageResume'
import {
  useArticlePreviewTranslation,
  useArticleTitleTranslations,
} from '../hooks/useArticleTitleTranslations'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'
import { usePerformanceProfile } from '../context/PerformanceProfileContext'
import { fetchPublishedArticles } from '../lib/articles'
import { categoryColor, isCategory } from '../lib/categories'
import { resolveArticleCoverComparison } from '../lib/mediaComparison'
import { formatDate, normalizeUnicode, resolveIntlLocale } from '../lib/helpers'
import {
  NEWSROOM_COMPACT_QUERY,
  NEWSROOM_COMPACT_INITIAL_VISIBLE,
  NEWSROOM_COMPACT_LOAD_MORE_STEP,
  NEWSROOM_DEFAULT_CATEGORY,
  NEWSROOM_INITIAL_VISIBLE,
  NEWSROOM_LOAD_MORE_STEP,
  NEWSROOM_SHOW_VIEW_COUNTS,
  NEWSROOM_TOP_COUNT,
} from '../lib/newsroom'
import { searchArticles } from '../lib/searchArticles'
import { resolveArticlePreviewText } from '../lib/translateUtils'
import './NewsGrid.css'

const DEFAULT_ROTATING_TAGS = ['LATEST NEWS', 'LEARNING & KNOWLEDGE', 'BUILD & EXPLORE']

function localDateTimeValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMastheadDate(value, locale) {
  try {
    return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(value)
  } catch {
    return ''
  }
}

function LocalizedCalendarDate({ locale, t }) {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    let timeoutId

    const scheduleNextDay = () => {
      window.clearTimeout(timeoutId)
      const now = new Date()
      setToday(now)
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timeoutId = window.setTimeout(scheduleNextDay, Math.max(1000, nextDay.getTime() - now.getTime() + 1000))
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') scheduleNextDay()
    }

    scheduleNextDay()
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  return (
    <time
      className="newsroom-masthead__calendar"
      dateTime={localDateTimeValue(today)}
    >
      <span className="newsroom-masthead__calendar-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6.75 3v3M17.25 3v3M3.75 9h16.5" strokeLinecap="round" />
          <rect x="3.75" y="4.5" width="16.5" height="16" rx="3" />
          <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" strokeLinecap="round" strokeWidth="2.4" />
        </svg>
      </span>
      <span className="newsroom-masthead__calendar-date">
        <span className="newsroom-masthead__calendar-label">{t('newsroom.today')}</span>
        <span>{formatMastheadDate(today, locale)}</span>
      </span>
    </time>
  )
}

/**
 * One article → one card. `title` is empty while a translation is in flight so
 * the headline can hold its space with a skeleton instead of flashing the
 * Vietnamese original and then swapping.
 */
function buildCard(article, {
  titles,
  subtitles,
  isTitlePending,
  fallbackByline,
  featuredArticleId,
  featuredTranslation,
  featuredTranslationPending,
}) {
  const author = article.author || {}
  const isFeatured = article.id === featuredArticleId
  const titlePending = isTitlePending(article.id) || (isFeatured && featuredTranslationPending)
  const featuredText = isFeatured
    ? resolveArticlePreviewText(article, featuredTranslation, featuredTranslationPending)
    : null
  const comparison = resolveArticleCoverComparison(article)

  return {
    id: article.id,
    slug: article.slug,
    title: normalizeUnicode(
      isFeatured
        ? featuredText.title
        : titlePending ? '' : (titles[article.id] || article.title),
    ),
    titlePending,
    subtitle: normalizeUnicode(
      isFeatured
        ? featuredText.subtitle
        : titlePending ? '' : (subtitles[article.id] || article.subtitle || ''),
    ),
    cover: article.cover_image_url || comparison?.before?.url || '',
    category: isCategory(article.category) ? article.category : 'general',
    date: article.published_at || article.article_date || '',
    readMinutes: Number(article.read_minutes) || 0,
    byline: article.author_name || author.display_name || author.full_name || fallbackByline,
    viewCount: article.view_count ?? 0,
  }
}

function CategoryTag({ category, t, className = 'news-tag' }) {
  return (
    <span className={className} style={{ '--cat-color': categoryColor(category) }}>
      {t(`categories.${category}`)}
    </span>
  )
}

/**
 * Vietnamese headlines run long and the cards are sized to grow, so nothing
 * here clamps or ellipsises.
 */
function Headline({ card, as: Tag, className, skeletonLines = 2, shinyOnHover = false }) {
  if (card.titlePending) {
    return (
      <Tag className={className}>
        <TranslationLineSkeleton lines={skeletonLines} />
      </Tag>
    )
  }
  return (
    <Tag className={`${className} translation-reveal`}>
      {shinyOnHover ? (
        <AnimatedShinyText className="news-lead__title-shiny" shimmerWidth={420}>
          {card.title}
        </AnimatedShinyText>
      ) : card.title}
    </Tag>
  )
}

function StoryMeta({ card, locale, t }) {
  return (
    <div className="news-meta">
      <AuthorLink name={card.byline} className="news-meta__byline" />
      {card.date && (
        <>
          <span className="news-meta__dot" aria-hidden>·</span>
          <time dateTime={card.date}>{formatDate(card.date, locale)}</time>
        </>
      )}
      {card.readMinutes > 0 && (
        <>
          <span className="news-meta__dot" aria-hidden>·</span>
          <span>{card.readMinutes} {t('news.minRead')}</span>
        </>
      )}
      {NEWSROOM_SHOW_VIEW_COUNTS && <ArticleViewCounter count={card.viewCount} compact />}
    </div>
  )
}

function LeadStory({ card, t }) {
  return (
    <article className={`news-lead${card.cover ? '' : ' news-lead--no-image'}`}>
      <Link
        to={`/article/${card.slug}`}
        className="news-lead__link"
        aria-label={card.title || undefined}
      >
        <div className="news-lead__body">
          <div className="news-lead__kicker">
            <span className="news-lead__featured">{t('newsroom.featuredReporting')}</span>
          </div>
          <Headline card={card} as="h2" className="news-lead__title" shinyOnHover />
          {card.subtitle && <p className="news-lead__subtitle">{card.subtitle}</p>}
        </div>
        {card.cover && (
          <div className="news-lead__media">
            <img src={card.cover} alt="" decoding="async" />
          </div>
        )}
      </Link>
    </article>
  )
}

function StoryCard({ card, locale, t }) {
  return (
    <article className={`news-card${card.cover ? '' : ' news-card--no-image'}`}>
      <div className="news-card__link">
        {card.cover && (
          <Link
            to={`/article/${card.slug}`}
            className="news-card__media-link"
            aria-label={card.title || undefined}
          >
            <div className="news-card__media">
              <img src={card.cover} alt="" loading="lazy" decoding="async" />
            </div>
          </Link>
        )}
        <div className="news-card__body">
          <CategoryTag category={card.category} t={t} className="news-tag news-tag--sm" />
          <Link to={`/article/${card.slug}`} className="news-card__headline-link">
            <Headline card={card} as="h3" className="news-card__title" />
          </Link>
          {card.subtitle && <p className="news-card__subtitle">{card.subtitle}</p>}
          <StoryMeta card={card} locale={locale} t={t} />
        </div>
      </div>
    </article>
  )
}

function StoryRow({ card, locale, t }) {
  return (
    <article className="news-row">
      <Link
        to={`/article/${card.slug}`}
        className="news-row__link"
        aria-label={card.title || undefined}
      >
        {card.cover && (
          <div className="news-row__thumb">
            <img src={card.cover} alt="" loading="lazy" decoding="async" />
          </div>
        )}
        <div className="news-row__copy">
          <div className="news-row__kicker">{t(`categories.${card.category}`)}</div>
          <Headline card={card} as="h3" className="news-row__title" skeletonLines={1} />
          {card.subtitle && <p className="news-row__subtitle">{card.subtitle}</p>}
          <div className="news-row__meta">
            {card.date ? formatDate(card.date, locale) : ''}
            {card.readMinutes > 0 ? ` · ${card.readMinutes} ${t('news.minRead')}` : ''}
          </div>
        </div>
      </Link>
    </article>
  )
}

function InstituteCallout({ links, t }) {
  return (
    <aside className="news-institute" aria-labelledby="news-institute-title">
      <div className="news-institute__intro">
        <p className="news-institute__eyebrow">{t('newsroom.fromInstitute')}</p>
        <h2 className="news-institute__title" id="news-institute-title">
          {t('newsroom.instituteCalloutTitle')}
        </h2>
        <p className="news-institute__copy">{t('newsroom.instituteCalloutCopy')}</p>
      </div>
      <nav className="news-institute__links" aria-label={t('newsroom.fromInstitute')}>
        <a href={links.work}>{t('newsroom.instituteReports')}<span aria-hidden="true">↗</span></a>
        <a href={links.events}>{t('newsroom.instituteEvents')}<span aria-hidden="true">↗</span></a>
        <a href={links.contact}>{t('newsroom.instituteNewsletter')}<span aria-hidden="true">↗</span></a>
      </nav>
    </aside>
  )
}

function EditorialFooter({ archiveHref, t }) {
  return (
    <footer className="news-editorial-footer">
      <a className="news-editorial-footer__mark" href="#newsroom-top">
        ICUE <span>/</span> {t('nav.news')}
      </a>
      <p className="news-editorial-footer__motto">{t('newsroom.motto')}</p>
      <a href={archiveHref}>{t('nav.archive')} <span aria-hidden="true">→</span></a>
    </footer>
  )
}

export default function NewsGrid() {
  useDocumentTitle()
  const { t, i18n } = useTranslation()
  const profile = usePerformanceProfile()
  const { reduceMotion, simplifyHero } = profile
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const [articles, setArticles] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [activeCat, setActiveCat] = useState(NEWSROOM_DEFAULT_CATEGORY)
  const isCompactLayout = useMediaQuery(NEWSROOM_COMPACT_QUERY)
  const initialVisible = isCompactLayout ? NEWSROOM_COMPACT_INITIAL_VISIBLE : NEWSROOM_INITIAL_VISIBLE
  const loadMoreStep = isCompactLayout ? NEWSROOM_COMPACT_LOAD_MORE_STEP : NEWSROOM_LOAD_MORE_STEP
  const visibilityKey = `${activeCat}\u0000${searchQuery}\u0000${initialVisible}`
  const [visibility, setVisibility] = useState({ key: visibilityKey, count: initialVisible })
  const visibleCount = visibility.key === visibilityKey ? visibility.count : initialVisible
  const { isDark } = useNewsroomTheme()
  const { archiveLink, hashLink } = useMainSite()
  const requestIdRef = useRef(0)
  const locale = i18n.resolvedLanguage

  const loadArticles = useCallback(({ background = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    return fetchPublishedArticles({ limit: 120 })
      .then((data) => {
        if (requestId !== requestIdRef.current) return
        setArticles(data)
        setState('ready')
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return
        // A background refresh is best-effort. Keep a successfully rendered
        // feed visible if the device has not regained a stable connection yet.
        setState((current) => (background && current === 'ready' ? current : 'error'))
      })
  }, [])

  useEffect(() => {
    loadArticles()
    return () => { requestIdRef.current += 1 }
  }, [loadArticles])

  const refreshArticlesOnResume = useCallback(() => {
    loadArticles({ background: true })
  }, [loadArticles])
  usePageResume(refreshArticlesOnResume)

  const rotatingTags = useMemo(() => {
    const tags = t('hero.rotatingTags', { returnObjects: true })
    return Array.isArray(tags) && tags.length ? tags : DEFAULT_ROTATING_TAGS
  }, [t])

  const heroTags = simplifyHero ? [rotatingTags[0]] : rotatingTags

  const filtered = useMemo(() => {
    let list = articles
    if (activeCat !== 'all') {
      list = list.filter((a) => (isCategory(a.category) ? a.category : 'general') === activeCat)
    }
    return searchArticles(list, searchQuery)
  }, [articles, activeCat, searchQuery])

  const visibleArticles = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  )

  const { titles, subtitles, isTitlePending } = useArticleTitleTranslations(visibleArticles, locale)
  const featuredArticle = visibleArticles[0] || null
  const {
    translation: featuredTranslation,
    pending: featuredTranslationPending,
  } = useArticlePreviewTranslation(featuredArticle, locale)

  const fallbackByline = t('brand')
  const cards = useMemo(
    () => visibleArticles.map((article) => buildCard(article, {
      titles,
      subtitles,
      isTitlePending,
      fallbackByline,
      featuredArticleId: featuredArticle?.id,
      featuredTranslation,
      featuredTranslationPending,
    })),
    [
      visibleArticles,
      titles,
      subtitles,
      isTitlePending,
      fallbackByline,
      featuredArticle?.id,
      featuredTranslation,
      featuredTranslationPending,
    ],
  )

  const latestStart = 1 + NEWSROOM_TOP_COUNT
  const lead = cards[0] || null
  const topStories = cards.slice(1, latestStart)
  const latestStories = cards.slice(latestStart)

  const instituteLinks = {
    work: hashLink('ourWork'),
    events: hashLink('communityActivities'),
    contact: hashLink('Contact'),
  }

  const lastUpdated = articles[0]?.published_at || articles[0]?.article_date || ''

  const hasMoreArticles = filtered.length > visibleArticles.length
  const hasSearchFilter = Boolean(searchQuery.trim())
  const hasCategoryFilter = activeCat !== NEWSROOM_DEFAULT_CATEGORY
  const hasActiveFilters = hasSearchFilter || hasCategoryFilter

  const clearSearchFilter = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('q')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  const clearAllFilters = useCallback(() => {
    setActiveCat(NEWSROOM_DEFAULT_CATEGORY)
    if (hasSearchFilter) clearSearchFilter()
  }, [clearSearchFilter, hasSearchFilter])

  return (
    <div id="newsroom-top" className={`news-page${isDark ? ' news-page--dark' : ''}`}>
      <header className="newsroom-masthead">
        <div className="icue-container icue-container--newsroom newsroom-masthead__inner">
          <div className="newsroom-masthead__text">
            <h1 className="newsroom-masthead__title">
              <span className="newsroom-masthead__name">{t('nav.news')}</span>
              <span className="newsroom-masthead__divider" aria-hidden="true" />
              {simplifyHero ? (
                <span className="newsroom-masthead__rotating">{heroTags[0]}</span>
              ) : (
                <WordRotate
                  words={reduceMotion ? [heroTags[0]] : heroTags}
                  className="newsroom-masthead__rotating"
                  duration={3200}
                />
              )}
            </h1>
            <p className="newsroom-masthead__standfirst">{t('news.subtitle')}</p>
          </div>

          <div className="newsroom-masthead__aside">
            <LocalizedCalendarDate locale={locale} t={t} />
            {lastUpdated && (
              <p className="newsroom-masthead__updated">
                <span>{t('newsroom.lastUpdated')}</span> {formatDate(lastUpdated, locale)}
              </p>
            )}
          </div>
        </div>
      </header>

      {state === 'ready' && (
        <CategoryFilter
          value={activeCat}
          onChange={setActiveCat}
          tagline={t('newsroom.motto')}
        />
      )}

      {state === 'ready' && hasActiveFilters && (
        <div className="icue-container icue-container--newsroom news-results-bar">
          <div className="news-results-bar__surface has-filters">
            <p
              className="news-results-bar__count"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {t('search.resultsCount', {
                shown: visibleArticles.length,
                total: filtered.length,
              })}
            </p>

            <div
              className="news-results-bar__filters"
              role="group"
              aria-label={t('search.activeFilters')}
            >
              {hasSearchFilter && (
                <button
                  type="button"
                  className="news-filter-chip"
                  onClick={clearSearchFilter}
                  aria-label={t('search.clearSearch', { query: searchQuery.trim() })}
                >
                  <span>{t('search.activeSearch', { query: searchQuery.trim() })}</span>
                  <span className="news-filter-chip__remove" aria-hidden="true">×</span>
                </button>
              )}
              {hasCategoryFilter && (
                <button
                  type="button"
                  className="news-filter-chip news-filter-chip--category"
                  onClick={() => setActiveCat(NEWSROOM_DEFAULT_CATEGORY)}
                  aria-label={t('search.clearCategory', {
                    category: t(`categories.${activeCat}`),
                  })}
                >
                  <span>{t('search.activeCategory', {
                    category: t(`categories.${activeCat}`),
                  })}</span>
                  <span className="news-filter-chip__remove" aria-hidden="true">×</span>
                </button>
              )}
              {hasSearchFilter && hasCategoryFilter && (
                <button
                  type="button"
                  className="news-results-bar__clear"
                  onClick={clearAllFilters}
                >
                  {t('search.clearAll')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="icue-container icue-container--newsroom news-front">
        {state === 'loading' && (
          <div className="news-gallery-skeleton" aria-hidden />
        )}

        {(state === 'ready' && filtered.length === 0) && (
          <p className="news-empty">
            {hasActiveFilters ? t('search.noFilteredResults') : t('news.empty')}
          </p>
        )}
        {(state === 'error') && <p className="news-empty">{t('news.empty')}</p>}

        {state === 'ready' && lead && (
          <LeadStory card={lead} t={t} />
        )}

        {state === 'ready' && topStories.length > 0 && (
          <section className="news-band news-band--top" aria-labelledby="news-band-top">
            <h2 className="news-band__heading news-band__heading--rule" id="news-band-top">
              {t('newsroom.topStories')}
            </h2>
            <div className="news-band__grid">
              {topStories.map((card) => (
                <StoryCard key={card.id} card={card} locale={locale} t={t} />
              ))}
            </div>
          </section>
        )}

        {state === 'ready' && latestStories.length > 0 && (
          <section className="news-band news-band--latest" aria-labelledby="news-band-latest">
            <h2 className="news-band__heading" id="news-band-latest">
              {t('newsroom.latest')}
            </h2>
            <div className="news-band__rows">
              {latestStories.map((card) => (
                <StoryRow key={card.id} card={card} locale={locale} t={t} />
              ))}
            </div>
          </section>
        )}

        {state === 'ready' && hasMoreArticles && (
          <div className="news-load-more">
            <button
              type="button"
              className="news-load-more__btn"
              onClick={() => setVisibility((current) => ({
                key: visibilityKey,
                count: (current.key === visibilityKey ? current.count : initialVisible) + loadMoreStep,
              }))}
            >
              {t('news.loadMore')}
            </button>
          </div>
        )}

        {state === 'ready' && (
          <InstituteCallout links={instituteLinks} t={t} />
        )}

        <EditorialFooter archiveHref={archiveLink()} t={t} />
      </div>
    </div>
  )
}
