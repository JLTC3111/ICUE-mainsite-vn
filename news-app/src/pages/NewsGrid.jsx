import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import RotatingText from '../components/RotatingText'
import RetroGrid from '../components/RetroGrid'
import AnimatedShinyText from '../components/AnimatedShinyText'
import ArticleMasonry from '../components/ArticleMasonry'
import ArticleParallaxCarousel from '../components/ArticleParallaxCarousel'
import SocialGooeyNav from '../components/SocialGooeyNav'
import CategoryFilter from '../components/CategoryFilter'
import NewsroomThemeToggle from '../components/NewsroomThemeToggle'
import useMediaQuery from '../hooks/useMediaQuery'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'
import { usePerformanceProfile } from '../context/PerformanceProfileContext'
import { fetchPublishedArticles } from '../lib/articles'
import { isCategory } from '../lib/categories'
import {
  NEWSROOM_COMPACT_QUERY,
  NEWSROOM_DEFAULT_CATEGORY,
  NEWSROOM_INITIAL_VISIBLE,
  NEWSROOM_LOAD_MORE_STEP,
  NEWSROOM_COMPACT_INITIAL_VISIBLE,
  NEWSROOM_COMPACT_LOAD_MORE_STEP,
} from '../lib/newsroom'
import { searchArticles } from '../lib/searchArticles'
import './NewsGrid.css'

const DEFAULT_ROTATING_TAGS = ['LATEST NEWS', 'LEARNING & KNOWLEDGE', 'BUILD & EXPLORE']

export default function NewsGrid() {
  const { t } = useTranslation()
  const profile = usePerformanceProfile()
  const { reduceMotion, simplifyHero } = profile
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const [articles, setArticles] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [activeCat, setActiveCat] = useState(NEWSROOM_DEFAULT_CATEGORY)
  const isCompactLayout = useMediaQuery(NEWSROOM_COMPACT_QUERY)
  const initialVisible = isCompactLayout ? NEWSROOM_COMPACT_INITIAL_VISIBLE : NEWSROOM_INITIAL_VISIBLE
  const loadMoreStep = isCompactLayout ? NEWSROOM_COMPACT_LOAD_MORE_STEP : NEWSROOM_LOAD_MORE_STEP
  const [visibleCount, setVisibleCount] = useState(initialVisible)
  const { isDark } = useNewsroomTheme()

  useEffect(() => {
    let active = true
    fetchPublishedArticles({ limit: 120 })
      .then((data) => { if (active) { setArticles(data); setState('ready') } })
      .catch(() => active && setState('error'))
    return () => { active = false }
  }, [])

  const rotatingTags = useMemo(() => {
    const tags = t('hero.rotatingTags', { returnObjects: true })
    return Array.isArray(tags) ? tags : DEFAULT_ROTATING_TAGS
  }, [t])

  const heroTags = simplifyHero ? [rotatingTags[0] || DEFAULT_ROTATING_TAGS[0]] : rotatingTags

  const filtered = useMemo(() => {
    let list = articles
    if (activeCat !== 'all') {
      list = list.filter((a) => (isCategory(a.category) ? a.category : 'general') === activeCat)
    }
    return searchArticles(list, searchQuery)
  }, [articles, activeCat, searchQuery])

  useEffect(() => {
    setVisibleCount(initialVisible)
  }, [activeCat, searchQuery, initialVisible])

  const visibleArticles = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  )

  const hasMoreArticles = filtered.length > visibleArticles.length

  return (
    <div className={`news-page${isDark ? ' news-page--dark' : ''}`}>
      <header className="news-hero">
        <RetroGrid
          className="news-hero__grid"
          lineColor="rgba(255, 255, 255, 0.38)"
          opacity={0.78}
          reduceMotion={reduceMotion}
        />
        <div className="icue-container news-hero__inner">
          <div className="news-hero__text">
            <h1 className="news-hero__eyebrow">
              <AnimatedShinyText className="news-hero__institute" shimmerWidth={140}>
                {t('instituteName')}
              </AnimatedShinyText>
              {simplifyHero ? (
                <span className="news-hero__rotating">{heroTags[0]}</span>
              ) : (
                <RotatingText
                  texts={heroTags}
                  mainClassName="news-hero__rotating"
                  splitBy="words"
                  rotationInterval={3200}
                  staggerDuration={0.07}
                  staggerFrom="first"
                  auto={!reduceMotion}
                />
              )}
            </h1>
            <p className="news-hero__subtitle">{t('news.subtitle')}</p>
          </div>
          <div className="news-hero__actions">
            <NewsroomThemeToggle
              showCompactLabel
              className="animated-theme-toggler--hero news-hero__theme-toggle"
            />
            <SocialGooeyNav reduceMotion={reduceMotion || simplifyHero} />
          </div>
        </div>
      </header>

      {state === 'ready' && (
        <CategoryFilter value={activeCat} onChange={setActiveCat} />
      )}

      <div
        className={`icue-container${
          isCompactLayout ? ' icue-container--compact-gallery' : ' icue-container--bento-gallery'
        }`}
      >
        {state === 'loading' && (
          <div className="news-gallery-skeleton" aria-hidden />
        )}

        {(state === 'ready' && filtered.length === 0) && (
          <p className="news-empty">{searchQuery ? t('search.noResults') : t('news.empty')}</p>
        )}
        {(state === 'error') && <p className="news-empty">{t('news.empty')}</p>}

        {state === 'ready' && visibleArticles.length > 0 && (
          isCompactLayout ? (
            <ArticleParallaxCarousel articles={visibleArticles} profile={profile} />
          ) : (
            <ArticleMasonry articles={visibleArticles} profile={profile} />
          )
        )}

        {state === 'ready' && hasMoreArticles && (
          <div className="news-load-more">
            <p className="news-load-more__count">
              {t('news.showingCount', {
                shown: visibleArticles.length,
                total: filtered.length,
              })}
            </p>
            <button
              type="button"
              className="news-load-more__btn"
              onClick={() => setVisibleCount((count) => count + loadMoreStep)}
            >
              {t('news.loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
