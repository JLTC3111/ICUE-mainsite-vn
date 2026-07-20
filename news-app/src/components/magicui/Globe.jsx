import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'
import { useMotionValue, useSpring } from 'motion/react'
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
  mapBrightness: 1.42,
  baseColor: [0.72, 0.76, 0.82],
  markerColor: [54 / 255, 138 / 255, 223 / 255],
  glowColor: [0.55, 0.75, 1],
  markers: [
    { location: [21.0285, 105.8542], size: 0.1 },
    { location: [10.8231, 106.6297], size: 0.08 },
    { location: [14.5995, 120.9842], size: 0.05 },
    { location: [39.9042, 116.4074], size: 0.06 },
    { location: [40.7128, -74.006], size: 0.06 },
    { location: [51.5074, -0.1278], size: 0.05 },
    { location: [35.6762, 139.6503], size: 0.05 },
  ],
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
  mapBrightness: 4.8,
  baseColor: [0.12, 0.14, 0.2],
  markerColor: [54 / 255, 138 / 255, 223 / 255],
  glowColor: [0.22, 0.42, 0.88],
  markers: [
    { location: [21.0285, 105.8542], size: 0.1 },
    { location: [10.8231, 106.6297], size: 0.08 },
    { location: [14.5995, 120.9842], size: 0.05 },
    { location: [39.9042, 116.4074], size: 0.06 },
    { location: [40.7128, -74.006], size: 0.06 },
    { location: [51.5074, -0.1278], size: 0.05 },
    { location: [35.6762, 139.6503], size: 0.05 },
  ],
}

/** @deprecated Use NEWSROOM_GLOBE_CONFIG_DARK or _LIGHT */
export const NEWSROOM_GLOBE_CONFIG = NEWSROOM_GLOBE_CONFIG_DARK

export default function Globe({
  className = '',
  config = NEWSROOM_GLOBE_CONFIG,
  interactive = false,
  reduceMotion = false,
}) {
  const canvasRef = useRef(null)
  const phiRef = useRef(0)
  const widthRef = useRef(0)
  const pointerInteracting = useRef(null)
  const pointerInteractionMovement = useRef(0)

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
    if (reduceMotion || !canvasRef.current) return undefined

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
        if (!pointerInteracting.current) phiRef.current += 0.007
        state.phi = phiRef.current + rs.get()
        state.width = widthRef.current * 2
        state.height = widthRef.current * 2
      },
    })

    const canvas = canvasRef.current
    const frame = requestAnimationFrame(() => {
      canvas.style.opacity = '1'
    })

    return () => {
      cancelAnimationFrame(frame)
      globe.destroy()
      window.removeEventListener('resize', onResize)
    }
  }, [config, reduceMotion, rs])

  if (reduceMotion) return null

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
    <div className={`magic-globe${className ? ` ${className}` : ''}`}>
      <canvas
        ref={canvasRef}
        className="magic-globe__canvas"
        aria-hidden="true"
        {...pointerHandlers}
      />
    </div>
  )
}
