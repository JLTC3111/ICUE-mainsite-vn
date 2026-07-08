import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import RotatingText from '../components/RotatingText'
import ArticleMasonry from '../components/ArticleMasonry'
import SocialGooeyNav from '../components/SocialGooeyNav'
import CategoryFilter from '../components/CategoryFilter'
import { fetchPublishedArticles } from '../lib/articles'
import { isCategory } from '../lib/categories'
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
  const [activeCat, setActiveCat] = useState('all')

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

  return (
    <div className="news-page">
      <header className="news-hero">
        <div className="icue-container news-hero__inner">
          <div className="news-hero__text">
            <h1 className="news-hero__eyebrow">
              <span className="news-hero__institute">{t('instituteName')}</span>
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

      <div className="icue-container">
        {state === 'loading' && (
          <div className="news-gallery-skeleton" aria-hidden />
        )}

        {(state === 'ready' && filtered.length === 0) && (
          <p className="news-empty">{searchQuery ? t('search.noResults') : t('news.empty')}</p>
        )}
        {(state === 'error') && <p className="news-empty">{t('news.empty')}</p>}

        {state === 'ready' && filtered.length > 0 && (
          <ArticleMasonry articles={filtered} reduceMotion={reduceMotion} />
        )}
      </div>
    </div>
  )
}
