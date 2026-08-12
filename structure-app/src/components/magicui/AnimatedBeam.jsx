import { useEffect, useId, useState } from 'react'
import { motion } from 'motion/react'
import './AnimatedBeam.css'

/**
 * Magic UI Animated Beam — path-following light streak between two elements.
 * @see https://magicui.design/docs/components/animated-beam
 */
export function AnimatedBeam({
  className = '',
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 5,
  delay = 0,
  pathColor = 'gray',
  pathWidth = 2,
  pathOpacity = 0.2,
  gradientStartColor = '#ffaa40',
  gradientStopColor = '#9c40ff',
  repeat = Infinity,
  repeatDelay = 0,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}) {
  const id = useId()
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

  useEffect(() => {
    const updatePath = () => {
      if (!containerRef?.current || !fromRef?.current || !toRef?.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const rectA = fromRef.current.getBoundingClientRect()
      const rectB = toRef.current.getBoundingClientRect()

      const svgWidth = containerRect.width
      const svgHeight = containerRect.height
      // Skip the state write when the box has not actually changed size —
      // ResizeObserver also fires for changes that leave this container alone.
      setSvgDimensions((current) => (
        current.width === svgWidth && current.height === svgHeight
          ? current
          : { width: svgWidth, height: svgHeight }
      ))

      const startX =
        rectA.left - containerRect.left + rectA.width / 2 + startXOffset
      const startY =
        rectA.top - containerRect.top + rectA.height / 2 + startYOffset
      const endX =
        rectB.left - containerRect.left + rectB.width / 2 + endXOffset
      const endY =
        rectB.top - containerRect.top + rectB.height / 2 + endYOffset

      const controlY = startY - curvature
      const d = `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`
      // Same reasoning: an identical `d` string means the beam has not moved,
      // so re-rendering the <path> would produce byte-identical output.
      setPathD((current) => (current === d ? current : d))
    }

    /*
     * Coalesce the observer to one measurement per frame. A single layout
     * change usually fires the callback once per observed node (container,
     * from, to), and each fire measured three rects and set state — three
     * layouts and up to three renders for one visual change.
     */
    let measureFrame = 0
    const resizeObserver = new ResizeObserver(() => {
      if (measureFrame) return
      measureFrame = requestAnimationFrame(() => {
        measureFrame = 0
        updatePath()
      })
    })
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    updatePath()

    return () => {
      if (measureFrame) cancelAnimationFrame(measureFrame)
      resizeObserver.disconnect()
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

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={`animated-beam ${className}`.trim()}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
      aria-hidden="true"
    >
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
          }}
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStartColor} />
          <stop offset="32.5%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  )
}
