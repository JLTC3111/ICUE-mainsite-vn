import { useTranslation } from 'react-i18next'
import { BentoCard, BentoGrid } from './BentoGrid'
import ArticleViewCounter from './ArticleViewCounter'
import { formatDate } from '../lib/helpers'
import { categoryColor, PLACEHOLDER_COVER, withBentoLayout } from '../lib/bentoArticles'

export default function BentoArticleGrid({
  items,
  reduceMotion = false,
  animationOffset = 0,
  onItemClick,
}) {
  const { t, i18n } = useTranslation()
  const layoutItems = withBentoLayout(items)

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
          lens={!reduceMotion && item.img !== PLACEHOLDER_COVER}
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
  )
}
