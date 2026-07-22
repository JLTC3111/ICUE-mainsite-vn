import { useCallback, useEffect, useState } from 'react'
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
  className,
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
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
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openDialog = useCallback(() => setOpen(true), [])
  const closeDialog = useCallback((event) => {
    event?.stopPropagation?.()
    setOpen(false)
  }, [])

  if (!videoSrc || !thumbnailSrc) return null

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
        className="hero-video-dialog__panel"
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
          type="button"
          className="hero-video-dialog__close"
          onClick={closeDialog}
          aria-label={t('common.close')}
        >
          <X size={20} strokeWidth={2} />
        </button>
        <div className="hero-video-dialog__frame">
          <iframe
            src={videoSrc}
            title={thumbnailAlt}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </motion.div>
    </motion.div>
  ) : null

  return (
    <div className={cn('hero-video-dialog', className)}>
      <button
        type="button"
        className="hero-video-dialog__trigger"
        aria-label={t('article.playVideo')}
        onClick={openDialog}
      >
        <img
          src={thumbnailSrc}
          alt={thumbnailAlt}
          className="hero-video-dialog__thumb"
          loading="lazy"
          decoding="async"
        />
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
