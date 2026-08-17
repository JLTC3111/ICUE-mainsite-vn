import { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'

import './AccordionGallery.css'

/**
 * React Bits "Accordion Gallery" — a row of panels where the focused one grows
 * and the rest tilt away behind it.
 * @see https://reactbits.dev/components/accordion-gallery
 *
 * Vendored as-is apart from performance and accessibility additions:
 *
 *  - `items` carries `alt` separately from `label`. Upstream falls back to the
 *    label for alt text, which is fine when both are English nouns and wrong
 *    here: the labels are short Vietnamese captions and the alt text has to
 *    describe the photograph.
 *  - WebP via `<picture>` when `fallback` is set; JPEG is the fallback source.
 *  - Nothing downloads until the gallery scrolls into view. After that, only
 *    the active panel and its neighbours load — hovering a strip fetches it.
 *  - Intrinsic width/height on `<img>` when provided, to reserve layout space.
 *  - Clicking the active panel opens a full-size lightbox (`fullImage`, then
 *    `fallback`, then `image`). Escape, backdrop click, or × closes it.
 *
 * The GSAP timeline only runs on hover, focus or arrow keys, so there is no
 * idle cost to this component — unlike the backdrop it sits on.
 */

const DEFAULT_ITEMS = [
  { image: 'https://picsum.photos/id/1015/900/1200', label: 'Canyon', link: '#' },
  { image: 'https://picsum.photos/id/1018/900/1200', label: 'Ridgeline', link: '#' },
  { image: 'https://picsum.photos/id/1039/900/1200', label: 'Falls', link: '#' },
  { image: 'https://picsum.photos/id/1043/900/1200', label: 'Harbour', link: '#' },
  { image: 'https://picsum.photos/id/1044/900/1200', label: 'Skyline', link: '#' },
]

function getPreviewSources(item) {
  return {
    webp: item.image,
    jpeg: item.fallback || item.image,
  }
}

function getFullSources(item) {
  const jpeg = item.fullImage || item.fallback || item.image
  const webp = item.fullImageWebp || (item.fullImage ? null : item.image)
  return { webp, jpeg }
}

function GalleryLightbox({ item, index, count, onClose, onNavigate }) {
  const closeRef = useRef(null)
  const { webp, jpeg } = getFullSources(item)
  const alt = item.alt || item.label || ''

  useEffect(() => {
    closeRef.current?.focus()
  }, [index])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onNavigate(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        onNavigate(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, onNavigate])

  return createPortal(
    <div
      className="ag-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={item.label || 'Photo viewer'}
      onClick={onClose}
    >
      <div
        className="ag-lightbox__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="ag-lightbox__close"
          aria-label="Close photo viewer"
          onClick={onClose}
        >
          <span aria-hidden="true">&times;</span>
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              className="ag-lightbox__nav ag-lightbox__nav--prev"
              aria-label="Previous photo"
              onClick={() => onNavigate(-1)}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className="ag-lightbox__nav ag-lightbox__nav--next"
              aria-label="Next photo"
              onClick={() => onNavigate(1)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        )}

        <figure className="ag-lightbox__figure">
          {webp && webp !== jpeg ? (
            <picture>
              <source srcSet={webp} type="image/webp" />
              <img
                className="ag-lightbox__image"
                src={jpeg}
                alt={alt}
                decoding="async"
                draggable={false}
              />
            </picture>
          ) : (
            <img
              className="ag-lightbox__image"
              src={jpeg}
              alt={alt}
              decoding="async"
              draggable={false}
            />
          )}
          {item.label ? (
            <figcaption className="ag-lightbox__caption">{item.label}</figcaption>
          ) : null}
        </figure>
      </div>
    </div>,
    document.body,
  )
}

const AccordionGallery = ({
  items = DEFAULT_ITEMS,
  defaultIndex = 2,
  accentColor = '#ffffff',
  overlayColor = '#060010',
  textColor = '#ffffff',
  height = 460,
  gap = 10,
  radius = 16,
  expandRatio = 0.52,
  orientation = 'horizontal',
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 8,
  stagger = 0.06,
  trigger = 'hover',
  showLabels = true,
  grayscale = true,
  ariaLabel = 'Image accordion gallery',
  className = '',
}) => {
  const rootRef = useRef(null)
  const panelRefs = useRef([])
  const mediaRefs = useRef([])
  const barRefs = useRef([])
  const textRefs = useRef([])
  const tlRef = useRef(null)
  const firstRunRef = useRef(true)
  const mediaSizeRef = useRef(320)

  const vertical = orientation === 'vertical'
  const count = items.length
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), count - 1))
  const [inView, setInView] = useState(false)
  const [loaded, setLoaded] = useState(() => new Set([defaultIndex]))
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const markLoaded = useCallback((index) => {
    setLoaded((prev) => {
      if (prev.has(index)) return prev
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }, [])

  useEffect(() => {
    markLoaded(active)
    if (active > 0) markLoaded(active - 1)
    if (active < count - 1) markLoaded(active + 1)
  }, [active, count, markLoaded])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '120px 0px', threshold: 0.01 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const shouldLoadImage = useCallback(
    (index) => inView && loaded.has(index),
    [inView, loaded],
  )

  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const applyLayout = useCallback(
    (animate) => {
      const panels = panelRefs.current
      if (!panels.length) return

      const r = Math.min(Math.max(expandRatio, 0.2), 0.9)
      const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1
      const mediaSize = mediaSizeRef.current

      tlRef.current?.kill()
      const dur = animate && !prefersReduced ? duration : 0
      const tl = gsap.timeline()

      panels.forEach((panel, i) => {
        if (!panel) return
        const isActive = i === active
        const media = mediaRefs.current[i]
        const bar = barRefs.current[i]
        const text = textRefs.current[i]

        const rot = isActive ? 0 : i < active ? tilt : -tilt
        const rotProp = vertical ? { rotateX: -rot } : { rotateY: rot }

        tl.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, duration: dur, ease }, 0)

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - i))
          const shift = drift * parallax * mediaSize * 0.06
          const gray = grayscale ? (isActive ? 0 : 1) : 0
          tl.to(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: vertical ? 0 : isActive ? 0 : shift,
              y: vertical ? (isActive ? 0 : shift) : 0,
              '--ag-gray': gray,
              '--ag-dim': isActive ? 0 : 0.35,
              duration: dur,
              ease,
            },
            0,
          )
        }

        if (showLabels && bar && text) {
          if (isActive) {
            tl.to(
              [bar, text],
              { opacity: 1, x: 0, duration: dur, ease, stagger: prefersReduced ? 0 : stagger },
              0,
            )
          } else {
            tl.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease }, 0)
          }
        }
      })

      tlRef.current = tl
    },
    [
      active,
      count,
      expandRatio,
      duration,
      ease,
      vertical,
      tilt,
      parallax,
      grayscale,
      showLabels,
      stagger,
      prefersReduced,
    ],
  )

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const total = vertical ? rect.height : rect.width
      const usable = Math.max(total - gap * (count - 1), 120)
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22)
      mediaSizeRef.current = size
      el.style.setProperty('--ag-media-size', `${size}px`)
      applyLayout(!firstRunRef.current)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [applyLayout, gap, count, expandRatio, vertical])

  useEffect(() => {
    applyLayout(!firstRunRef.current)
    firstRunRef.current = false
  }, [applyLayout])

  useEffect(
    () => () => {
      tlRef.current?.kill()
    },
    [],
  )

  const handleEnter = (i) => {
    if (trigger === 'hover') setActive(i)
  }

  const handleClick = (i, e) => {
    const item = items[i]
    if (i !== active) {
      e.preventDefault()
      setActive(i)
      return
    }

    if (item.link) return

    e.preventDefault()
    markLoaded(i)
    setLightboxIndex(i)
  }

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  const navigateLightbox = useCallback(
    (delta) => {
      setLightboxIndex((current) => {
        if (current == null) return current
        const next = (current + delta + count) % count
        markLoaded(next)
        setActive(next)
        return next
      })
    },
    [count, markLoaded],
  )

  const handleKeyDown = (i, e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i + 1) % count)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i - 1 + count) % count)
    }
  }

  return (
    <>
    <div
      ref={rootRef}
      className={`accordion-gallery${vertical ? ' accordion-gallery--vertical' : ''}${className ? ` ${className}` : ''}`}
      style={{
        '--ag-accent': accentColor,
        '--ag-overlay': overlayColor,
        '--ag-text': textColor,
        '--ag-gap': `${gap}px`,
        '--ag-radius': `${radius}px`,
        height: vertical ? `${Math.round(height * 1.6)}px` : `${height}px`,
      }}
      role="list"
      aria-label={ariaLabel}
    >
      {items.map((item, i) => {
        const isActive = i === active
        const Tag = item.link ? 'a' : 'div'
        const loadImage = shouldLoadImage(i)
        const preview = getPreviewSources(item)
        const imgProps = {
          alt: item.alt || item.label || '',
          draggable: false,
          decoding: 'async',
          loading: isActive ? 'eager' : 'lazy',
          ...(isActive && inView ? { fetchPriority: 'high' } : {}),
          ...(item.width ? { width: item.width } : {}),
          ...(item.height ? { height: item.height } : {}),
        }

        return (
          <Tag
            key={item.image}
            ref={(el) => {
              panelRefs.current[i] = el
            }}
            className={`ag-panel${isActive ? ' ag-panel--active' : ''}${isActive && !item.link ? ' ag-panel--expandable' : ''}`}
            style={{ borderRadius: `${radius}px` }}
            href={item.link || undefined}
            onClick={(e) => handleClick(i, e)}
            onMouseEnter={() => handleEnter(i)}
            onFocus={() => setActive(i)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && i === active && !item.link) {
                e.preventDefault()
                markLoaded(i)
                setLightboxIndex(i)
                return
              }
              handleKeyDown(i, e)
            }}
            role="listitem"
            tabIndex={0}
            aria-current={isActive ? 'true' : undefined}
            aria-label={
              isActive && !item.link
                ? `${item.label}. View full size`
                : item.label
            }
          >
            <span className="ag-panel__frame">
              <span
                className="ag-panel__media"
                ref={(el) => {
                  mediaRefs.current[i] = el
                }}
              >
                {loadImage ? (
                  preview.webp && preview.webp !== preview.jpeg ? (
                    <picture>
                      <source srcSet={preview.webp} type="image/webp" />
                      <img src={preview.jpeg} {...imgProps} />
                    </picture>
                  ) : (
                    <img src={preview.jpeg} {...imgProps} />
                  )
                ) : (
                  <span className="ag-panel__placeholder" aria-hidden="true" />
                )}
              </span>
              <span className="ag-panel__overlay" aria-hidden="true" />
            </span>
            {showLabels && (
              <span className="ag-panel__label" aria-hidden="true">
                <span
                  className="ag-panel__bar"
                  ref={(el) => {
                    barRefs.current[i] = el
                  }}
                />
                <span
                  className="ag-panel__text"
                  ref={(el) => {
                    textRefs.current[i] = el
                  }}
                >
                  {item.label}
                </span>
              </span>
            )}
          </Tag>
        )
      })}
    </div>

    {lightboxIndex != null && items[lightboxIndex] ? (
      <GalleryLightbox
        item={items[lightboxIndex]}
        index={lightboxIndex}
        count={count}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
      />
    ) : null}
    </>
  )
}

export default AccordionGallery
