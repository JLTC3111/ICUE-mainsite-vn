import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BentoCard, BentoGrid } from './BentoGrid'
import ArticleViewCounter from './ArticleViewCounter'
import { formatDate, normalizeUnicode } from '../lib/helpers'
import { isCategory, categoryColor } from '../lib/categories'
import './ArticleMasonry.css'

const PLACEHOLDER_COVER = `${import.meta.env.BASE_URL}favicon.svg`

const BENTO_SPANS = [
  { cols: 1, rows: 1 },
  { cols: 2, rows: 1 },
  { cols: 1, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 2, rows: 2 },
  { cols: 1, rows: 1 },
]

function hashSeed(value, index) {
  return (value || String(index)).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function bentoLayout(slug, index, total) {
  const seed = hashSeed(slug, index)

  if (total <= 2) {
    return { cols: 2, rows: 1 }
  }

  if (total === 3) {
    return [
      { cols: 2, rows: 2 },
      { cols: 1, rows: 1 },
      { cols: 1, rows: 2 },
    ][index % 3]
  }

  return BENTO_SPANS[seed % BENTO_SPANS.length]
}

export default function ArticleMasonry({ articles, reduceMotion = false }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const items = useMemo(
    () =>
      articles.map((article, index) => {
        const title = normalizeUnicode(article.title)
        const { cols, rows } = bentoLayout(article.slug, index, articles.length)
        return {
          id: article.slug || article.id || String(index),
          slug: article.slug,
          img: article.cover_image_url || PLACEHOLDER_COVER,
          spanCols: cols,
          spanRows: rows,
          title,
          category: isCategory(article.category) && article.category !== 'general' ? article.category : null,
          date: article.published_at || article.article_date || '',
          viewCount: article.view_count ?? 0,
        }
      }),
    [articles],
  )

  const handleItemClick = (item) => {
    if (item.slug) navigate(`/article/${item.slug}`)
  }

  if (!items.length) return null

  return (
    <section className="article-bento" aria-label={t('gallery.ariaLabel')}>
      <BentoGrid>
        {items.map((item, index) => (
          <BentoCard
            key={item.id}
            name={item.title}
            spanCols={item.spanCols}
            spanRows={item.spanRows}
            animate={!reduceMotion}
            animationDelay={reduceMotion ? 0 : index * 60}
            cta={t('gallery.readArticle')}
            onClick={() => handleItemClick(item)}
            description={(
              <>
                {item.category && (
                  <span className="news-tag" style={{ '--cat-color': categoryColor(item.category) }}>
                    {t(`categories.${item.category}`)}
                  </span>
                )}
                {item.date && (
                  <time className="bento-card__date" dateTime={item.date}>
                    {formatDate(item.date, i18n.resolvedLanguage)}
                  </time>
                )}
                <ArticleViewCounter count={item.viewCount} compact tone="dark" />
              </>
            )}
            background={
              item.img && item.img !== PLACEHOLDER_COVER ? (
                <img src={item.img} alt="" className="bento-card__img" loading="lazy" decoding="async" />
              ) : (
                <div className="bento-card__placeholder">ICUE</div>
              )
            }
          />
        ))}
      </BentoGrid>
    </section>
  )
}
