import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BentoCard } from './BentoGrid'
import BentoCardBackground from './BentoCardBackground'
import ArticleViewCounter from './ArticleViewCounter'
import TranslationLineSkeleton from './TranslationSkeleton'
import { useArticleTitleTranslations } from '../hooks/useArticleTitleTranslations'
import { buildBentoItems, categoryColor, PLACEHOLDER_COVER } from '../lib/bentoArticles'
import { formatDate, normalizeUnicode } from '../lib/helpers'
import { tierToProfile } from '../lib/performanceProfile'
import './ArticleMasonry.css'

function ArticleMeta({ item, t, locale, compact = false }) {
  return (
    <>
      {item.category && (
        <span className="news-tag" style={{ '--cat-color': categoryColor(item.category) }}>
          {t(`categories.${item.category}`)}
        </span>
      )}
      {item.date && (
        <time className="editorial-news-card__date" dateTime={item.date}>
          {formatDate(item.date, locale)}
        </time>
      )}
      <ArticleViewCounter count={item.viewCount} compact tone="dark" />
      {compact ? <span className="visually-hidden">{t('gallery.readArticle')}</span> : null}
    </>
  )
}

function EditorialCard({
  item,
  variant,
  index,
  profile,
  t,
  locale,
  onItemClick,
}) {
  const { reduceMotion, disableLens, disableBorderBeam } = profile

  return (
    <BentoCard
      name={item.titlePending ? null : item.title}
      titlePending={item.titlePending}
      className={`editorial-news-card editorial-news-card--${variant}`}
      animate={!reduceMotion}
      animationDelay={reduceMotion ? 0 : index * 55}
      lens={!disableLens && !item.comparison && item.img !== PLACEHOLDER_COVER}
      showBorderBeam={!disableBorderBeam}
      cta={t('gallery.readArticle')}
      onClick={() => onItemClick(item)}
      description={(
        <ArticleMeta
          item={item}
          t={t}
          locale={locale}
        />
      )}
      background={<BentoCardBackground item={item} />}
    />
  )
}

function TrendingItem({ item, index, t, locale, onItemClick }) {
  return (
    <button
      type="button"
      className="editorial-trending__item"
      onClick={() => onItemClick(item)}
    >
      <span className="editorial-trending__rank" aria-hidden>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="editorial-trending__copy">
        {item.titlePending ? (
          <TranslationLineSkeleton lines={2} />
        ) : (
          <strong className="editorial-trending__title translation-reveal">{item.title}</strong>
        )}
        <span className="editorial-trending__meta">
          {item.category ? t(`categories.${item.category}`) : t('categories.general')}
          {item.date ? ` · ${formatDate(item.date, locale)}` : ''}
        </span>
      </span>
      <span className="editorial-trending__arrow" aria-hidden>→</span>
    </button>
  )
}

export default function ArticleMasonry({ articles, profile = tierToProfile('full') }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { titles, isTitlePending } = useArticleTitleTranslations(articles, i18n.resolvedLanguage)

  const items = useMemo(
    () => buildBentoItems(articles, normalizeUnicode, titles, isTitlePending),
    [articles, titles, isTitlePending],
  )

  const handleItemClick = (item) => {
    if (item.slug) navigate(`/article/${item.slug}`)
  }

  if (!items.length) return null

  const lead = items[0]
  const supporting = items.slice(1, 3)
  const standard = items.slice(3, 5)
  const trending = items.slice(5, 8)
  const closing = items.slice(8, 10)
  const archive = items.slice(10)
  const cardProps = {
    profile,
    t,
    locale: i18n.resolvedLanguage,
    onItemClick: handleItemClick,
  }

  return (
    <section className="article-editorial" aria-label={t('gallery.ariaLabel')}>
      <div className={`article-editorial__lead${supporting.length ? '' : ' article-editorial__lead--solo'}`}>
        <EditorialCard
          {...cardProps}
          item={lead}
          variant="lead"
          index={0}
        />
        {supporting.length > 0 && (
          <div className="article-editorial__supporting">
            {supporting.map((item, index) => (
              <EditorialCard
                {...cardProps}
                key={item.id}
                item={item}
                variant="supporting"
                index={index + 1}
              />
            ))}
          </div>
        )}
      </div>

      {(standard.length > 0 || trending.length > 0) && (
        <div className="article-editorial__middle">
          <div className="article-editorial__story-pair">
            {standard.map((item, index) => (
              <EditorialCard
                {...cardProps}
                key={item.id}
                item={item}
                variant="standard"
                index={index + 3}
              />
            ))}
          </div>

          {trending.length > 0 && (
            <aside className="editorial-trending" aria-label={t('gallery.trending')}>
              <div className="editorial-trending__head">
                <span>{t('gallery.trending')}</span>
                <span className="editorial-trending__pulse" aria-hidden />
              </div>
              <div className="editorial-trending__list">
                {trending.map((item, index) => (
                  <TrendingItem
                    key={item.id}
                    item={item}
                    index={index}
                    t={t}
                    locale={i18n.resolvedLanguage}
                    onItemClick={handleItemClick}
                  />
                ))}
              </div>
            </aside>
          )}
        </div>
      )}

      {closing.length > 0 && (
        <div className={`article-editorial__closing article-editorial__closing--${closing.length}`}>
          {closing.map((item, index) => (
            <EditorialCard
              {...cardProps}
              key={item.id}
              item={item}
              variant={index === 0 ? 'wide' : 'portrait'}
              index={index + 8}
            />
          ))}
        </div>
      )}

      {archive.length > 0 && (
        <div className="article-editorial__archive">
          {archive.map((item, index) => (
            <EditorialCard
              {...cardProps}
              key={item.id}
              item={item}
              variant="archive"
              index={index + 10}
            />
          ))}
        </div>
      )}
    </section>
  )
}
