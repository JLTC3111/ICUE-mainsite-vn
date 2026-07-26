import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import Lens from './Lens'
import './MediaGallery.css'

function useMobileGallery() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 680px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return isMobile
}

// Renders an article's images + videos with a responsive layout and an
// accessible image lightbox (touch swipe, keyboard + click navigation).
export default function MediaGallery({ images = [], videos = [], lensEnabled = false }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(null)
  const [orientations, setOrientations] = useState({})
  const lightboxSwiperRef = useRef(null)
  const isMobile = useMobileGallery()

  const open = useCallback((i) => setIndex(i), [])
  const close = useCallback(() => setIndex(null), [])
  const handleImageLoad = useCallback((id, event) => {
    const next = event.currentTarget.naturalHeight > event.currentTarget.naturalWidth
      ? 'portrait'
      : 'landscape'
    setOrientations((previous) => (
      previous[id] === next ? previous : { ...previous, [id]: next }
    ))
  }, [])

  useEffect(() => {
    if (index === null) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, close])

  if (images.length === 0 && videos.length === 0) return null

  const imgCountClass = `media-gallery__grid--${Math.min(images.length, 4)}`
  const showMobileCarousel = isMobile && images.length > 1

  return (
    <section className="media-gallery icue-readw">
      <h2 className="media-gallery__heading">{t('article.gallery')}</h2>

      {videos.length > 0 && (
        <div className={`media-gallery__videos ${videos.length > 1 ? 'is-multi' : ''}`}>
          {videos.map((v) => (
            <video
              key={v.id}
              src={v.url}
              poster={v.poster_url || undefined}
              controls
              preload="metadata"
              playsInline
            />
          ))}
        </div>
      )}

      {images.length > 0 && showMobileCarousel && (
        <Swiper
          className="media-gallery__mobile-swiper"
          modules={[Pagination]}
          spaceBetween={12}
          slidesPerView={1.06}
          centeredSlides
          pagination={{ clickable: true }}
          grabCursor
        >
          {images.map((img, i) => (
            <SwiperSlide key={img.id}>
              <button
                type="button"
                className={`media-gallery__item media-gallery__item--mobile${orientations[img.id] ? ` media-gallery__item--${orientations[img.id]}` : ''}`}
                onClick={() => open(i)}
                aria-label={t('article.viewImage', { n: i + 1 })}
              >
                <img src={img.url} alt="" loading="lazy" decoding="async" onLoad={(event) => handleImageLoad(img.id, event)} />
                <span className="media-gallery__zoom" aria-hidden>
                  <Maximize2 size={15} strokeWidth={2} />
                </span>
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      {images.length > 0 && !showMobileCarousel && (
        <div className={`media-gallery__grid ${imgCountClass}`}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={`media-gallery__item${lensEnabled ? ' media-gallery__item--lens' : ''}${orientations[img.id] ? ` media-gallery__item--${orientations[img.id]}` : ''}`}
              onClick={() => open(i)}
              aria-label={t('article.viewImage', { n: i + 1 })}
            >
              <Lens
                className="media-gallery__lens"
                zoomFactor={1.4}
                lensSize={150}
                disabled={!lensEnabled}
              >
                <img src={img.url} alt="" loading="lazy" decoding="async" onLoad={(event) => handleImageLoad(img.id, event)} />
              </Lens>
              {!lensEnabled && (
                <span className="media-gallery__zoom" aria-hidden>
                  <Maximize2 size={15} strokeWidth={2} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {index !== null && images[index] && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t('article.gallery')}
        >
          <button
            type="button"
            className="lightbox__backdrop"
            onClick={close}
            aria-label={t('common.close')}
          />

          <button
            type="button"
            className="lightbox__close"
            onClick={(e) => {
              e.stopPropagation()
              close()
            }}
            aria-label={t('common.close')}
          >
            <X size={22} strokeWidth={2} />
          </button>

          <div className="lightbox__stage">
            <Swiper
              className="lightbox__swiper"
              modules={[Keyboard, Pagination]}
              initialSlide={index}
              keyboard={{ enabled: true }}
              pagination={images.length > 1 ? { clickable: true } : false}
              grabCursor
              resistanceRatio={0.72}
              threshold={8}
              longSwipesRatio={0.18}
              onSwiper={(swiper) => {
                lightboxSwiperRef.current = swiper
              }}
              onSlideChange={(swiper) => setIndex(swiper.activeIndex)}
            >
              {images.map((img) => (
                <SwiperSlide
                  key={img.id}
                  className="lightbox__slide"
                  onClick={close}
                >
                  <img
                    className="lightbox__img"
                    src={img.url}
                    alt=""
                    onClick={(e) => e.stopPropagation()}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox__nav lightbox__prev"
                onClick={(e) => {
                  e.stopPropagation()
                  lightboxSwiperRef.current?.slidePrev()
                }}
                aria-label={t('article.prevImage')}
              >
                <ChevronLeft size={28} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="lightbox__nav lightbox__next"
                onClick={(e) => {
                  e.stopPropagation()
                  lightboxSwiperRef.current?.slideNext()
                }}
                aria-label={t('article.nextImage')}
              >
                <ChevronRight size={28} strokeWidth={2} />
              </button>
              <span className="lightbox__count">{index + 1} / {images.length}</span>
            </>
          )}
        </div>
      )}
    </section>
  )
}
