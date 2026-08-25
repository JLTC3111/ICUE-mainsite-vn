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

/**
 * How many panels the compact stack shows.
 *
 * Nine of them made the phone layout a wall of identical 84px bars, and the
 * extras are dropped rather than folded away: there is no "show more", and the
 * lightbox only walks what is on screen. A gallery is a sample, and three
 * photographs someone can actually see beat nine they scroll past.
 */
const COMPACT_COUNT = 3

/**
 * The two compact panel heights, px. `STRIP` mirrors `min-height` on `.ag-panel`
 * in the CSS; `ACTIVE` is what the open panel grows to.
 */
const COMPACT_STRIP = 84
const COMPACT_ACTIVE = 260

/**
 * How much nearer the middle of the screen a panel has to be before it takes
 * over from the open one, px. The compact layout is already self-stabilising —
 * opening a panel pulls its own centre toward the middle — so this only has to
 * settle a panel sitting exactly on the boundary between two states.
 */
const SCROLL_HYSTERESIS = 24

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

/** A horizontal drag has to beat this many px, and beat its own vertical drift. */
const SWIPE_THRESHOLD = 48

function GalleryLightbox({ item, index, count, onClose, onNavigate }) {
  const closeRef = useRef(null)
  const swipeRef = useRef(null)
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

  // The arrows are a 44px target at the edge of a phone screen; the gesture
  // people actually reach for is a swipe. Bound to the panel rather than the
  // backdrop so a drag that ends on the backdrop cannot also read as the
  // click that closes the viewer.
  const onTouchStart = (event) => {
    const point = event.changedTouches[0]
    swipeRef.current = { x: point.clientX, y: point.clientY }
  }

  const onTouchEnd = (event) => {
    const start = swipeRef.current
    swipeRef.current = null
    if (!start || count < 2) return
    const point = event.changedTouches[0]
    const dx = point.clientX - start.x
    const dy = point.clientY - start.y
    // Horizontal intent only: a vertical drag across a tall photograph is
    // someone trying to scroll, not asking for the next picture.
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return
    onNavigate(dx < 0 ? 1 : -1)
  }

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
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
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
          {item.label || count > 1 ? (
            <figcaption className="ag-lightbox__caption">
              {item.label}
              {/* On a phone only three panels are on screen, so without this
                  there is nothing to say the other six exist. */}
              {count > 1 ? (
                <span className="ag-lightbox__count">{`${index + 1} / ${count}`}</span>
              ) : null}
            </figcaption>
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
  // Sliced off the front so panel indices stay put across the breakpoint:
  // whatever `loaded`, `ready` and `active` hold for panels 0-2 still means the
  // same photographs after the stack collapses to three.
  const visibleItems = useMemo(
    () => (compact ? items.slice(0, COMPACT_COUNT) : items),
    [compact, items],
  )
  const count = visibleItems.length
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

  // Crossing the breakpoint pulls panels out from under `active`: this page
  // opens on the last photograph, which is index 8 of nine and does not exist
  // once the stack is three.
  useEffect(() => {
    setActive((current) => Math.min(current, count - 1))
  }, [count])

  // Not clamped to `count`: the viewer walks the whole set even where only
  // three panels are on screen, so only a shorter `items` can strand it.
  useEffect(() => {
    setLightboxIndex((current) =>
      current == null || current < items.length ? current : null,
    )
  }, [items])

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
  const sourceKey = useMemo(
    () => visibleItems.map((item) => item.image).join('|'),
    [visibleItems],
  )

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
        const item = visibleItems[index]
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

  // Scroll stands in for the pointer on the compact stack. Only there: in the
  // horizontal row every panel shares a vertical position, so scrolling cannot
  // tell them apart, and a narrow window on a desktop still has a real pointer.
  // Under reduced motion the panels would jump between sizes as the page moved
  // rather than ease, so that case keeps the old static stack.
  const scrollDriven = compact && touch && !prefersReduced

  // Every configuration now has a way to single a panel out — a cursor, scroll
  // position on the compact stack, or a tap everywhere else — so the drain, the
  // dim and the captions no longer check for one. They used to be muted on
  // touch because nothing moved `active` there and the panels would all have
  // sat grey and dimmed, reading as photographs that had failed to load.

  /**
   * The compact stack needs a real height before flex-grow has anything to
   * distribute. Under `height: auto` the flex line is exactly its content, free
   * space is zero, and every panel sits at its 84px minimum — which is why the
   * active panel never opened on a phone even though the GSAP tween was running.
   * Sizing the column from the two heights we want, and deriving the ratio to
   * match, makes that same tween produce them.
   */
  const compactSpan = COMPACT_ACTIVE + (count - 1) * COMPACT_STRIP
  const compactHeight = compactSpan + gap * (count - 1)
  const ratio = compact ? COMPACT_ACTIVE / compactSpan : expandRatio

  const applyLayout = useCallback(
    (animate) => {
      const panels = panelRefs.current
      if (!panels.length) return

      const r = Math.min(Math.max(ratio, 0.2), 0.9)
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
          // Draining the colour out of every panel but one says "this is the
          // one you are on".
          const gray = grayscale ? (isActive ? 0 : 1) : 0
          const dim = isActive ? 0 : 0.35
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
          if (isActive) {
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
      ratio,
      duration,
      ease,
      stacked,
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
        // Sized from the open panel, not the container: the container is the
        // whole column, and a media box that tall would be rasterised at four
        // times the size of the strip cropping it. One size covers all three
        // panels — the strips over-crop, which costs little across three of
        // them and avoids animating a per-panel size alongside the height.
        size = COMPACT_ACTIVE * 1.32
      } else {
        const total = vertical ? rect.height : rect.width
        const usable = Math.max(total - gap * (count - 1), 120)
        size = Math.max(140, usable * Math.min(Math.max(ratio, 0.2), 0.9) * 1.22)
      }

      mediaSizeRef.current = size
      el.style.setProperty('--ag-media-size', `${size}px`)
      applyLayout(!firstRunRef.current)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [applyLayout, gap, count, ratio, vertical, compact])

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

  // Whichever panel is nearest the middle of the screen is the one the reader
  // is looking at, so that is the one that opens — the phone equivalent of
  // moving a cursor down the row. Four rects per frame at most, only while the
  // stack is on screen, and only for the three panels the compact layout shows.
  useEffect(() => {
    if (!scrollDriven) return undefined
    const root = rootRef.current
    if (!root) return undefined

    let frame = 0

    const pick = () => {
      frame = 0
      const rect = root.getBoundingClientRect()
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return

      const mid = window.innerHeight / 2
      let best = -1
      let bestDistance = Infinity

      for (let i = 0; i < count; i += 1) {
        const panel = panelRefs.current[i]
        if (!panel) continue
        const box = panel.getBoundingClientRect()
        const distance = Math.abs(box.top + box.height / 2 - mid)
        if (distance < bestDistance) {
          bestDistance = distance
          best = i
        }
      }
      if (best < 0) return

      setActive((current) => {
        if (best === current) return current
        const held = panelRefs.current[current]
        if (held) {
          const box = held.getBoundingClientRect()
          const heldDistance = Math.abs(box.top + box.height / 2 - mid)
          if (heldDistance - bestDistance < SCROLL_HYSTERESIS) return current
        }
        return best
      })
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(pick)
    }

    pick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [scrollDriven, count])

  const handleEnter = (i) => {
    // Touch browsers synthesise mouseenter on tap. Letting it through would
    // select the panel before `handleClick` ran, so the click would find
    // `i === active` and open the photo — collapsing the two-stage tap the
    // tablet case depends on back into one.
    if (trigger === 'hover' && !touch) setActive(i)
  }

  const handleClick = (i, e) => {
    const item = visibleItems[i]
    if (i !== active && !scrollDriven) {
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
      const total = items.length
      setLightboxIndex((current) => {
        if (current == null) return current
        const next = (current + delta + total) % total
        // Past the compact cap there is no panel to follow the viewer, and
        // nothing behind it to warm — those photographs exist here only.
        if (next < count) {
          markLoaded(next)
          setActive(next)
        }
        return next
      })
    },
    [count, items, markLoaded],
  )

  // The panels only warm the photographs they show, so on a phone everything
  // past the third is a cold request. Warm the two either side of wherever the
  // reader is: that is the difference between a swipe landing on the picture
  // and landing on a dark rectangle.
  useEffect(() => {
    if (lightboxIndex == null) return undefined
    let cancelled = false
    const cancelIdle = scheduleIdle(async () => {
      const total = items.length
      for (const delta of [1, -1]) {
        if (cancelled) return
        const neighbour = items[(lightboxIndex + delta + total) % total]
        if (!neighbour) continue
        const { webp, jpeg } = getFullSources(neighbour)
        await warmImage(supportsWebp() && webp ? webp : jpeg)
      }
    })
    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [lightboxIndex, items])

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
        height: compact
          ? `${compactHeight}px`
          : vertical
            ? `${Math.round(height * 1.6)}px`
            : `${height}px`,
      }}
      role="list"
      aria-label={ariaLabel}
    >
      {visibleItems.map((item, i) => {
        const isActive = i === active
        const Tag = item.link ? 'a' : 'div'
        const loadImage = shouldLoadImage(i)
        // Only the open panel opens the photo, except on the compact stack
        // where scroll has already done the selecting and every tap goes
        // straight through to it.
        const expandable = !item.link && (isActive || scrollDriven)
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
        count={items.length}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
      />
    ) : null}
    </>
  )
}

export default AccordionGallery
