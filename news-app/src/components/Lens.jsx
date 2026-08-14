import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ZoomIn } from 'lucide-react'
import { AnimatePresence, motion, useMotionTemplate } from 'motion/react'
import './Lens.css'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Cheap, synchronous gate for the 3D magnifying glass. Everything expensive —
 * the renderer chunk and the baked model — stays behind a dynamic import that
 * only runs once this passes.
 */
function canUseLensGlass() {
  if (typeof window === 'undefined' || typeof WebGL2RenderingContext === 'undefined') return false
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return !navigator.connection?.saveData
}

let prefetchScheduled = false

/**
 * Warms the renderer and model at idle so the first hover shows the glass
 * rather than the fallback icon. Once per page, never on a metered or slow
 * connection, and never before the page has finished loading.
 */
function scheduleLensGlassPrefetch() {
  if (prefetchScheduled) return
  prefetchScheduled = true
  if (/2g/.test(navigator.connection?.effectiveType || '')) return

  const warm = () => {
    const idle = window.requestIdleCallback || ((task) => window.setTimeout(task, 1500))
    idle(() => {
      import('../lib/lensGlass').then((module) => module.prefetchLensGlass()).catch(() => {})
    })
  }

  if (document.readyState === 'complete') warm()
  else window.addEventListener('load', warm, { once: true })
}

export default function Lens({
  children,
  className,
  zoomFactor = 1.3,
  lensSize = 170,
  isStatic = false,
  position = { x: 0, y: 0 },
  defaultPosition,
  duration = 0.1,
  lensColor = 'black',
  ariaLabel,
  disabled = false,
  glass3d = true,
  // Defaults to the size at which the bezel frames the zoom circle, which is
  // ~2.4x lensSize for this model. Set it to break that lock; lower lensSize to
  // shrink the magnifier and its zoom circle together.
  glassSize,
}) {
  const [isHovering, setIsHovering] = useState(false)
  const [mousePosition, setMousePosition] = useState(position)
  const [glassReady, setGlassReady] = useState(false)
  const containerRef = useRef(null)
  const glassSlotRef = useRef(null)
  const glassRef = useRef(null)
  // Invalidates in-flight mounts when the pointer leaves before the chunk lands.
  const glassTokenRef = useRef(0)

  // A static lens has no cursor to hang the glass on.
  const glassEnabled = glass3d && !disabled && !isStatic

  const currentPosition = useMemo(() => {
    if (isStatic) return position
    if (defaultPosition && !isHovering) return defaultPosition
    return mousePosition
  }, [isStatic, position, defaultPosition, isHovering, mousePosition])

  const releaseGlass = useCallback(() => {
    glassTokenRef.current += 1
    glassRef.current?.dispose()
    glassRef.current = null
  }, [])

  const handleMouseEnter = useCallback((event) => {
    setIsHovering(true)
    if (!glassEnabled || !canUseLensGlass()) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const slot = glassSlotRef.current
    if (!slot) return

    const token = ++glassTokenRef.current
    import('../lib/lensGlass')
      .then((module) => module.mountLensGlass(slot, lensSize, glassSize, x, y))
      .then((glass) => {
        if (!glass) return
        if (glassTokenRef.current !== token) {
          glass.dispose()
          return
        }
        glassRef.current = glass
        setGlassReady(true)
      })
      .catch(() => {})
  }, [glassEnabled, lensSize, glassSize])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    setGlassReady(false)
    releaseGlass()
  }, [releaseGlass])

  const handleMouseMove = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    setMousePosition({ x, y })
    glassRef.current?.move(x, y)
  }, [])

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') setIsHovering(false)
  }, [])

  useEffect(() => {
    if (glassEnabled && canUseLensGlass()) scheduleLensGlassPrefetch()
  }, [glassEnabled])

  useEffect(() => {
    if (!glassEnabled) releaseGlass()
    return releaseGlass
  }, [glassEnabled, releaseGlass])

  const maskImage = useMotionTemplate`radial-gradient(circle ${lensSize / 2}px at ${currentPosition.x}px ${currentPosition.y}px, ${lensColor} 100%, transparent 100%)`

  if (disabled) {
    return (
      <div className={cn('lens', 'lens--disabled', className)}>
        {children}
      </div>
    )
  }

  const { x, y } = currentPosition
  const showGlass = glassEnabled && glassReady

  const lensContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.58 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration }}
      className="lens__zoom"
      style={{
        maskImage,
        WebkitMaskImage: maskImage,
        transformOrigin: `${x}px ${y}px`,
      }}
    >
      <div
        className="lens__zoom-inner"
        style={{
          transform: `scale(${zoomFactor})`,
          transformOrigin: `${x}px ${y}px`,
        }}
      >
        {children}
      </div>
    </motion.div>
  )

  return (
    <div
      ref={containerRef}
      className={cn('lens', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      aria-hidden={ariaLabel ? undefined : true}
      {...(ariaLabel ? { role: 'region', 'aria-label': ariaLabel } : {})}
      tabIndex={-1}
    >
      {children}
      {isHovering && !showGlass && (
        <span
          className="lens__indicator"
          aria-hidden
          style={{ left: x, top: y }}
        >
          <ZoomIn size={22} strokeWidth={2} />
        </span>
      )}
      {isStatic || defaultPosition ? (
        lensContent
      ) : (
        <AnimatePresence mode="popLayout">
          {isHovering ? lensContent : null}
        </AnimatePresence>
      )}
      {/* The WebGL canvas is appended here imperatively — an element React owns
          but never fills keeps its reconciliation away from a foreign child. */}
      {glassEnabled && <div ref={glassSlotRef} className="lens__glass-slot" aria-hidden />}
    </div>
  )
}
