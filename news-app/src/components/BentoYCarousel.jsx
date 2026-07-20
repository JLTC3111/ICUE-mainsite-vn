import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BentoArticleGrid from './BentoArticleGrid'
import { chunkBentoItems } from '../lib/bentoArticles'
import { NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE } from '../lib/newsroom'
import './BentoYCarousel.css'

export default function BentoYCarousel({
  items,
  reduceMotion = false,
  onItemClick,
}) {
  const { t } = useTranslation()
  const slides = useMemo(
    () => chunkBentoItems(items, NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE),
    [items],
  )
  const [selectedIndex, setSelectedIndex] = useState(0)

  const sectionRef = useRef(null)

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    align: 'start',
    containScroll: 'trimSnaps',
    watchResize: true,
    watchSlides: true,
    duration: reduceMotion ? 0 : 24,
  })

  const syncControls = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return undefined
    syncControls()
    emblaApi.on('select', syncControls)
    emblaApi.on('reInit', syncControls)
    emblaApi.on('init', syncControls)
    return () => {
      emblaApi.off('select', syncControls)
      emblaApi.off('reInit', syncControls)
      emblaApi.off('init', syncControls)
    }
  }, [emblaApi, syncControls])

  useLayoutEffect(() => {
    if (!emblaApi) return undefined
    emblaApi.reInit()
    syncControls()
    const id = requestAnimationFrame(() => {
      emblaApi.reInit()
      syncControls()
    })
    return () => cancelAnimationFrame(id)
  }, [emblaApi, slides, syncControls])

  useEffect(() => {
    if (!emblaApi || slides.length <= 1) return undefined

    const section = sectionRef.current
    if (!section) return undefined

    const onWheel = (event) => {
      if (Math.abs(event.deltaY) < 8) return

      const goingDown = event.deltaY > 0
      const index = emblaApi.selectedScrollSnap()
      const atStart = index <= 0
      const atEnd = index >= slides.length - 1
      const canGo = goingDown ? !atEnd : !atStart

      if (!canGo) return

      event.preventDefault()
      event.stopPropagation()
      if (goingDown) emblaApi.scrollNext()
      else emblaApi.scrollPrev()
    }

    section.addEventListener('wheel', onWheel, { passive: false })
    return () => section.removeEventListener('wheel', onWheel)
  }, [emblaApi, slides.length])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((index) => emblaApi?.scrollTo(index), [emblaApi])

  const canScrollPrev = selectedIndex > 0
  const canScrollNext = selectedIndex < slides.length - 1

  return (
    <section
      ref={sectionRef}
      className="bento-y-carousel"
      aria-label={t('gallery.bentoCarouselAriaLabel')}
    >
      <div className="bento-y-carousel__frame">
        <div className="bento-y-carousel__viewport" ref={emblaRef}>
          <div className="bento-y-carousel__container">
            {slides.map((slideItems, slideIndex) => (
              <div key={`slide-${slideIndex}-${slideItems[0]?.id ?? slideIndex}`} className="bento-y-carousel__slide">
                <BentoArticleGrid
                  items={slideItems}
                  reduceMotion={reduceMotion}
                  animationOffset={slideIndex * NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE}
                  onItemClick={onItemClick}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="bento-y-carousel__controls">
          <div className="bento-y-carousel__nav">
            <button
              type="button"
              className="bento-y-carousel__nav-btn"
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              aria-label={t('gallery.bentoPrevSlide')}
            >
              <ChevronUp className="bento-y-carousel__nav-icon" size={18} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="bento-y-carousel__nav-btn"
              onClick={scrollNext}
              disabled={!canScrollNext}
              aria-label={t('gallery.bentoNextSlide')}
            >
              <ChevronDown className="bento-y-carousel__nav-icon" size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="bento-y-carousel__dots" role="tablist" aria-label={t('gallery.bentoSlideNav')}>
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`bento-y-carousel__dot${index === selectedIndex ? ' is-active' : ''}`}
                onClick={() => scrollTo(index)}
                aria-label={t('gallery.bentoGoToSlide', { n: index + 1 })}
                aria-selected={index === selectedIndex}
                role="tab"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
