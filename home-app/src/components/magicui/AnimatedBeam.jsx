import { useId, useLayoutEffect, useState } from 'react'
import { motion } from 'motion/react'
import './AnimatedBeam.css'

const PATH_PADDING = 16

function buildBeamLayout({
  startX,
  startY,
  endX,
  endY,
  curvature,
  pathWidth,
}) {
  const controlX = (startX + endX) / 2 + curvature
  const controlY = (startY + endY) / 2
  const padding = Math.max(PATH_PADDING, pathWidth * 4, Math.abs(curvature) * 0.35)

  const minX = Math.min(startX, endX, controlX) - padding
  const minY = Math.min(startY, endY, controlY) - padding
  const maxX = Math.max(startX, endX, controlX) + padding
  const maxY = Math.max(startY, endY, controlY) + padding

  const width = Math.max(1, maxX - minX)
  const height = Math.max(1, maxY - minY)

  const pathD = `M ${startX - minX},${startY - minY} Q ${controlX - minX},${controlY - minY} ${endX - minX},${endY - minY}`

  return { pathD, x: minX, y: minY, width, height }
}

export default function AnimatedBeam({
  className = '',
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 5,
  delay = 0,
  pathColor = 'rgba(255, 255, 255, 0.2)',
  pathWidth = 2,
  pathOpacity = 0.35,
  gradientStartColor = '#1db7ff',
  gradientStopColor = '#c8ff00',
  bidirectional = false,
  repeat = Infinity,
  repeatDelay = 0,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}) {
  const id = useId().replace(/:/g, '')
  const [layout, setLayout] = useState(null)

  const gradientCoordinates = reverse
    ? {
        x1: ['90%', '-10%'],
        x2: ['100%', '0%'],
        y1: ['0%', '0%'],
        y2: ['0%', '0%'],
      }
    : {
        x1: ['10%', '110%'],
        x2: ['0%', '100%'],
        y1: ['0%', '0%'],
        y2: ['0%', '0%'],
      }

  useLayoutEffect(() => {
    let cancelled = false
    let rafId = 0
    const observed = new Set()

    const observeNode = (node, resizeObserver) => {
      if (!node || observed.has(node)) return
      observed.add(node)
      resizeObserver.observe(node)
    }

    const updatePath = () => {
      if (cancelled || !containerRef.current || !fromRef.current || !toRef.current) {
        return false
      }

      const containerRect = containerRef.current.getBoundingClientRect()
      const rectA = fromRef.current.getBoundingClientRect()
      const rectB = toRef.current.getBoundingClientRect()

      if (containerRect.width === 0 || containerRect.height === 0) return false

      const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset
      const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset
      const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset
      const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset

      setLayout(buildBeamLayout({
        startX,
        startY,
        endX,
        endY,
        curvature,
        pathWidth,
      }))
      return true
    }

    const resizeObserver = new ResizeObserver(() => updatePath())

    const retryUntilReady = () => {
      if (cancelled) return
      if (containerRef.current && fromRef.current && toRef.current) {
        observeNode(containerRef.current, resizeObserver)
        observeNode(fromRef.current, resizeObserver)
        observeNode(toRef.current, resizeObserver)
      }
      const ok = updatePath()
      if (!ok) rafId = requestAnimationFrame(retryUntilReady)
    }

    retryUntilReady()

    // All endpoints are inside the same scrolling container, so their relative
    // geometry does not change during document scroll. ResizeObserver covers
    // content/layout changes without forcing repeated layout reads per beam.

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
    }
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    pathWidth,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
  ])

  if (!layout) return null

  return (
    <svg
      fill="none"
      width={layout.width}
      height={layout.height}
      xmlns="http://www.w3.org/2000/svg"
      className={`animated-beam ${className}`.trim()}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ left: `${layout.x}px`, top: `${layout.y}px` }}
    >
      <defs>
        <motion.linearGradient
          className="animated-beam__gradient"
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{ x1: '0%', x2: '0%', y1: '0%', y2: '0%' }}
          animate={{
            x1: gradientCoordinates.x1,
            x2: gradientCoordinates.x2,
            y1: gradientCoordinates.y1,
            y2: gradientCoordinates.y2,
          }}
          transition={{
            delay,
            duration,
            ease: [0.16, 1, 0.3, 1],
            repeat,
            repeatDelay,
            repeatType: bidirectional ? 'mirror' : 'loop',
          }}
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStartColor} />
          <stop offset="32.5%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
      <path
        d={layout.pathD}
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        strokeLinecap="round"
      />
      <path
        d={layout.pathD}
        strokeWidth={pathWidth}
        stroke={`url(#${id})`}
        strokeOpacity="1"
        strokeLinecap="round"
      />
    </svg>
  )
}
