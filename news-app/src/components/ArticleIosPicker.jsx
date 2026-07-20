import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useEmblaCarousel from 'embla-carousel-react'
import { formatDate, normalizeUnicode } from '../lib/helpers'
import { isCategory, categoryColor } from '../lib/categories'
import {
  clearIosPickerTransforms,
  createIosPickerMetrics,
  inactivateEmblaTransform,
  rotateIosPickerWheel,
  snapIosPickerOnRelease,
} from '../lib/emblaIosPicker'
import { useIosPickerTouchLock } from '../hooks/useIosPickerTouchLock'
import ArticleViewCounter from './ArticleViewCounter'
import { ShinyButton } from './magicui/ShinyButton'
import './ArticleIosPicker.css'

const PLACEHOLDER_COVER = `${import.meta.env.BASE_URL}favicon.svg`
const STORAGE_KEY = 'newsroomIosPickerIndex'
const WHEEL_ITEM_SIZE = 84

function readInitialIndex(count) {
  const raw = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
  if (Number.isNaN(raw)) return 0
  return Math.max(0, Math.min(count - 1, raw))
}

export default function ArticleIosPicker({ articles, reduceMotion = false }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const wheelRef = useRef(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const items = useMemo(
    () =>
      articles.map((article, index) => {
        const title = normalizeUnicode(article.title)
        const category =
          isCategory(article.category) && article.category !== 'general'
            ? article.category
            : null
        const date = article.published_at || article.article_date || ''
        return {
          id: article.slug || article.id || String(index),
          slug: article.slug,
          title,
          category,
          date,
          viewCount: article.view_count ?? 0,
          img: article.cover_image_url || PLACEHOLDER_COVER,
        }
      }),
    [articles],
  )

  const slideCount = items.length
  const useWheel = slideCount > 1 && !reduceMotion
  const useLoop = slideCount >= 2 && !reduceMotion
  const metrics = useMemo(
    () => createIosPickerMetrics(slideCount, WHEEL_ITEM_SIZE),
    [slideCount],
  )

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: useLoop,
    axis: 'y',
    align: 'center',
    dragFree: useWheel,
    containScroll: useWheel ? false : 'trimSnaps',
    watchSlides: !useWheel,
    active: useWheel,
    startIndex: readInitialIndex(slideCount),
  })

  useIosPickerTouchLock(wheelRef, useWheel)

  const activeItem = items[selectedIndex] ?? items[0]

  const openArticle = useCallback(
    (slug) => {
      if (slug) navigate(`/article/${slug}`)
    },
    [navigate],
  )

  const syncIndex = useCallback(() => {
    if (!emblaApi) return
    const index = emblaApi.selectedScrollSnap()
    setSelectedIndex(index)
    localStorage.setItem(STORAGE_KEY, String(index))
  }, [emblaApi])

  const rotateWheel = useCallback(() => {
    if (!emblaApi || !useWheel) return
    rotateIosPickerWheel(emblaApi, metrics, useLoop, slideCount)
  }, [emblaApi, metrics, slideCount, useLoop, useWheel])

  const reloadPicker = useCallback(() => {
    if (!emblaApi || !useWheel) return
    emblaApi.reInit()
    inactivateEmblaTransform(emblaApi)
    rotateIosPickerWheel(emblaApi, metrics, useLoop, slideCount)
    syncIndex()
  }, [emblaApi, metrics, slideCount, syncIndex, useLoop, useWheel])

  useEffect(() => {
    if (!emblaApi || !useWheel) return undefined

    syncIndex()
    emblaApi.on('select', syncIndex)
    emblaApi.on('reInit', syncIndex)

    const onPointerUp = (api) => snapIosPickerOnRelease(api, WHEEL_ITEM_SIZE)
    const onScroll = () => rotateIosPickerWheel(emblaApi, metrics, useLoop, slideCount)
    const onReInit = (api) => {
      inactivateEmblaTransform(api)
      rotateIosPickerWheel(api, metrics, useLoop, slideCount)
    }

    emblaApi.on('pointerUp', onPointerUp)
    emblaApi.on('scroll', onScroll)
    emblaApi.on('reInit', onReInit)

    inactivateEmblaTransform(emblaApi)
    onScroll()

    return () => {
      emblaApi.off('select', syncIndex)
      emblaApi.off('reInit', syncIndex)
      emblaApi.off('pointerUp', onPointerUp)
      emblaApi.off('scroll', onScroll)
      emblaApi.off('reInit', onReInit)
    }
  }, [emblaApi, metrics, slideCount, syncIndex, useLoop, useWheel])

  useLayoutEffect(() => {
    if (useWheel) reloadPicker()
    else if (emblaApi) clearIosPickerTransforms(emblaApi)
  }, [emblaApi, reloadPicker, items.length, useWheel])

  useEffect(() => {
    if (useWheel) rotateWheel()
  }, [rotateWheel, useWheel])

  if (!items.length) return null

  return (
    <section
      className={`article-ios-picker${useWheel ? '' : ' article-ios-picker--static'}${reduceMotion ? ' article-ios-picker--flat' : ''}`}
      aria-label={t('gallery.iosPickerAriaLabel')}
      style={{ '--ios-picker-item-size': `${WHEEL_ITEM_SIZE}px` }}
    >
      <div className="article-ios-picker__wrap">
        {useWheel && (
          <div className="article-ios-picker__header">
            <p className="article-ios-picker__hint">{t('gallery.iosPickerHint')}</p>
            <p className="article-ios-picker__count" aria-live="polite">
              {selectedIndex + 1}
              <span className="article-ios-picker__count-sep">/</span>
              {slideCount}
            </p>
          </div>
        )}

        <div
          ref={wheelRef}
          className="article-ios-picker__wheel"
          data-touch-scroll="isolated"
        >
          <div className="article-ios-picker__scene">
            {useWheel ? (
              <div className="article-ios-picker__viewport" ref={emblaRef}>
                <div className="article-ios-picker__container">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`article-ios-picker__slide${index === selectedIndex ? ' is-selected' : ''}`}
                    >
                      <button
                        type="button"
                        className="article-ios-picker__slide-btn"
                        onClick={() => openArticle(item.slug)}
                      >
                        <span className="article-ios-picker__rank" aria-hidden="true">
                          {index + 1}
                        </span>
                        {item.img && item.img !== PLACEHOLDER_COVER ? (
                          <img
                            src={item.img}
                            alt=""
                            className="article-ios-picker__thumb"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="article-ios-picker__placeholder">ICUE</span>
                        )}
                        <span className="article-ios-picker__slide-title">{item.title}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="article-ios-picker__single">
                <button
                  type="button"
                  className="article-ios-picker__slide-btn article-ios-picker__slide-btn--featured"
                  onClick={() => openArticle(activeItem.slug)}
                >
                  {activeItem.img && activeItem.img !== PLACEHOLDER_COVER ? (
                    <img
                      src={activeItem.img}
                      alt=""
                      className="article-ios-picker__featured-img"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="article-ios-picker__placeholder article-ios-picker__placeholder--featured">
                      ICUE
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {activeItem && (
          <div className="article-ios-picker__info" aria-live="polite">
            <div className="article-ios-picker__info-text">
              <h2 className="article-ios-picker__title">{activeItem.title}</h2>
              <p className="article-ios-picker__meta">
                {activeItem.category && (
                  <span
                    className="article-ios-picker__category"
                    style={{ '--cat-color': categoryColor(activeItem.category) }}
                  >
                    {t(`categories.${activeItem.category}`)}
                  </span>
                )}
                {activeItem.date && (
                  <time dateTime={activeItem.date}>
                    {formatDate(activeItem.date, i18n.resolvedLanguage)}
                  </time>
                )}
                <ArticleViewCounter count={activeItem.viewCount} compact tone="light" />
              </p>
            </div>
            <ShinyButton
              type="button"
              className="article-ios-picker__cta"
              onClick={() => openArticle(activeItem.slug)}
            >
              {t('gallery.readArticle')}
            </ShinyButton>
          </div>
        )}
      </div>
    </section>
  )
}
