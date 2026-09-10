import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'

import './ScrollVelocity.css'

/**
 * React Bits "Scroll Velocity" — a looping marquee that speeds up and
 * reverses with page-scroll velocity.
 * @see https://reactbits.dev/text-animations/scroll-velocity
 *
 * Vendored as CSS (no Tailwind). Site-specific guards:
 *  - `prefers-reduced-motion` skips the frame loop and renders one static row.
 *  - Hover pauses the loop so nested links stay clickable.
 *  - Pointer-drag scrubs the strip in either direction; a click without a
 *    drag still follows nested links.
 *  - `MotionConfig reducedMotion="user"` does not stop `useAnimationFrame`.
 */

const DRAG_THRESHOLD = 6

function wrap(min, max, value) {
  const range = max - min
  if (range === 0) return min
  const mod = (((value - min) % range) + range) % range
  return mod + min
}

function useElementWidth(ref) {
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const updateWidth = () => {
      setWidth(el.offsetWidth)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(el)
    window.addEventListener('resize', updateWidth)
    el.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', updateWidth, { once: true })
    })

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [ref])

  return width
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => (
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ))

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}

function VelocityText({
  children,
  baseVelocity = 100,
  scrollContainerRef,
  className = '',
  damping = 50,
  stiffness = 400,
  numCopies = 6,
  velocityMapping = { input: [0, 1000], output: [0, 5] },
  parallaxClassName = '',
  scrollerClassName = '',
  parallaxStyle,
  scrollerStyle,
  paused = false,
  draggable = true,
}) {
  const baseX = useMotionValue(0)
  const scrollOptions = scrollContainerRef ? { container: scrollContainerRef } : {}
  const { scrollY } = useScroll(scrollOptions)
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, { damping, stiffness })
  const velocityFactor = useTransform(
    smoothVelocity,
    velocityMapping.input || [0, 1000],
    velocityMapping.output || [0, 5],
    { clamp: false },
  )

  const copyRef = useRef(null)
  const copyWidth = useElementWidth(copyRef)
  const directionFactor = useRef(1)
  const pausedRef = useRef(paused)
  const draggingRef = useRef(false)
  const dragOriginX = useRef(0)
  const dragOriginBaseX = useRef(0)
  const suppressClickRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  pausedRef.current = paused

  const x = useTransform(baseX, (value) => {
    if (copyWidth === 0) return '0px'
    return `${wrap(-copyWidth, 0, value)}px`
  })

  useAnimationFrame((_time, delta) => {
    if (pausedRef.current || draggingRef.current || copyWidth === 0) return

    let moveBy = directionFactor.current * baseVelocity * (delta / 1000)
    const factor = velocityFactor.get()

    if (factor < 0) directionFactor.current = -1
    else if (factor > 0) directionFactor.current = 1

    moveBy += directionFactor.current * moveBy * factor
    baseX.set(baseX.get() + moveBy)
  })

  const endDrag = (event) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
  }

  const onPointerDown = (event) => {
    if (!draggable || event.button > 0) return
    draggingRef.current = true
    suppressClickRef.current = false
    dragOriginX.current = event.clientX
    dragOriginBaseX.current = baseX.get()
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event) => {
    if (!draggingRef.current) return
    const dx = event.clientX - dragOriginX.current
    if (Math.abs(dx) < DRAG_THRESHOLD && !suppressClickRef.current) return
    suppressClickRef.current = true
    setDragging(true)
    if (dx > 0) directionFactor.current = 1
    else if (dx < 0) directionFactor.current = -1
    baseX.set(dragOriginBaseX.current + dx)
  }

  const onClickCapture = (event) => {
    if (!suppressClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }

  const copies = []
  for (let index = 0; index < numCopies; index += 1) {
    copies.push(
      <span
        className={`scroll-velocity__copy ${className}`.trim()}
        key={index}
        ref={index === 0 ? copyRef : null}
      >
        {children}
      </span>,
    )
  }

  const parallaxClass = [
    'scroll-velocity__parallax',
    'cursor-pointer',
    draggable ? 'scroll-velocity__parallax--draggable' : '',
    dragging ? 'is-dragging' : '',
    parallaxClassName,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={parallaxClass}
      data-decorative-motion
      style={parallaxStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={onClickCapture}
    >
      <motion.div
        className={`scroll-velocity__scroller ${scrollerClassName}`.trim()}
        style={{ x, ...scrollerStyle }}
      >
        {copies}
      </motion.div>
    </div>
  )
}

export default function ScrollVelocity({
  scrollContainerRef,
  texts = [],
  velocity = 100,
  className = '',
  damping = 50,
  stiffness = 400,
  numCopies = 6,
  velocityMapping = { input: [0, 1000], output: [0, 5] },
  parallaxClassName = '',
  scrollerClassName = '',
  parallaxStyle,
  scrollerStyle,
  draggable = true,
}) {
  const reduceMotion = usePrefersReducedMotion()
  const [paused, setPaused] = useState(false)

  if (reduceMotion) {
    return (
      <section className="scroll-velocity scroll-velocity--static">
        {texts.map((text, index) => (
          <div
            className={`scroll-velocity__parallax cursor-pointer ${parallaxClassName}`.trim()}
            key={index}
          >
            <div className={`scroll-velocity__scroller ${scrollerClassName}`.trim()}>
              <span className={`scroll-velocity__copy ${className}`.trim()}>
                {text}
              </span>
            </div>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section
      className="scroll-velocity"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {texts.map((text, index) => (
        <VelocityText
          key={index}
          className={className}
          baseVelocity={index % 2 !== 0 ? -velocity : velocity}
          scrollContainerRef={scrollContainerRef}
          damping={damping}
          stiffness={stiffness}
          numCopies={numCopies}
          velocityMapping={velocityMapping}
          parallaxClassName={parallaxClassName}
          scrollerClassName={scrollerClassName}
          parallaxStyle={parallaxStyle}
          scrollerStyle={scrollerStyle}
          paused={paused}
          draggable={draggable}
        >
          {text}
        </VelocityText>
      ))}
    </section>
  )
}
