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
import { bindEmblaParallax } from '../lib/emblaParallax'
import { useArticleTitleTranslations } from '../hooks/useArticleTitleTranslations'
import ArticleViewCounter from './ArticleViewCounter'
import TranslationLineSkeleton from './TranslationSkeleton'
import { ShinyButton } from './magicui/ShinyButton'
import './ArticleParallaxCarousel.css'

const PLACEHOLDER_COVER = `${import.meta.env.BASE_URL}favicon.svg`
const STORAGE_KEY = 'newsroomParallaxIndex'
const PARALLAX_LAYER_SELECTOR = '.article-parallax__layer'

function readInitialIndex(count) {
  const raw = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
  if (Number.isNaN(raw)) return 0
  return Math.max(0, Math.min(count - 1, raw))
}

export default function ArticleParallaxCarousel({ articles, reduceMotion = false }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const tweenNodesRef = useRef([])
  const tweenFactorRef = useRef(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { titles, isTitlePending } = useArticleTitleTranslations(articles, i18n.resolvedLanguage)

  const items = useMemo(
    () =>
      articles.map((article, index) => {
        const titlePending = isTitlePending(article.id)
        const title = titlePending
          ? ''
          : (titles[article.id] || normalizeUnicode(article.title))
        const category =
          isCategory(article.category) && article.category !== 'general'
            ? article.category
            : null
        const date = article.published_at || article.article_date || ''
        return {
          id: article.slug || article.id || String(index),
          slug: article.slug,
          title,
          titlePending,
          category,
          date,
          viewCount: article.view_count ?? 0,
          img: article.cover_image_url || PLACEHOLDER_COVER,
        }
      }),
    [articles, titles, isTitlePending],
  )

  const slideCount = items.length
  const useLoop = slideCount > 2 && !reduceMotion
  const useParallax = slideCount > 1 && !reduceMotion

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: useLoop,
    align: 'center',
    containScroll: false,
    startIndex: readInitialIndex(slideCount),
    duration: reduceMotion ? 0 : 18,
    dragThreshold: 5,
  })

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

  const scrollTo = useCallback(
    (index) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi],
  )

  useEffect(() => {
    if (!emblaApi) return undefined

    syncIndex()
    emblaApi.on('select', syncIndex)
    emblaApi.on('reInit', syncIndex)

    return () => {
      emblaApi.off('select', syncIndex)
      emblaApi.off('reInit', syncIndex)
    }
  }, [emblaApi, syncIndex])

  useEffect(() => {
    if (!emblaApi || !useParallax) return undefined

    return bindEmblaParallax(emblaApi, {
      layerSelector: PARALLAX_LAYER_SELECTOR,
      tweenNodesRef,
      tweenFactorRef,
      enabled: true,
      tweenFactorBase: 0.52,
    })
  }, [emblaApi, useParallax])

  useLayoutEffect(() => {
    if (!emblaApi) return undefined
    emblaApi.reInit()
    syncIndex()
    const id = requestAnimationFrame(() => {
      emblaApi.reInit()
      syncIndex()
    })
    return () => cancelAnimationFrame(id)
  }, [emblaApi, items.length, syncIndex])

  if (!items.length) return null

  return (
    <section className="article-parallax" aria-label={t('gallery.coverflowAriaLabel')}>
      <div className="article-parallax__wrap">
        <div className="article-parallax__viewport" ref={emblaRef}>
          <div className="article-parallax__container">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`article-parallax__slide${index === selectedIndex ? ' is-active' : ''}`}
              >
                <button
                  type="button"
                  className="article-parallax__card"
                  onClick={() => openArticle(item.slug)}
                >
                  <div className="article-parallax__parallax">
                    <div className="article-parallax__layer">
                      {item.img && item.img !== PLACEHOLDER_COVER ? (
                        <img
                          src={item.img}
                          alt=""
                          className="article-parallax__img"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="article-parallax__placeholder">ICUE</div>
                      )}
                    </div>
                  </div>
                  <span className="article-parallax__rank" aria-hidden="true">
                    {index + 1}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {slideCount > 1 && (
          <div className="article-parallax__rail" aria-hidden="false">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`article-parallax__bar${index === selectedIndex ? ' is-active' : ''}`}
                aria-label={t('gallery.parallaxGoToSlide', { index: index + 1 })}
                aria-current={index === selectedIndex ? 'true' : undefined}
                onClick={() => scrollTo(index)}
              />
            ))}
          </div>
        )}

        {activeItem && (
          <div className="article-parallax__info" aria-live="polite">
            <div className="article-parallax__info-text">
              <h2 className="article-parallax__title">
                {activeItem.titlePending ? (
                  <TranslationLineSkeleton
                    lines={2}
                    className="translation-skeleton--on-dark"
                  />
                ) : (
                  <span className="translation-reveal">{activeItem.title}</span>
                )}
              </h2>
              <p className="article-parallax__meta">
                {activeItem.category && (
                  <span
                    className="article-parallax__category"
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
                <ArticleViewCounter count={activeItem.viewCount} compact tone="dark" />
              </p>
            </div>
            <ShinyButton
              type="button"
              className="article-parallax__cta"
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
