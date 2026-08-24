import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
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
 *  - Intrinsic width/height on `<img>` when provided, to reserve layout space.
 *  - Clicking the active panel opens a full-size lightbox (`fullImage`, then
 *    `fallback`, then `image`). Escape, backdrop click, or × closes it.
 *
 * The GSAP timeline only runs on hover, focus or arrow keys, so there is no
 * idle cost to this component — unlike the backdrop it sits on.
 *
 * ── How the photographs arrive ──────────────────────────────────────────────
 *
 * Nothing downloads until the gallery is nearly on screen. From there the
 * loading is deliberately two-speed, because the phone case and the desktop
 * case want opposite things:
 *
 *  - The panel the reader is on, and its two neighbours, render as ordinary
 *    <img> at normal priority. That is the photograph someone is actually
 *    looking at, so it competes with the rest of the page on equal terms.
 *  - Everything else is pulled into the HTTP cache afterwards by `warmImage`,
 *    one file at a time, at `fetchPriority: 'low'`, from an idle callback.
 *    Serially and at low priority on purpose: this page also loads a WebGL
 *    backdrop and an 850 KB glTF model, and nine parallel photo requests would
 *    take bandwidth from both. By the time a reader taps a panel the file is
 *    usually already in cache, which is the difference between "instant" and
 *    "a second of dark rectangle" on a phone — where there is no hover to warm
 *    anything ahead of the tap.
 *
 * Until a photograph paints, its panel shows `item.blur`: a 24px WebP of the
 * same photo, inline as a data URI, upscaled by the browser into a blur. The
 * real image then fades in over it, on decode. An empty dark panel is what
 * made this gallery read as broken on mobile even when it was working.
 *
 * On a touch screen the hover affordances are dropped as well — see `touch`.
 */

const DEFAULT_ITEMS = [
  { image: 'https://picsum.photos/id/1015/900/1200', label: 'Canyon', link: '#' },
  { image: 'https://picsum.photos/id/1018/900/1200', label: 'Ridgeline', link: '#' },
  { image: 'https://picsum.photos/id/1039/900/1200', label: 'Falls', link: '#' },
  { image: 'https://picsum.photos/id/1043/900/1200', label: 'Harbour', link: '#' },
  { image: 'https://picsum.photos/id/1044/900/1200', label: 'Skyline', link: '#' },
]

/** Panels stack instead of tilting at or below this width; mirrors the CSS. */
const COMPACT_WIDTH = 520

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

let webpSupport = null

/**
 * Whether `<picture>` will take the WebP branch, so the warm-up queue requests
 * the same file the panel will. Warming the WebP in a browser that cannot
 * decode it would download every photograph twice.
 */
function supportsWebp() {
  if (webpSupport !== null) return webpSupport
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    // Canvas is readable everywhere this app runs, so a throw means a
    // fingerprinting shield rather than a browser from before 2020. Assume the
    // WebP branch: guessing wrong in this direction costs nothing, guessing
    // wrong in the other downloads every photograph twice.
    webpSupport = true
  }
  return webpSupport
}

/** The URL the browser will actually request for a panel. */
function getPreviewHref(item) {
  const { webp, jpeg } = getPreviewSources(item)
  return supportsWebp() ? webp : jpeg
}

/**
 * How many photographs either side of the open one are worth pulling down
 * before the reader asks for them.
 *
 * The whole set is around 680 KB, which is a fair trade on a normal connection
 * and a bad one on a metered or 2G connection — so Save-Data and 2G opt out of
 * the queue entirely and keep today's behaviour (active panel plus
 * neighbours), and 3G takes a few. `navigator.connection` is Chromium-only;
 * Safari reports nothing, and no signal is read as a normal connection rather
 * than as a slow one.
 */
function getPrefetchBudget() {
  const connection =
    typeof navigator !== 'undefined'
      ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
      : null
  if (!connection) return Infinity
  if (connection.saveData) return 0
  const type = connection.effectiveType
  if (type === 'slow-2g' || type === '2g') return 0
  if (type === '3g') return 4
  return Infinity
}

/**
 * Pull one photograph into the HTTP cache and decode it, off the critical path.
 * Always resolves: a photo that 404s must not stall the rest of the queue.
 */
function warmImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    if ('fetchPriority' in img) img.fetchPriority = 'low'
    img.onload = () => {
      if (typeof img.decode === 'function') img.decode().then(resolve, resolve)
      else resolve()
    }
    img.onerror = () => resolve()
    img.src = src
  })
}

/** Runs `callback` when the browser is idle. Returns its canceller. */
function scheduleIdle(callback) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(callback, { timeout: 1500 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(callback, 300)
  return () => clearTimeout(id)
}

/** Every index, ordered by distance from `from` — nearest neighbours first. */
function outwardFrom(from, count) {
  const order = [from]
  for (let step = 1; step < count; step += 1) {
    if (from + step < count) order.push(from + step)
    if (from - step >= 0) order.push(from - step)
  }
  return order
}

/** Live `matchMedia` result; false anywhere `matchMedia` is unavailable. */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia(query)
    const onChange = (event) => setMatches(event.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

function GalleryLightbox({ item, index, count, onClose, onNavigate }) {
  const closeRef = useRef(null)
  // Which photograph has finished loading, not whether one has. Resetting a
  // boolean from an effect on `index` would let the arrow keys paint a frame of
  // the outgoing photograph at full opacity before it snapped to transparent;
  // deriving it means the new index is already "not shown" in the same render
  // that swaps the src.
  const [shownIndex, setShownIndex] = useState(null)
  const shown = shownIndex === index
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

  const imgProps = {
    className: `ag-lightbox__image${shown ? ' is-ready' : ''}`,
    src: jpeg,
    alt,
    decoding: 'async',
    fetchPriority: 'high',
    draggable: false,
    onLoad: () => setShownIndex(index),
    onError: () => setShownIndex(index),
    ref: (el) => {
      if (el?.complete) setShownIndex(index)
    },
  }

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
              <img {...imgProps} />
            </picture>
          ) : (
            <img {...imgProps} />
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

  const compact = useMediaQuery(`(max-width: ${COMPACT_WIDTH}px)`)
  // Not "is this a phone": a laptop with a touchscreen still has a pointer and
  // still gets the hover treatment. This is only true where hover cannot happen.
  const touch = useMediaQuery('(hover: none)')

  const vertical = orientation === 'vertical'
  const stacked = vertical || compact
  const count = items.length
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), count - 1))
  const [inView, setInView] = useState(false)
  const [loaded, setLoaded] = useState(() => new Set([defaultIndex]))
  const [ready, setReady] = useState(() => new Set())
  const [lightboxIndex, setLightboxIndex] = useState(null)

  // The warm-up queue starts from wherever the reader is when it opens, without
  // restarting every time they move.
  const activeRef = useRef(active)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  const markLoaded = useCallback((index) => {
    setLoaded((prev) => {
      if (prev.has(index)) return prev
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }, [])

  const markReady = useCallback((index) => {
    setReady((prev) => (prev.has(index) ? prev : new Set(prev).add(index)))
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
      // Roughly half a phone viewport of lead time. The gallery sits far down a
      // long page, so this is spent while the reader is still scrolling toward
      // it rather than while they are waiting on it.
      { rootMargin: '480px 0px', threshold: 0.01 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  // `items` is rebuilt on every render of the page that owns it (the captions
  // are translated), so the queue keys off the URLs instead of the array.
  const sourceKey = useMemo(() => items.map((item) => item.image).join('|'), [items])

  useEffect(() => {
    if (!inView) return undefined
    const budget = getPrefetchBudget()
    if (budget <= 0) return undefined

    let cancelled = false
    const cancelIdle = scheduleIdle(async () => {
      const order = outwardFrom(activeRef.current, count)
      const queue = budget === Infinity ? order : order.slice(0, budget + 1)

      for (const index of queue) {
        if (cancelled) return
        const item = items[index]
        if (!item) continue
        await warmImage(getPreviewHref(item))
        if (cancelled) return
        // Only now render it: the file is in cache and decoded, so the <img>
        // paints on the same frame it mounts.
        markLoaded(index)
      }
    })

    return () => {
      cancelled = true
      cancelIdle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, count, sourceKey, markLoaded])

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
        const rotProp = stacked ? { rotateX: -rot } : { rotateY: rot }

        tl.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, duration: dur, ease }, 0)

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - i))
          const shift = drift * parallax * mediaSize * 0.06
          // Draining the colour out of every panel but one is a hover
          // affordance: it says "this is the one you are pointing at". With no
          // pointer there is nothing to say, and eight grey, dimmed panels read
          // as eight photographs that failed to load.
          const gray = grayscale && !touch ? (isActive ? 0 : 1) : 0
          const dim = isActive ? 0 : touch ? 0.16 : 0.35
          tl.to(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: stacked ? 0 : isActive ? 0 : shift,
              y: stacked ? (isActive ? 0 : shift) : 0,
              '--ag-gray': gray,
              '--ag-dim': dim,
              duration: dur,
              ease,
            },
            0,
          )
        }

        if (showLabels && bar && text) {
          // Every caption stays up on a touch screen: they are the only thing
          // telling the panels apart when none of them is "hovered".
          if (isActive || touch) {
            tl.to(
              [bar, text],
              {
                opacity: isActive ? 1 : 0.75,
                x: 0,
                duration: dur,
                ease,
                stagger: prefersReduced ? 0 : stagger,
              },
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
      stacked,
      touch,
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
      let size

      if (compact) {
        // The compact stack is a list of fixed-height strips, so the media box
        // is sized from a panel rather than from the container: measuring the
        // container here (as the horizontal layout does) produced a media box
        // several times taller than the strip cropping it, and the browser paid
        // to scale and rasterise all of it.
        const panelHeight = panelRefs.current[0]?.getBoundingClientRect().height || 0
        size = Math.max(120, (panelHeight || 84) * 1.32)
      } else {
        const total = vertical ? rect.height : rect.width
        const usable = Math.max(total - gap * (count - 1), 120)
        size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22)
      }

      mediaSizeRef.current = size
      el.style.setProperty('--ag-media-size', `${size}px`)
      applyLayout(!firstRunRef.current)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [applyLayout, gap, count, expandRatio, vertical, compact])

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
    // Touch browsers synthesise mouseenter on tap; letting it through would
    // make the first tap select and only the second one open the photo.
    if (trigger === 'hover' && !touch) setActive(i)
  }

  const handleClick = (i, e) => {
    const item = items[i]
    if (i !== active && !touch) {
      e.preventDefault()
      setActive(i)
      return
    }

    if (item.link) return

    e.preventDefault()
    setActive(i)
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
        const expandable = !item.link && (isActive || touch)
        const preview = getPreviewSources(item)
        const imgProps = {
          className: `ag-panel__img${ready.has(i) ? ' is-ready' : ''}`,
          alt: item.alt || item.label || '',
          draggable: false,
          decoding: 'async',
          loading: isActive ? 'eager' : 'lazy',
          onLoad: () => markReady(i),
          onError: () => markReady(i),
          // A warmed file can finish loading before React attaches onLoad. The
          // fade starts from opacity 0, so missing that event would leave the
          // panel showing nothing but its blur.
          ref: (el) => {
            if (el?.complete) markReady(i)
          },
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
            className={`ag-panel${isActive ? ' ag-panel--active' : ''}${expandable ? ' ag-panel--expandable' : ''}`}
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
              expandable ? `${item.label}. View full size` : item.label
            }
          >
            <span className="ag-panel__frame">
              <span
                className="ag-panel__media"
                ref={(el) => {
                  mediaRefs.current[i] = el
                }}
                style={item.blur ? { backgroundImage: `url("${item.blur}")` } : undefined}
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
                ) : null}
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
