import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import RotatingText from '../components/RotatingText'
import RetroGrid from '../components/RetroGrid'
import AnimatedShinyText from '../components/AnimatedShinyText'
import ArticleMasonry from '../components/ArticleMasonry'
import ArticleIosPicker from '../components/ArticleIosPicker'
import SocialGooeyNav from '../components/SocialGooeyNav'
import CategoryFilter from '../components/CategoryFilter'
import useMediaQuery from '../hooks/useMediaQuery'
import { fetchPublishedArticles } from '../lib/articles'
import { isCategory } from '../lib/categories'
import {
  NEWSROOM_COMPACT_QUERY,
  NEWSROOM_DEFAULT_CATEGORY,
  NEWSROOM_INITIAL_VISIBLE,
  NEWSROOM_LOAD_MORE_STEP,
} from '../lib/newsroom'
import { searchArticles } from '../lib/searchArticles'
import './NewsGrid.css'

const DEFAULT_ROTATING_TAGS = ['LATEST NEWS', 'LEARNING & KNOWLEDGE', 'BUILD & EXPLORE']

export default function NewsGrid() {
  const { t } = useTranslation()
  const [reduceMotion, setReduceMotion] = useState(false)
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const [articles, setArticles] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [activeCat, setActiveCat] = useState(NEWSROOM_DEFAULT_CATEGORY)
  const [visibleCount, setVisibleCount] = useState(NEWSROOM_INITIAL_VISIBLE)
  const isCompactLayout = useMediaQuery(NEWSROOM_COMPACT_QUERY)

  useEffect(() => {
    let active = true
    fetchPublishedArticles({ limit: 120 })
      .then((data) => { if (active) { setArticles(data); setState('ready') } })
      .catch(() => active && setState('error'))
    return () => { active = false }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const rotatingTags = useMemo(() => {
    const tags = t('hero.rotatingTags', { returnObjects: true })
    return Array.isArray(tags) ? tags : DEFAULT_ROTATING_TAGS
  }, [t])

  const filtered = useMemo(() => {
    let list = articles
    if (activeCat !== 'all') {
      list = list.filter((a) => (isCategory(a.category) ? a.category : 'general') === activeCat)
    }
    return searchArticles(list, searchQuery)
  }, [articles, activeCat, searchQuery])

  useEffect(() => {
    setVisibleCount(NEWSROOM_INITIAL_VISIBLE)
  }, [activeCat, searchQuery])

  const visibleArticles = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  )

  const hasMoreArticles = filtered.length > visibleArticles.length

  return (
    <div className="news-page">
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
              <RotatingText
                texts={rotatingTags}
                mainClassName="news-hero__rotating"
                splitBy="words"
                rotationInterval={3200}
                staggerDuration={0.07}
                staggerFrom="first"
                auto={!reduceMotion}
              />
            </h1>
            <p className="news-hero__subtitle">{t('news.subtitle')}</p>
          </div>
          <SocialGooeyNav reduceMotion={reduceMotion} />
        </div>
      </header>

      {state === 'ready' && (
        <CategoryFilter value={activeCat} onChange={setActiveCat} />
      )}

      <div className={`icue-container${isCompactLayout ? ' icue-container--compact-gallery' : ''}`}>
        {state === 'loading' && (
          <div className="news-gallery-skeleton" aria-hidden />
        )}

        {(state === 'ready' && filtered.length === 0) && (
          <p className="news-empty">{searchQuery ? t('search.noResults') : t('news.empty')}</p>
        )}
        {(state === 'error') && <p className="news-empty">{t('news.empty')}</p>}

        {state === 'ready' && visibleArticles.length > 0 && (
          isCompactLayout ? (
            <ArticleIosPicker articles={visibleArticles} reduceMotion={reduceMotion} />
          ) : (
            <ArticleMasonry articles={visibleArticles} reduceMotion={reduceMotion} />
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
              onClick={() => setVisibleCount((count) => count + NEWSROOM_LOAD_MORE_STEP)}
            >
              {t('news.loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
