import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Masonry from './Masonry'
import { formatDate, normalizeUnicode } from '../lib/helpers'
import { isCategory, categoryColor } from '../lib/categories'
import './ArticleMasonry.css'

const PLACEHOLDER_COVER = `${import.meta.env.BASE_URL}favicon.svg`

// React Bits demo uses a wide spread of logical heights (120–850) for visual variety.
const HEIGHT_PALETTE = [400, 250, 600, 260, 120, 850, 720, 200, 350, 300, 350, 240, 320, 290]

function hashSeed(value, index) {
  return (value || String(index)).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function masonryLayout(title, slug, index, total) {
  const seed = hashSeed(slug, index)
  const height = HEIGHT_PALETTE[seed % HEIGHT_PALETTE.length]
    + Math.min(Math.ceil((title?.length || 0) / 20) * 18, 120)

  // Wider tiles for small sets; occasional 2-column spans when the grid is dense.
  let colSpan = 1
  if (total <= 2) {
    colSpan = 2
  } else if (total === 3) {
    colSpan = [2, 1, 2][index % 3]
  } else if (seed % 9 === 0 || seed % 11 === 0) {
    colSpan = 2
  }

  return { height, colSpan }
}

export default function ArticleMasonry({ articles, reduceMotion = false }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const items = useMemo(
    () =>
      articles.map((article, index) => {
        const title = normalizeUnicode(article.title)
        const { height, colSpan } = masonryLayout(title, article.slug, index, articles.length)
        return {
          id: article.slug || article.id || String(index),
          slug: article.slug,
          img: article.cover_image_url || PLACEHOLDER_COVER,
          height,
          colSpan,
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
        heightScale={0.5}
        ease="power3.out"
        animateFrom="bottom"
        stagger={0.05}
        hoverScale={0.95}
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
