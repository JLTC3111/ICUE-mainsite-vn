import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BentoArticleGrid from './BentoArticleGrid'
import SlidingNumber, { SLOW_SPRING } from './magicui/SlidingNumber'
import { tierToProfile } from '../lib/performanceProfile'
import { chunkBentoItems } from '../lib/bentoArticles'
import { NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE } from '../lib/newsroom'
import './BentoYCarousel.css'

export default function BentoYCarousel({
  items,
  profile = tierToProfile('full'),
  onItemClick,
}) {
  const { t } = useTranslation()
  const { reduceMotion } = profile
  const slides = useMemo(
    () => chunkBentoItems(items, NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE),
    [items],
  )
  const [selectedIndex, setSelectedIndex] = useState(0)

  const sectionRef = useRef(null)
  const wheelLockRef = useRef(false)
  const useLoop = slides.length > 2 && !reduceMotion

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    align: 'start',
    loop: useLoop,
    containScroll: useLoop ? false : 'trimSnaps',
    skipSnaps: false,
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

  // Trackpad/mouse wheel fires many events per gesture — lock until Embla settles
  // so one flick advances exactly one page (previously skipped middle slides).
  useEffect(() => {
    if (!emblaApi || slides.length <= 1) return undefined

    const section = sectionRef.current
    if (!section) return undefined

    const unlockWheel = () => {
      wheelLockRef.current = false
    }

    const onWheel = (event) => {
      if (Math.abs(event.deltaY) < 8) return

      const goingDown = event.deltaY > 0
      const index = emblaApi.selectedScrollSnap()
      const atStart = index <= 0
      const atEnd = index >= slides.length - 1
      const canGo = useLoop || (goingDown ? !atEnd : !atStart)

      if (!canGo) return

      // Always consume the gesture while hovering the carousel so the page
      // behind it doesn't scroll; ignore extras until the snap finishes.
      event.preventDefault()
      event.stopPropagation()

      if (wheelLockRef.current) return

      wheelLockRef.current = true
      if (goingDown) emblaApi.scrollNext()
      else emblaApi.scrollPrev()

      // Fallback if settle never fires (e.g. already at snap with loop glitch).
      window.setTimeout(unlockWheel, reduceMotion ? 50 : 450)
    }

    emblaApi.on('settle', unlockWheel)
    section.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      emblaApi.off('settle', unlockWheel)
      section.removeEventListener('wheel', onWheel)
      wheelLockRef.current = false
    }
  }, [emblaApi, slides.length, useLoop, reduceMotion])

  const scrollPrev = useCallback(() => {
    if (!emblaApi || wheelLockRef.current) return
    wheelLockRef.current = true
    emblaApi.scrollPrev()
    window.setTimeout(() => {
      wheelLockRef.current = false
    }, reduceMotion ? 50 : 450)
  }, [emblaApi, reduceMotion])

  const scrollNext = useCallback(() => {
    if (!emblaApi || wheelLockRef.current) return
    wheelLockRef.current = true
    emblaApi.scrollNext()
    window.setTimeout(() => {
      wheelLockRef.current = false
    }, reduceMotion ? 50 : 450)
  }, [emblaApi, reduceMotion])

  const scrollTo = useCallback((index) => {
    if (!emblaApi || wheelLockRef.current) return
    wheelLockRef.current = true
    emblaApi.scrollTo(index)
    window.setTimeout(() => {
      wheelLockRef.current = false
    }, reduceMotion ? 50 : 450)
  }, [emblaApi, reduceMotion])

  const canScrollPrev = useLoop || selectedIndex > 0
  const canScrollNext = useLoop || selectedIndex < slides.length - 1
  const currentPage = selectedIndex + 1
  const totalPages = slides.length

  return (
    <section
      ref={sectionRef}
      className="bento-y-carousel"
      aria-label={t('gallery.bentoCarouselAriaLabel')}
    >
      <div className="bento-y-carousel__body">
        <div className="bento-y-carousel__frame">
          <div className="bento-y-carousel__viewport" ref={emblaRef}>
            <div className="bento-y-carousel__container">
              {slides.map((slideItems, slideIndex) => (
                <div key={`slide-${slideIndex}-${slideItems[0]?.id ?? slideIndex}`} className="bento-y-carousel__slide">
                  <BentoArticleGrid
                    items={slideItems}
                    profile={profile}
                    animationOffset={slideIndex * NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE}
                    onItemClick={onItemClick}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {slides.length > 1 && (
          <div className="bento-y-carousel__rail" role="tablist" aria-label={t('gallery.bentoSlideNav')}>
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`bento-y-carousel__bar${index === selectedIndex ? ' is-active' : ''}`}
                onClick={() => scrollTo(index)}
                aria-label={t('gallery.bentoGoToSlide', { n: index + 1 })}
                aria-selected={index === selectedIndex}
                role="tab"
              />
            ))}
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <div className="bento-y-carousel__controls">
          <div
            className="bento-y-carousel__page"
            aria-live="polite"
            aria-atomic="true"
            aria-label={t('gallery.bentoPageIndicator', {
              current: currentPage,
              total: totalPages,
            })}
          >
            <SlidingNumber
              className="bento-y-carousel__page-current"
              value={currentPage}
              spring={SLOW_SPRING}
              reduceMotion={reduceMotion}
            />
          </div>

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
        </div>
      )}
    </section>
  )
}
