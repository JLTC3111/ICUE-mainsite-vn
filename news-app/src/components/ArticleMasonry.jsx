import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BentoArticleGrid from './BentoArticleGrid'
import BentoYCarousel from './BentoYCarousel'
import Globe, {
  NEWSROOM_GLOBE_CONFIG_DARK,
  NEWSROOM_GLOBE_CONFIG_LIGHT,
} from './magicui/Globe'
import useMediaQuery from '../hooks/useMediaQuery'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'
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
  const { isDark } = useNewsroomTheme()
  const globeConfig = isDark ? NEWSROOM_GLOBE_CONFIG_DARK : NEWSROOM_GLOBE_CONFIG_LIGHT

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
      <div className="article-bento__backdrop" aria-hidden="true">
        <div className="article-bento__globe-shell">
          <Globe
            key={isDark ? 'dark' : 'light'}
            className="article-bento__globe"
            config={globeConfig}
            reduceMotion={reduceMotion}
          />
        </div>
        <div className="article-bento__globe-vignette" />
      </div>

      <div className="article-bento__content">
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
      </div>
    </section>
  )
}
