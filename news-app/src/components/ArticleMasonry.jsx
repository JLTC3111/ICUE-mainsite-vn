import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BentoArticleGrid from './BentoArticleGrid'
import BentoYCarousel from './BentoYCarousel'
import useMediaQuery from '../hooks/useMediaQuery'
import { buildBentoItems } from '../lib/bentoArticles'
import {
  NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE,
  NEWSROOM_BENTO_CAROUSEL_QUERY,
} from '../lib/newsroom'
import { normalizeUnicode } from '../lib/helpers'
import './ArticleMasonry.css'

export default function ArticleMasonry({ articles, reduceMotion = false }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isDesktopBentoCarousel = useMediaQuery(NEWSROOM_BENTO_CAROUSEL_QUERY)

  const items = useMemo(
    () => buildBentoItems(articles, normalizeUnicode),
    [articles],
  )

  const handleItemClick = (item) => {
    if (item.slug) navigate(`/article/${item.slug}`)
  }

  if (!items.length) return null

  const useYCarousel =
    isDesktopBentoCarousel && items.length > NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE

  return (
    <section className="article-bento" aria-label={t('gallery.ariaLabel')}>
      {useYCarousel ? (
        <BentoYCarousel
          items={items}
          reduceMotion={reduceMotion}
          onItemClick={handleItemClick}
        />
      ) : (
        <BentoArticleGrid
          items={items}
          reduceMotion={reduceMotion}
          onItemClick={handleItemClick}
        />
      )}
    </section>
  )
}
