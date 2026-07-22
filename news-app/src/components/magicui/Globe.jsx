import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'
import { useMotionValue, useSpring } from 'motion/react'
import {
  NEWSROOM_GALLERY_BG_LIGHT,
  newsroomGalleryBgToRgb,
} from '../../lib/newsroom'
import './Globe.css'

const MOVEMENT_DAMPING = 1400

export const NEWSROOM_GLOBE_CONFIG_LIGHT = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.32,
  dark: 0,
  diffuse: 0.55,
  mapSamples: 16000,
  mapBrightness: 0.88,
  baseColor: newsroomGalleryBgToRgb(NEWSROOM_GALLERY_BG_LIGHT),
  markerColor: newsroomGalleryBgToRgb('#8c929c'),
  glowColor: newsroomGalleryBgToRgb(NEWSROOM_GALLERY_BG_LIGHT),
  markers: [],
}

export const NEWSROOM_GLOBE_CONFIG_DARK = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.32,
  dark: 1,
  diffuse: 0.9,
  mapSamples: 16000,
  mapBrightness: 3.85,
  baseColor: [0.12, 0.14, 0.2],
  markerColor: [0.45, 0.48, 0.52],
  glowColor: [0.22, 0.42, 0.88],
  markers: [],
}

/** @deprecated Use NEWSROOM_GLOBE_CONFIG_DARK or _LIGHT */
export const NEWSROOM_GLOBE_CONFIG = NEWSROOM_GLOBE_CONFIG_DARK

export default function Globe({
  className = '',
  config = NEWSROOM_GLOBE_CONFIG,
  interactive = false,
  reduceMotion = false,
  quality = 'full',
  pauseWhenHidden = false,
}) {
  const canvasRef = useRef(null)
  const shellRef = useRef(null)
  const phiRef = useRef(0)
  const widthRef = useRef(0)
  const pointerInteracting = useRef(null)
  const pointerInteractionMovement = useRef(0)
  const globeRef = useRef(null)
  const pausedRef = useRef(false)

  const r = useMotionValue(0)
  const rs = useSpring(r, {
    mass: 1,
    damping: 30,
    stiffness: 100,
  })

  const updatePointerInteraction = (value) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? 'grabbing' : 'grab'
    }
  }

  const updateMovement = (clientX) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      pointerInteractionMovement.current = delta
      r.set(r.get() + delta / MOVEMENT_DAMPING)
    }
  }

  useEffect(() => {
    if (reduceMotion || quality === 'off' || !canvasRef.current) return undefined

    const onResize = () => {
      if (canvasRef.current) {
        widthRef.current = canvasRef.current.offsetWidth
      }
    }

    window.addEventListener('resize', onResize)
    onResize()

    const globe = createGlobe(canvasRef.current, {
      ...config,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      onRender: (state) => {
        if (pausedRef.current) return
        if (!pointerInteracting.current) phiRef.current += 0.007
        state.phi = phiRef.current + rs.get()
        state.width = widthRef.current * 2
        state.height = widthRef.current * 2
      },
    })
    globeRef.current = globe

    const canvas = canvasRef.current
    const frame = requestAnimationFrame(() => {
      canvas.style.opacity = '1'
    })

    return () => {
      cancelAnimationFrame(frame)
      globe.destroy()
      globeRef.current = null
      window.removeEventListener('resize', onResize)
    }
  }, [config, reduceMotion, quality, rs])

  useEffect(() => {
    if (!pauseWhenHidden || reduceMotion || quality === 'off') return undefined

    const node = shellRef.current || canvasRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        pausedRef.current = !entry.isIntersecting
      },
      { threshold: 0.05, rootMargin: '12% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [pauseWhenHidden, reduceMotion, quality])

  if (reduceMotion || quality === 'off') return null

  const pointerHandlers = interactive
    ? {
        onPointerDown: (event) => {
          pointerInteracting.current = event.clientX
          updatePointerInteraction(event.clientX)
        },
        onPointerUp: () => updatePointerInteraction(null),
        onPointerOut: () => updatePointerInteraction(null),
        onMouseMove: (event) => updateMovement(event.clientX),
        onTouchMove: (event) => {
          if (event.touches[0]) updateMovement(event.touches[0].clientX)
        },
      }
    : undefined

  return (
    <div ref={shellRef} className={`magic-globe${className ? ` ${className}` : ''}`}>
      <canvas
        ref={canvasRef}
        className="magic-globe__canvas"
        aria-hidden="true"
        {...pointerHandlers}
      />
    </div>
  )
}
