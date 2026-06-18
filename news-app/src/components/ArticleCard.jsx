import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatDate, plainExcerpt } from '../lib/helpers'
import './ArticleCard.css'

function ArticleCard({ article }) {
  const { t, i18n } = useTranslation()
  const author = article.author || {}
  const byline = article.author_name || author.display_name || author.full_name || 'ICUE'
  const excerpt = article.subtitle || plainExcerpt(article.content_html, 140)

  return (
    <article className="news-card">
      <Link to={`/article/${article.slug}`} className="news-card__media" aria-label={article.title}>
        {article.cover_image_url ? (
          <img
            src={article.cover_image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="news-card__img"
          />
        ) : (
          <span className="news-card__placeholder">ICUE</span>
        )}
      </Link>

      <div className="news-card__body">
        <time className="news-card__date" dateTime={article.published_at || article.article_date || ''}>
          {formatDate(article.published_at || article.article_date, i18n.resolvedLanguage)}
        </time>
        <h3 className="news-card__title">
          <Link to={`/article/${article.slug}`}>{article.title}</Link>
        </h3>
        {excerpt && <p className="news-card__excerpt">{excerpt}</p>}

        <div className="news-card__foot">
          <span className="news-card__author">
            {author.avatar_url ? (
              <img src={author.avatar_url} alt="" className="news-card__avatar" loading="lazy" />
            ) : (
              <span className="news-card__avatar news-card__avatar--fallback">
                {(author.display_name || author.full_name || '?').slice(0, 1).toUpperCase()}
              </span>
            )}
            <span>{byline}</span>
          </span>
          <span className="news-card__read">{article.read_minutes || 1} {t('news.minRead')}</span>
        </div>
      </div>
    </article>
  )
}

export default memo(ArticleCard)
