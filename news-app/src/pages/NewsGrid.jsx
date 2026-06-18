import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ArticleCard from '../components/ArticleCard'
import { fetchPublishedArticles } from '../lib/articles'
import { formatDate, plainExcerpt } from '../lib/helpers'
import './NewsGrid.css'

function FeaturedCard({ article }) {
  const { i18n, t } = useTranslation()
  const author = article.author || {}
  const byline = article.author_name || author.display_name || author.full_name || 'ICUE'
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
        <time className="news-featured__date">
          {formatDate(article.published_at || article.article_date, i18n.resolvedLanguage)}
        </time>
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

  useEffect(() => {
    let active = true
    fetchPublishedArticles({ limit: 30 })
      .then((data) => { if (active) { setArticles(data); setState('ready') } })
      .catch(() => active && setState('error'))
    return () => { active = false }
  }, [])

  const featured = articles[0]
  const restList = useMemo(() => articles.slice(1), [articles])

  return (
    <div className="news-page">
      <header className="news-hero">
        <div className="icue-container">
          <p className="news-hero__eyebrow">ICUE</p>
          <h1 className="news-hero__title">{t('news.title')}</h1>
          <p className="news-hero__subtitle">{t('news.subtitle')}</p>
        </div>
      </header>

      <div className="icue-container">
        {state === 'loading' && (
          <div className="news-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="news-skeleton" aria-hidden />
            ))}
          </div>
        )}

        {(state === 'ready' && articles.length === 0) && <p className="news-empty">{t('news.empty')}</p>}
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
