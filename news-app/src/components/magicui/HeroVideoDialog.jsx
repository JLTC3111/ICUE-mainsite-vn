import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import './HeroVideoDialog.css'

const ANIMATION_VARIANTS = {
  'from-center': {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.5, opacity: 0 },
  },
  'from-bottom': {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function HeroVideoDialog({
  animationStyle = 'from-center',
  videoSrc,
  thumbnailSrc,
  thumbnailAlt = 'Video thumbnail',
  nativeVideo = false,
  className,
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [nativeAspectRatio, setNativeAspectRatio] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const activeElementRef = useRef(null)
  const selectedAnimation = ANIMATION_VARIANTS[animationStyle] || ANIMATION_VARIANTS['from-center']

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    activeElementRef.current = document.activeElement
    const triggerElement = triggerRef.current
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusableElements = panelRef.current?.querySelectorAll(
        'button:not([disabled]), iframe, video[controls], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusableElements?.length) return
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus())
    window.addEventListener('keydown', onKey)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      const focusTarget = activeElementRef.current
      if (focusTarget instanceof HTMLElement && focusTarget.isConnected) {
        focusTarget.focus({ preventScroll: true })
      } else {
        triggerElement?.focus({ preventScroll: true })
      }
    }
  }, [open])

  const openDialog = useCallback(() => setOpen(true), [])
  const closeDialog = useCallback((event) => {
    event?.stopPropagation?.()
    setOpen(false)
  }, [])

  const commitNativeAspectRatio = useCallback((width, height) => {
    if (!width || !height) return
    const nextRatio = width / height
    setNativeAspectRatio((currentRatio) => (
      Math.abs((currentRatio ?? 0) - nextRatio) < 0.001 ? currentRatio : nextRatio
    ))
  }, [])

  const readNativeAspectRatio = useCallback((event) => {
    const video = event.currentTarget
    commitNativeAspectRatio(video.videoWidth, video.videoHeight)
  }, [commitNativeAspectRatio])

  const readPosterAspectRatio = useCallback((event) => {
    const image = event.currentTarget
    commitNativeAspectRatio(image.naturalWidth, image.naturalHeight)
  }, [commitNativeAspectRatio])

  if (!videoSrc || (!nativeVideo && !thumbnailSrc)) return null

  const nativePanelStyle = nativeAspectRatio
    ? {
        '--hero-video-aspect': nativeAspectRatio,
        '--hero-video-ratio': nativeAspectRatio,
      }
    : undefined

  const overlay = open ? (
    <motion.div
      className="hero-video-dialog__overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      onClick={closeDialog}
      role="presentation"
    >
      <motion.div
        ref={panelRef}
        className={cn(
          'hero-video-dialog__panel',
          nativeVideo && 'hero-video-dialog__panel--native',
        )}
        style={nativePanelStyle}
        initial={selectedAnimation.initial}
        animate={selectedAnimation.animate}
        exit={selectedAnimation.exit}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: 'spring', damping: 30, stiffness: 300 }
        }
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('article.playVideo')}
      >
        <button
          ref={closeRef}
          type="button"
          className="hero-video-dialog__close"
          onClick={closeDialog}
          aria-label={t('common.close')}
        >
          <X size={20} strokeWidth={2} />
        </button>
        <div className={cn(
          'hero-video-dialog__frame',
          nativeVideo && 'hero-video-dialog__frame--native',
        )}>
          {nativeVideo ? (
            <video
              src={videoSrc}
              poster={thumbnailSrc || undefined}
              controls
              autoPlay
              playsInline
              preload="metadata"
              aria-label={thumbnailAlt}
              onLoadedMetadata={readNativeAspectRatio}
            />
          ) : (
            <iframe
              src={videoSrc}
              title={thumbnailAlt}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  ) : null

  return (
    <div className={cn('hero-video-dialog', className)}>
      <button
        ref={triggerRef}
        type="button"
        className="hero-video-dialog__trigger"
        aria-label={t('article.playVideo')}
        onClick={openDialog}
      >
        {nativeVideo && !thumbnailSrc ? (
          <video
            src={videoSrc}
            className="hero-video-dialog__thumb"
            muted
            playsInline
            preload="metadata"
            tabIndex={-1}
            aria-hidden="true"
            onLoadedMetadata={readNativeAspectRatio}
          />
        ) : (
          <img
            src={thumbnailSrc}
            alt={thumbnailAlt}
            className="hero-video-dialog__thumb"
            loading="lazy"
            decoding="async"
            onLoad={nativeVideo ? readPosterAspectRatio : undefined}
          />
        )}
        <span className="hero-video-dialog__play-wrap" aria-hidden>
          <span className="hero-video-dialog__play-ring">
            <span className="hero-video-dialog__play-btn">
              <Play size={28} strokeWidth={2} fill="currentColor" />
            </span>
          </span>
        </span>
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>{overlay}</AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
