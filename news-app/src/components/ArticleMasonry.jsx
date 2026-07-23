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
import { useArticleTitleTranslations } from '../hooks/useArticleTitleTranslations'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'
import { applyGlobeQuality, tierToProfile } from '../lib/performanceProfile'
import { buildBentoItems } from '../lib/bentoArticles'
import {
  NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE,
  NEWSROOM_BENTO_CAROUSEL_QUERY,
} from '../lib/newsroom'
import { normalizeUnicode } from '../lib/helpers'
import './ArticleMasonry.css'

export default function ArticleMasonry({ articles, profile = tierToProfile('full') }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isDesktopBentoCarousel = useMediaQuery(NEWSROOM_BENTO_CAROUSEL_QUERY)
  const { isDark } = useNewsroomTheme()
  const { reduceMotion, disableGlobe, freezeGlobe, globeQuality } = profile
  const baseGlobeConfig = isDark ? NEWSROOM_GLOBE_CONFIG_DARK : NEWSROOM_GLOBE_CONFIG_LIGHT
  const globeConfig = useMemo(
    () => applyGlobeQuality(baseGlobeConfig, globeQuality),
    [baseGlobeConfig, globeQuality],
  )
  const { titles, isTitlePending } = useArticleTitleTranslations(articles, i18n.resolvedLanguage)

  const items = useMemo(
    () => buildBentoItems(articles, normalizeUnicode, titles, isTitlePending),
    [articles, titles, isTitlePending],
  )

  const handleItemClick = (item) => {
    if (item.slug) navigate(`/article/${item.slug}`)
  }

  if (!items.length) return null

  const useYCarousel =
    isDesktopBentoCarousel && items.length > NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE

  const showGlobe = !disableGlobe && globeQuality !== 'off'

  return (
    <section className="article-bento" aria-label={t('gallery.ariaLabel')}>
      <div className="article-bento__gallery">
        <div className="article-bento__backdrop" aria-hidden="true">
          {showGlobe ? (
            <div className="article-bento__globe-shell">
              <Globe
                key={isDark ? 'dark' : 'light'}
                className="article-bento__globe"
                config={globeConfig}
                reduceMotion={reduceMotion && !freezeGlobe}
                frozen={freezeGlobe}
                quality={globeQuality}
                pauseWhenHidden={!freezeGlobe}
              />
            </div>
          ) : null}
          <div className="article-bento__globe-vignette" />
        </div>

        <div className="article-bento__content">
          {useYCarousel ? (
            <BentoYCarousel
              items={items}
              profile={profile}
              onItemClick={handleItemClick}
            />
          ) : (
            <BentoArticleGrid
              items={items}
              profile={profile}
              onItemClick={handleItemClick}
            />
          )}
        </div>
      </div>

      <div className="article-bento__handoff" aria-hidden="true" />
    </section>
  )
}
