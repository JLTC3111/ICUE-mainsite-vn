import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import './MediaGallery.css'

// Renders an article's images + videos with a responsive layout and an
// accessible image lightbox (keyboard + click navigation).
export default function MediaGallery({ images = [], videos = [] }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(null) // active lightbox image index

  const open = useCallback((i) => setIndex(i), [])
  const close = useCallback(() => setIndex(null), [])
  const next = useCallback(
    (e) => { e?.stopPropagation(); setIndex((i) => (i === null ? i : (i + 1) % images.length)) },
    [images.length],
  )
  const prev = useCallback(
    (e) => { e?.stopPropagation(); setIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length)) },
    [images.length],
  )

  // Keyboard navigation + body scroll lock while the lightbox is open.
  useEffect(() => {
    if (index === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, close, next, prev])

  if (images.length === 0 && videos.length === 0) return null

  const imgCountClass = `media-gallery__grid--${Math.min(images.length, 4)}`

  return (
    <section className="media-gallery icue-readw">
      {(images.length > 0 || videos.length > 0) && (
        <h2 className="media-gallery__heading">{t('article.gallery')}</h2>
      )}

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

      {images.length > 0 && (
        <div className={`media-gallery__grid ${imgCountClass}`}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className="media-gallery__item"
              onClick={() => open(i)}
              aria-label={t('article.viewImage', { n: i + 1 })}
            >
              <img src={img.url} alt="" loading="lazy" decoding="async" />
              <span className="media-gallery__zoom" aria-hidden>⤢</span>
            </button>
          ))}
        </div>
      )}

      {index !== null && images[index] && (
        <div className="lightbox" onClick={close} role="dialog" aria-modal="true">
          <button className="lightbox__close" onClick={close} aria-label={t('common.cancel')}>✕</button>
          {images.length > 1 && (
            <button className="lightbox__nav lightbox__prev" onClick={prev} aria-label="Previous">‹</button>
          )}
          <img
            className="lightbox__img"
            src={images[index].url}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <button className="lightbox__nav lightbox__next" onClick={next} aria-label="Next">›</button>
          )}
          {images.length > 1 && (
            <span className="lightbox__count">{index + 1} / {images.length}</span>
          )}
        </div>
      )}
    </section>
  )
}
