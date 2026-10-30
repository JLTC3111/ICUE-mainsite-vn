import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { A11y, Mousewheel } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/a11y'
import './ProjectLightbox.css'

export default function ProjectLightbox({ images, initialIndex = 0, title, labels, onClose, returnFocus }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const swiperRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const countId = useId()
  const canStep = images.length > 1
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const trigger = returnFocus || document.activeElement
    const bodyOverflow = document.body.style.overflow
    const rootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    // Swiper must measure an open dialog, rather than its hidden initial box.
    setReady(true)
    closeRef.current?.focus({ preventScroll: true })

    return () => {
      if (dialog.open) dialog.close()
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = rootOverflow
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [returnFocus])

  const onKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const swiper = swiperRef.current
    if (!canStep || !swiper) return
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'ArrowLeft') swiper.slidePrev()
    if (event.key === 'ArrowRight') swiper.slideNext()
    if (event.key === 'Home') swiper.slideTo(0)
    if (event.key === 'End') swiper.slideTo(images.length - 1)
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="project-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-describedby={countId}
      onKeyDown={onKeyDown}
      onWheelCapture={(event) => {
        // A trackpad pinch should zoom the page, not advance the carousel.
        if (event.ctrlKey) event.stopPropagation()
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button
        ref={closeRef}
        type="button"
        className="project-lightbox__control project-lightbox__close"
        onClick={onClose}
        aria-label={labels.closeImage}
      >
        <X size={28} aria-hidden="true" />
      </button>
      {ready ? (
        <Swiper
          className="project-lightbox__swiper"
          modules={[A11y, Mousewheel]}
          initialSlide={initialIndex}
          slidesPerView={1}
          spaceBetween={24}
          rewind={canStep}
          allowTouchMove={canStep}
          simulateTouch
          grabCursor={canStep}
          threshold={8}
          longSwipesRatio={0.12}
          speed={reducedMotion ? 0 : 260}
          mousewheel={canStep ? { forceToAxis: false, thresholdDelta: 12, thresholdTime: 400, releaseOnEdges: false } : false}
          a11y={{ prevSlideMessage: labels.previousImage, nextSlideMessage: labels.nextImage }}
          onSwiper={(instance) => { swiperRef.current = instance }}
          onSlideChange={(instance) => setActiveIndex(instance.realIndex)}
        >
          {images.map((image, index) => (
            <SwiperSlide className="project-lightbox__slide" key={image.src} aria-hidden={index !== activeIndex}>
              <img
                className="project-lightbox__image"
                src={image.src}
                width={image.width}
                height={image.height}
                alt={`${title} — ${index + 1}`}
                draggable={false}
                loading={index === initialIndex ? 'eager' : 'lazy'}
                decoding="async"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      ) : null}
      {canStep ? (
        <>
          <button
            type="button"
            className="project-lightbox__control project-lightbox__prev"
            onClick={() => swiperRef.current?.slidePrev()}
            aria-label={labels.previousImage}
          >
            <ChevronLeft size={36} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="project-lightbox__control project-lightbox__next"
            onClick={() => swiperRef.current?.slideNext()}
            aria-label={labels.nextImage}
          >
            <ChevronRight size={36} aria-hidden="true" />
          </button>
        </>
      ) : null}
      <span className="project-lightbox__count" id={countId} aria-live="polite" aria-atomic="true">
        {activeIndex + 1} / {images.length}
      </span>
    </dialog>,
    document.body,
  )
}
