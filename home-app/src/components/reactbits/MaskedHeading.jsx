import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import { gsap } from 'gsap'

import './MaskedHeading.css'

/**
 * React Bits "Masked Heading" — heading text used as a clip path over a photo,
 * so the image shows only through the letterforms.
 * @see https://reactbits.dev/text-animations/masked-heading
 *
 * The measure/clip machinery is upstream's. The drift loop is not.
 *
 * Upstream starts a `requestAnimationFrame` loop on mount and never stops it:
 * it runs while the heading is scrolled off screen, while the tab is in the
 * background, and under `prefers-reduced-motion`. On this page that loop would
 * be competing with a WebGL backdrop for the same frame budget, for an effect
 * nobody is looking at. Here it is gated on all three — IntersectionObserver,
 * visibilitychange, reduced motion — and never starts at all when `drift` and
 * `parallax` are both zero, since then it has nothing to compute.
 *
 * Whenever the loop is not running, `place()` is still called once so the
 * image sits correctly inside the letters. The heading is never blank.
 */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

const MaskedHeading = ({
  text = 'Designed in the details',
  tag = 'h2',
  mediaType = 'image',
  src = '',
  poster = '',
  alt = '',
  fillScale = 1.25,
  parallax = 26,
  drift = 18,
  brightness = 1,
  saturation = 1,
  grayscale = false,
  reveal = 'rise',
  duration = 1.1,
  stagger = 0.09,
  trigger = 'view',
  align = 'center',
  weight = 700,
  tracking = -0.03,
  lineHeight = 1.06,
  textScale = 0.115,
  className = '',
  style,
  ...rest
}) => {
  const rootRef = useRef(null)
  const measureRef = useRef(null)
  const revealRef = useRef(null)
  const mediaRef = useRef(null)
  const wordRefs = useRef([])
  const baseRefs = useRef([])
  const glyphRefs = useRef([])
  const tweenRef = useRef(null)
  const offsetRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  const clipId = `mh-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const words = useMemo(() => String(text).split(/\s+/).filter(Boolean), [text])

  const settingsRef = useRef({})
  settingsRef.current = { fillScale, parallax, drift, brightness, saturation, grayscale, textScale }

  const place = useCallback(() => {
    const root = rootRef.current
    const media = mediaRef.current
    if (!root || !media) return
    const s = settingsRef.current
    const W = root.clientWidth
    const H = root.clientHeight
    const off = offsetRef.current

    const maxX = Math.max(0, ((s.fillScale - 1) / 2) * W)
    const maxY = Math.max(0, ((s.fillScale - 1) / 2) * H)

    media.style.transform = `translate3d(${clamp(off.x, -maxX, maxX).toFixed(2)}px, ${clamp(off.y, -maxY, maxY).toFixed(2)}px, 0) scale(${s.fillScale})`
    media.style.filter = `brightness(${s.brightness}) saturate(${s.saturation})${s.grayscale ? ' grayscale(1)' : ''}`
  }, [])

  const sync = useCallback(() => {
    const root = rootRef.current
    const measure = measureRef.current
    if (!root || !measure) return
    const s = settingsRef.current

    root.style.fontSize = `${clamp(root.clientWidth * s.textScale, 20, 200).toFixed(1)}px`

    const cs = window.getComputedStyle(measure)
    const rootRect = root.getBoundingClientRect()
    for (let i = 0; i < wordRefs.current.length; i += 1) {
      const box = wordRefs.current[i]
      const base = baseRefs.current[i]
      const glyph = glyphRefs.current[i]
      if (!box || !base || !glyph) continue
      const boxRect = box.getBoundingClientRect()
      const baseRect = base.getBoundingClientRect()
      glyph.setAttribute('x', `${boxRect.left - rootRect.left}`)
      // SVG `y` is the baseline; the baseline marker sits on it in the HTML measure.
      glyph.setAttribute('y', `${baseRect.bottom - rootRect.top}`)
      glyph.style.fontFamily = cs.fontFamily
      glyph.style.fontSize = cs.fontSize
      glyph.style.fontWeight = cs.fontWeight
      glyph.style.fontStyle = cs.fontStyle
      glyph.style.letterSpacing = cs.letterSpacing
    }
    place()
  }, [place])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(root)
    if (document.fonts?.ready) document.fonts.ready.then(sync).catch(() => {})

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motionless = () =>
      reducedMotionQuery.matches
      || (settingsRef.current.drift <= 0 && settingsRef.current.parallax <= 0)

    let raf = 0
    let last = performance.now()
    let clock = 0
    let onScreen = false
    let pageVisible = !document.hidden

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      clock += dt
      const s = settingsRef.current
      const off = offsetRef.current

      const dx = Math.sin(clock * 0.21) * s.drift
      const dy = Math.cos(clock * 0.17) * s.drift * 0.6

      const ease = 1 - Math.exp(-dt / 0.18)
      off.x += (off.tx + dx - off.x) * ease
      off.y += (off.ty + dy - off.y) * ease

      place()
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (raf !== 0 || !onScreen || !pageVisible || motionless()) return
      // Reset the clock so a heading scrolled back into view resumes from where
      // it drifted to rather than jumping by however long it was away.
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const stop = () => {
      if (raf === 0) return
      cancelAnimationFrame(raf)
      raf = 0
    }

    const onMove = (e) => {
      const s = settingsRef.current
      if (s.parallax <= 0 || reducedMotionQuery.matches) return
      const r = root.getBoundingClientRect()
      const nx = ((e.clientX - r.left) / (r.width || 1)) * 2 - 1
      const ny = ((e.clientY - r.top) / (r.height || 1)) * 2 - 1
      offsetRef.current.tx = clamp(nx, -1, 1) * -s.parallax
      offsetRef.current.ty = clamp(ny, -1, 1) * -s.parallax
    }

    const onLeave = () => {
      offsetRef.current.tx = 0
      offsetRef.current.ty = 0
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting
        if (onScreen) start()
        else stop()
      },
      { threshold: 0 },
    )
    io.observe(root)

    const onVisibility = () => {
      pageVisible = !document.hidden
      if (pageVisible) start()
      else stop()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onReducedMotionChange = () => {
      if (reducedMotionQuery.matches) {
        stop()
        offsetRef.current.tx = 0
        offsetRef.current.ty = 0
        offsetRef.current.x = 0
        offsetRef.current.y = 0
        place()
      } else {
        start()
      }
    }
    reducedMotionQuery.addEventListener('change', onReducedMotionChange)

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMotionQuery.removeEventListener('change', onReducedMotionChange)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
    }
  }, [place, sync])

  useEffect(() => {
    sync()
  }, [sync, words, tag, align, weight, tracking, lineHeight, textScale])

  useEffect(() => {
    const root = rootRef.current
    const layer = revealRef.current
    if (!root || !layer) return undefined
    const glyphs = glyphRefs.current.filter(Boolean)
    if (!glyphs.length) return undefined

    const riseDistance = () => (parseFloat(window.getComputedStyle(root).fontSize) || 48) * 1.15

    const settle = () => {
      gsap.set(glyphs, { y: 0 })
      gsap.set(layer, { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)' })
    }

    const rest = () => {
      if (reveal === 'rise') {
        gsap.set(glyphs, { y: riseDistance() })
      } else if (reveal === 'wipe') {
        gsap.set(layer, { clipPath: 'inset(0% 100% 0% 0%)' })
      } else if (reveal === 'fade') {
        gsap.set(layer, { opacity: 0, scale: 1.08 })
      }
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reveal === 'none' || reduce) {
      settle()
      return undefined
    }

    const play = () => {
      tweenRef.current?.kill()
      if (reveal === 'rise') {
        gsap.set(layer, { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)' })
        tweenRef.current = gsap.fromTo(
          glyphs,
          { y: riseDistance() },
          { y: 0, duration, stagger, ease: 'power4.out', overwrite: 'auto' },
        )
      } else if (reveal === 'wipe') {
        gsap.set(glyphs, { y: 0 })
        const state = { p: 100 }
        tweenRef.current = gsap.to(state, {
          p: 0,
          duration,
          ease: 'power3.inOut',
          overwrite: 'auto',
          onUpdate: () => {
            layer.style.clipPath = `inset(0% ${state.p}% 0% 0%)`
          },
        })
      } else {
        gsap.set(glyphs, { y: 0 })
        tweenRef.current = gsap.fromTo(
          layer,
          { opacity: 0, scale: 1.08 },
          { opacity: 1, scale: 1, duration, ease: 'power3.out', overwrite: 'auto' },
        )
      }
    }

    if (trigger === 'hover') {
      settle()
      root.addEventListener('pointerenter', play)
      return () => {
        root.removeEventListener('pointerenter', play)
        tweenRef.current?.kill()
      }
    }

    if (trigger === 'view') {
      settle()
      rest()
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            play()
            io.disconnect()
          }
        },
        { threshold: 0.25 },
      )
      io.observe(root)
      return () => {
        io.disconnect()
        tweenRef.current?.kill()
      }
    }

    play()
    return () => tweenRef.current?.kill()
  }, [reveal, trigger, duration, stagger, words])

  const Tag = tag

  return (
    <Tag
      ref={rootRef}
      className={`masked-heading ${className}`.trim()}
      style={{
        textAlign: align,
        fontWeight: weight,
        letterSpacing: `${tracking}em`,
        lineHeight,
        ...style,
      }}
      {...rest}
    >
      {/* The visible text is transparent and exists only to be measured; the
          clip path below is what the reader actually sees. Screen readers get
          the real heading from this copy, so it must stay in the tree. */}
      <span ref={measureRef} className="masked-heading__measure">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            ref={(el) => {
              wordRefs.current[i] = el
            }}
            className="masked-heading__word"
          >
            {word}
            <i
              ref={(el) => {
                baseRefs.current[i] = el
              }}
              className="masked-heading__baseline"
            />
          </span>
        ))}
      </span>

      <svg className="masked-heading__defs" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            {words.map((word, i) => (
              <text
                key={`${word}-${i}`}
                ref={(el) => {
                  glyphRefs.current[i] = el
                }}
              >
                {word}
              </text>
            ))}
          </clipPath>
        </defs>
      </svg>

      <span ref={revealRef} className="masked-heading__reveal" aria-hidden="true">
        <span className="masked-heading__clip" style={{ clipPath: `url(#${clipId})` }}>
          <span ref={mediaRef} className="masked-heading__media">
            {mediaType === 'video' ? (
              <video
                className="masked-heading__source"
                src={src}
                poster={poster}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                className="masked-heading__source"
                src={src}
                alt={alt}
                draggable={false}
                loading="lazy"
                decoding="async"
              />
            )}
          </span>
        </span>
      </span>
    </Tag>
  )
}

export default MaskedHeading
