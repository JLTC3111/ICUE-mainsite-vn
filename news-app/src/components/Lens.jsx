import { useCallback, useMemo, useRef, useState } from 'react'
import { ZoomIn } from 'lucide-react'
import { AnimatePresence, motion, useMotionTemplate } from 'motion/react'
import './Lens.css'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
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
}) {
  const [isHovering, setIsHovering] = useState(false)
  const [mousePosition, setMousePosition] = useState(position)
  const containerRef = useRef(null)

  const currentPosition = useMemo(() => {
    if (isStatic) return position
    if (defaultPosition && !isHovering) return defaultPosition
    return mousePosition
  }, [isStatic, position, defaultPosition, isHovering, mousePosition])

  const handleMouseMove = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }, [])

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') setIsHovering(false)
  }, [])

  const maskImage = useMotionTemplate`radial-gradient(circle ${lensSize / 2}px at ${currentPosition.x}px ${currentPosition.y}px, ${lensColor} 100%, transparent 100%)`

  if (disabled) {
    return (
      <div className={cn('lens', 'lens--disabled', className)}>
        {children}
      </div>
    )
  }

  const { x, y } = currentPosition

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
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      aria-hidden={ariaLabel ? undefined : true}
      {...(ariaLabel ? { role: 'region', 'aria-label': ariaLabel } : {})}
      tabIndex={-1}
    >
      {children}
      {!disabled && isHovering && (
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
    </div>
  )
}
