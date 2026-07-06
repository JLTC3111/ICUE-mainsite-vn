import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Masonry from './Masonry'
import { formatDate, normalizeUnicode } from '../lib/helpers'
import { isCategory, categoryColor } from '../lib/categories'
import './ArticleMasonry.css'

const PLACEHOLDER_COVER = `${import.meta.env.BASE_URL}favicon.svg`

function masonryHeight(title, slug, index) {
  const seed = (slug || String(index)).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const lengthBonus = Math.min(Math.ceil((title?.length || 0) / 16) * 36, 180)
  return 560 + (seed % 160) + lengthBonus
}

export default function ArticleMasonry({ articles, reduceMotion = false }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const items = useMemo(
    () =>
      articles.map((article, index) => {
        const title = normalizeUnicode(article.title)
        return {
          id: article.slug || article.id || String(index),
          slug: article.slug,
          img: article.cover_image_url || PLACEHOLDER_COVER,
          height: masonryHeight(title, article.slug, index),
          title,
          category: isCategory(article.category) && article.category !== 'general' ? article.category : null,
          date: article.published_at || article.article_date || '',
        }
      }),
    [articles],
  )

  const handleItemClick = (item) => {
    if (item.slug) navigate(`/article/${item.slug}`)
  }

  if (!items.length) return null

  return (
    <section className="article-masonry" aria-label={t('gallery.ariaLabel')}>
      <Masonry
        items={items}
        reduceMotion={reduceMotion}
        adjustHeight
        heightScale={0.82}
        blurToFocus={!reduceMotion}
        scaleOnHover={!reduceMotion}
        onItemClick={handleItemClick}
        renderItem={(item) => (
          <article className="article-masonry__card">
            {item.img && item.img !== PLACEHOLDER_COVER ? (
              <img src={item.img} alt="" className="article-masonry__img" loading="lazy" decoding="async" />
            ) : (
              <div className="article-masonry__placeholder">ICUE</div>
            )}
            <div className="article-masonry__overlay">
              <div className="article-masonry__meta">
                {item.category && (
                  <span className="news-tag" style={{ '--cat-color': categoryColor(item.category) }}>
                    {t(`categories.${item.category}`)}
                  </span>
                )}
                {item.date && (
                  <time className="article-masonry__date" dateTime={item.date}>
                    {formatDate(item.date, i18n.resolvedLanguage)}
                  </time>
                )}
              </div>
              <h2 className="article-masonry__title">{item.title}</h2>
            </div>
          </article>
        )}
      />
    </section>
  )
}
