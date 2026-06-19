import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ArticleCard from '../components/ArticleCard'
import CategoryFilter from '../components/CategoryFilter'
import { fetchPublishedArticles } from '../lib/articles'
import { formatDate, plainExcerpt } from '../lib/helpers'
import { isCategory, categoryColor } from '../lib/categories'
import './NewsGrid.css'

function FeaturedCard({ article }) {
  const { i18n, t } = useTranslation()
  const author = article.author || {}
  const byline = article.author_name || author.display_name || author.full_name || 'ICUE'
  const cat = isCategory(article.category) && article.category !== 'general' ? article.category : null
  return (
    <Link to={`/article/${article.slug}`} className="news-featured">
      <div className="news-featured__media">
        {article.cover_image_url ? (
          <img src={article.cover_image_url} alt="" decoding="async" className="news-featured__img" />
        ) : (
          <span className="news-featured__placeholder">ICUE</span>
        )}
      </div>
      <div className="news-featured__body">
        <div className="news-featured__topline">
          {cat && (
            <span className="news-tag" style={{ '--cat-color': categoryColor(cat) }}>
              {t(`categories.${cat}`)}
            </span>
          )}
          <time className="news-featured__date">
            {formatDate(article.published_at || article.article_date, i18n.resolvedLanguage)}
          </time>
        </div>
        <h2 className="news-featured__title">{article.title}</h2>
        <p className="news-featured__excerpt">{article.subtitle || plainExcerpt(article.content_html, 220)}</p>
        <span className="news-featured__meta">
          {byline} · {article.read_minutes || 1} {t('news.minRead')}
        </span>
      </div>
    </Link>
  )
}

export default function NewsGrid() {
  const { t } = useTranslation()
  const [articles, setArticles] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [activeCat, setActiveCat] = useState('all')

  useEffect(() => {
    let active = true
    fetchPublishedArticles({ limit: 60 })
      .then((data) => { if (active) { setArticles(data); setState('ready') } })
      .catch(() => active && setState('error'))
    return () => { active = false }
  }, [])

  // Show every category in the filter bar — not just ones with articles.
  const filtered = useMemo(() => {
    if (activeCat === 'all') return articles
    return articles.filter((a) => (isCategory(a.category) ? a.category : 'general') === activeCat)
  }, [articles, activeCat])

  const featured = filtered[0]
  const restList = useMemo(() => filtered.slice(1), [filtered])

  return (
    <div className="news-page">
      <header className="news-hero">
        <div className="icue-container news-hero__inner">
          <div className="news-hero__text">
            <p className="news-hero__eyebrow">{t('instituteName')}</p>
            <h1 className="news-hero__title">{t('news.title')}</h1>
            <p className="news-hero__subtitle">{t('news.subtitle')}</p>
          </div>
          <nav className="news-hero__social" aria-label="Social media">
            <a href="https://www.youtube.com/channel/UCy6xFBIvD8_i0gOJbyXE8xg" target="_blank" rel="noopener noreferrer" aria-label="YouTube" title="YouTube">
              <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true">
                <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.6 3.9 12 3.9 12 3.9s-7.6 0-9.4.5A3 3 0 0 0 .5 6.5 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.5zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=100075982245583" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9.2 24V13H6V8.8h3.2V6.3C9.2 3.1 11.1 1.4 14 1.4c1.4 0 2.6.1 2.9.15V5h-2c-1.6 0-1.9.75-1.9 1.85V8.8h3.8L14.2 13h-3.2v11z" />
              </svg>
            </a>
            <a href="https://zalo.me/84768748391" target="_blank" rel="noopener noreferrer" aria-label="Zalo" title="Zalo">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 3C6.9 3 2.8 6.5 2.8 10.8c0 2.4 1.3 4.6 3.3 6-.2.9-.8 2.1-1.5 2.9-.3.3 0 .7.4.6 1.7-.4 3-1 3.9-1.6 1 .3 2 .4 3.1.4 5.1 0 9.2-3.5 9.2-7.8S17.1 3 12 3z" />
                <path fill="var(--icue-ink)" d="M8.7 8.9h6.6v1.3l-4 4.6h4.1v1.4H8.5v-1.3l4-4.6H8.7z" />
              </svg>
            </a>
          </nav>
        </div>
      </header>

      {state === 'ready' && (
        <CategoryFilter value={activeCat} onChange={setActiveCat} />
      )}

      <div className="icue-container">
        {state === 'loading' && (
          <div className="news-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="news-skeleton" aria-hidden />
            ))}
          </div>
        )}

        {(state === 'ready' && filtered.length === 0) && <p className="news-empty">{t('news.empty')}</p>}
        {(state === 'error') && <p className="news-empty">{t('news.empty')}</p>}

        {state === 'ready' && featured && <FeaturedCard article={featured} />}

        {state === 'ready' && restList.length > 0 && (
          <div className="news-grid">
            {restList.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
