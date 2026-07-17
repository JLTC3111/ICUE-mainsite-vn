import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow, Pagination } from 'swiper/modules'
import { formatDate, normalizeUnicode } from '../lib/helpers'
import { isCategory, categoryColor } from '../lib/categories'
import ArticleViewCounter from './ArticleViewCounter'
import { ShinyButton } from './magicui/ShinyButton'
import useMediaQuery from '../hooks/useMediaQuery'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-coverflow'
import './ArticleCoverflow.css'

const PLACEHOLDER_COVER = `${import.meta.env.BASE_URL}favicon.svg`
const STORAGE_KEY = 'newsroomCoverflowIndex'

function readInitialIndex(count) {
  const raw = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
  if (Number.isNaN(raw)) return 0
  return Math.max(0, Math.min(count - 1, raw))
}

function refreshCoverflowLoop(swiper) {
  if (!swiper?.params?.loop) return
  swiper.loopFix()
  swiper.updateSlidesClasses()
  swiper.updateProgress()
  swiper.update()
}

export default function ArticleCoverflow({ articles, reduceMotion = false }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const swiperRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const isMobileCoverflow = useMediaQuery('(max-width: 430px)')

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
  const useLoop = slideCount > 2
  const loopBuffer = useLoop ? Math.min(4, Math.max(2, slideCount - 2)) : 0
  const initialIndex = readInitialIndex(slideCount)

  const activeItem = items[activeIndex] ?? items[0]

  const openArticle = useCallback(
    (slug) => {
      if (slug) navigate(`/article/${slug}`)
    },
    [navigate],
  )

  const handleSlideChange = useCallback((swiper) => {
    const index = typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex
    setActiveIndex(index)
    localStorage.setItem(STORAGE_KEY, String(index))
  }, [])

  const finalizeInit = useCallback(
    (swiper) => {
      if (useLoop && initialIndex > 0) {
        swiper.slideToLoop(initialIndex, 0, false)
      }
      refreshCoverflowLoop(swiper)
      const index = typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex
      setActiveIndex(index)
      requestAnimationFrame(() => refreshCoverflowLoop(swiper))
    },
    [initialIndex, useLoop],
  )

  if (!items.length) return null

  const coverflowConfig = reduceMotion
    ? {
        slidesPerView: 1,
        spaceBetween: 20,
        speed: 240,
      }
    : {
        effect: 'coverflow',
        centeredSlides: true,
        slidesPerView: 'auto',
        speed: 320,
        resistanceRatio: 0.72,
        threshold: 6,
        longSwipesMs: 260,
        coverflowEffect: isMobileCoverflow
          ? {
              rotate: 56,
              stretch: 4,
              depth: 200,
              modifier: 1.2,
              slideShadows: false,
            }
          : {
              rotate: 38,
              stretch: -18,
              depth: 140,
              modifier: 1.05,
              slideShadows: false,
            },
      }

  return (
    <section className="article-coverflow" aria-label={t('gallery.coverflowAriaLabel')}>
      <div className="article-coverflow__wrap">
        <Swiper
          key={isMobileCoverflow ? 'coverflow-mobile' : 'coverflow-default'}
          className="article-coverflow__swiper"
          modules={reduceMotion ? [Pagination] : [EffectCoverflow, Pagination]}
          grabCursor
          watchSlidesProgress={!reduceMotion}
          loop={useLoop}
          loopAdditionalSlides={loopBuffer}
          loopAddBlankSlides={useLoop}
          initialSlide={useLoop ? 0 : initialIndex}
          pagination={{ clickable: true }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper
          }}
          onInit={finalizeInit}
          onSlideChange={handleSlideChange}
          onSlideChangeTransitionEnd={(swiper) => {
            const index = typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex
            const last = slideCount - 1
            if (index === 0 || index === last) refreshCoverflowLoop(swiper)
          }}
          {...coverflowConfig}
        >
          {items.map((item, index) => (
            <SwiperSlide key={item.id}>
              <button
                type="button"
                className="article-coverflow__card"
                onClick={() => openArticle(item.slug)}
              >
                <span className="article-coverflow__rank" aria-hidden="true">
                  {index + 1}
                </span>
                {item.img && item.img !== PLACEHOLDER_COVER ? (
                  <img
                    src={item.img}
                    alt=""
                    className="article-coverflow__img"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="article-coverflow__placeholder">ICUE</div>
                )}
              </button>
            </SwiperSlide>
          ))}
        </Swiper>

        {activeItem && (
          <div className="article-coverflow__info" aria-live="polite">
            <div className="article-coverflow__info-text">
              <h2 className="article-coverflow__title">{activeItem.title}</h2>
              <p className="article-coverflow__meta">
                {activeItem.category && (
                  <span
                    className="article-coverflow__category"
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
              className="article-coverflow__cta"
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
