import { useTranslation } from 'react-i18next'
import { BentoCard, BentoGrid } from './BentoGrid'
import BentoCardBackground from './BentoCardBackground'
import ArticleViewCounter from './ArticleViewCounter'
import { formatDate } from '../lib/helpers'
import { categoryColor, PLACEHOLDER_COVER, withBentoLayout } from '../lib/bentoArticles'
import { NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE } from '../lib/newsroom'
import { tierToProfile } from '../lib/performanceProfile'

export default function BentoArticleGrid({
  items,
  profile = tierToProfile('full'),
  animationOffset = 0,
  onItemClick,
}) {
  const { t, i18n } = useTranslation()
  const templateIndex = Math.floor(animationOffset / NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE)
  const layoutItems = withBentoLayout(items, { templateIndex })
  const { reduceMotion, disableLens, disableBorderBeam } = profile

  return (
    <BentoGrid>
      {layoutItems.map((item, index) => (
        <BentoCard
          key={item.id}
          name={item.titlePending ? null : item.title}
          titlePending={item.titlePending}
          spanCols={item.spanCols}
          spanRows={item.spanRows}
          animate={!reduceMotion}
          animationDelay={reduceMotion ? 0 : (animationOffset + index) * 60}
          lens={!disableLens && !item.comparison && item.img !== PLACEHOLDER_COVER}
          showBorderBeam={!disableBorderBeam}
          cta={t('gallery.readArticle')}
          onClick={() => onItemClick(item)}
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
          background={<BentoCardBackground item={item} />}
        />
      ))}
    </BentoGrid>
  )
}
