import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BentoArticleGrid from './BentoArticleGrid'
import SlidingNumber, { SLOW_SPRING } from './magicui/SlidingNumber'
import { bindEmblaParallax } from '../lib/emblaParallax'
import { tierToProfile } from '../lib/performanceProfile'
import { chunkBentoItems } from '../lib/bentoArticles'
import { NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE } from '../lib/newsroom'
import './BentoYCarousel.css'

const PARALLAX_LAYER_SELECTOR = '.bento-y-carousel__layer'

export default function BentoYCarousel({
  items,
  profile = tierToProfile('full'),
  onItemClick,
}) {
  const { t } = useTranslation()
  const { reduceMotion, disableParallax } = profile
  const slides = useMemo(
    () => chunkBentoItems(items, NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE),
    [items],
  )
  const [selectedIndex, setSelectedIndex] = useState(0)

  const sectionRef = useRef(null)
  const wheelLockRef = useRef(false)
  const unlockTimerRef = useRef(null)
  const tweenNodesRef = useRef([])
  const tweenFactorRef = useRef(0)
  const useParallax = slides.length > 1 && !reduceMotion && !disableParallax

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    align: 'start',
    loop: false,
    containScroll: 'trimSnaps',
    skipSnaps: false,
    watchResize: true,
    watchSlides: true,
    duration: reduceMotion ? 0 : 24,
  })

  const unlockWheel = useCallback(() => {
    if (unlockTimerRef.current !== null) {
      window.clearTimeout(unlockTimerRef.current)
      unlockTimerRef.current = null
    }
    wheelLockRef.current = false
  }, [])

  const scheduleUnlock = useCallback(() => {
    if (unlockTimerRef.current !== null) {
      window.clearTimeout(unlockTimerRef.current)
    }
    unlockTimerRef.current = window.setTimeout(
      unlockWheel,
      reduceMotion ? 50 : 450,
    )
  }, [reduceMotion, unlockWheel])

  const syncControls = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return undefined
    const frameId = requestAnimationFrame(syncControls)
    emblaApi.on('select', syncControls)
    emblaApi.on('reInit', syncControls)
    emblaApi.on('init', syncControls)
    return () => {
      cancelAnimationFrame(frameId)
      emblaApi.off('select', syncControls)
      emblaApi.off('reInit', syncControls)
      emblaApi.off('init', syncControls)
    }
  }, [emblaApi, syncControls])

  useEffect(() => {
    if (!emblaApi || !useParallax) return undefined

    return bindEmblaParallax(emblaApi, {
      layerSelector: PARALLAX_LAYER_SELECTOR,
      tweenNodesRef,
      tweenFactorRef,
      enabled: true,
      tweenFactorBase: 0.28,
      axis: 'y',
    })
  }, [emblaApi, useParallax])

  useLayoutEffect(() => {
    if (!emblaApi) return undefined
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

    const onWheel = (event) => {
      if (Math.abs(event.deltaY) < 8) return

      const goingDown = event.deltaY > 0
      const index = emblaApi.selectedScrollSnap()
      const atStart = index <= 0
      const atEnd = index >= slides.length - 1
      const canGo = goingDown ? !atEnd : !atStart

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
      scheduleUnlock()
    }

    emblaApi.on('settle', unlockWheel)
    section.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      emblaApi.off('settle', unlockWheel)
      section.removeEventListener('wheel', onWheel)
      unlockWheel()
    }
  }, [emblaApi, slides.length, scheduleUnlock, unlockWheel])

  const scrollPrev = useCallback(() => {
    if (!emblaApi || wheelLockRef.current) return
    wheelLockRef.current = true
    emblaApi.scrollPrev()
    scheduleUnlock()
  }, [emblaApi, scheduleUnlock])

  const scrollNext = useCallback(() => {
    if (!emblaApi || wheelLockRef.current) return
    wheelLockRef.current = true
    emblaApi.scrollNext()
    scheduleUnlock()
  }, [emblaApi, scheduleUnlock])

  const scrollTo = useCallback((index) => {
    if (!emblaApi || wheelLockRef.current) return
    wheelLockRef.current = true
    emblaApi.scrollTo(index)
    scheduleUnlock()
  }, [emblaApi, scheduleUnlock])

  const canScrollPrev = selectedIndex > 0
  const canScrollNext = selectedIndex < slides.length - 1
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
                <div
                  key={`slide-${slideIndex}-${slideItems[0]?.id ?? slideIndex}`}
                  className="bento-y-carousel__slide"
                >
                  <div className="bento-y-carousel__parallax">
                    <div className="bento-y-carousel__layer">
                      <BentoArticleGrid
                        items={slideItems}
                        profile={profile}
                        animationOffset={slideIndex * NEWSROOM_BENTO_CAROUSEL_PAGE_SIZE}
                        onItemClick={onItemClick}
                      />
                    </div>
                  </div>
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
