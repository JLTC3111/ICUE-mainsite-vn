import { useEffect, useId, useLayoutEffect, useState } from 'react'
import { motion } from 'motion/react'
import './AnimatedBeam.css'

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
  const [pathD, setPathD] = useState('')
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 })

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

    const observeNode = (node) => {
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

      observeNode(containerRef.current)
      observeNode(fromRef.current)
      observeNode(toRef.current)

      const svgWidth = containerRect.width
      const svgHeight = containerRect.height

      const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset
      const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset
      const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset
      const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset

      const controlX = (startX + endX) / 2 + curvature
      const controlY = (startY + endY) / 2

      setSvgDimensions({ width: svgWidth, height: svgHeight })
      setPathD(`M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`)
      return true
    }

    const resizeObserver = new ResizeObserver(() => updatePath())

    const retryUntilReady = () => {
      if (cancelled) return
      const ok = updatePath()
      if (!ok) rafId = requestAnimationFrame(retryUntilReady)
    }

    retryUntilReady()

    window.addEventListener('scroll', updatePath, { passive: true })
    window.addEventListener('resize', updatePath)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('scroll', updatePath)
      window.removeEventListener('resize', updatePath)
    }
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
  ])

  if (!pathD || svgDimensions.width === 0) return null

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={`animated-beam ${className}`.trim()}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
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
        d={pathD}
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        strokeLinecap="round"
      />
      <path
        d={pathD}
        strokeWidth={pathWidth}
        stroke={`url(#${id})`}
        strokeOpacity="1"
        strokeLinecap="round"
      />
    </svg>
  )
}
