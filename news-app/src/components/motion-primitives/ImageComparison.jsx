import { createContext, useContext, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react'
import './ImageComparison.css'

const ImageComparisonContext = createContext(undefined)

const DEFAULT_SPRING_OPTIONS = {
  bounce: 0,
  duration: 0,
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function ImageComparison({
  children,
  className,
  enableHover = false,
  hoverOnly = false,
  springOptions,
}) {
  const containerRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [useDirectMotion, setUseDirectMotion] = useState(false)
  const isLockedRef = useRef(false)
  const isDraggingRef = useRef(false)
  const isTouchPointerRef = useRef(false)
  const motionValue = useMotionValue(50)
  const springPosition = useSpring(motionValue, springOptions ?? DEFAULT_SPRING_OPTIONS)
  const motionSliderPosition = (enableHover || hoverOnly || useDirectMotion)
    ? motionValue
    : springPosition
  const [sliderPosition, setSliderPosition] = useState(50)
  const dragMovedRef = useRef(false)
  const pointerActiveRef = useRef(false)
  const suppressClickRef = useRef(false)

  const setLocked = (locked) => {
    isLockedRef.current = locked
    setIsLocked(locked)
  }

  const updatePosition = (event) => {
    const container = containerRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const x = event.clientX - containerRect.left
    const width = Math.max(containerRect.width, 1)
    const percentage = Math.min(Math.max((x / width) * 100, 0), 100)
    motionValue.jump(percentage)
    setSliderPosition(percentage)
  }

  const finishPointer = (event, { lockAfterDrag = false } = {}) => {
    isDraggingRef.current = false
    setIsDragging(false)
    setUseDirectMotion(false)
    pointerActiveRef.current = false

    if (event?.currentTarget?.releasePointerCapture && event.pointerId != null) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // ignore if capture was already released
      }
    }

    if (isTouchPointerRef.current) {
      dragMovedRef.current = false
      isTouchPointerRef.current = false
      return
    }

    if (lockAfterDrag && dragMovedRef.current) {
      lockInteraction()
      suppressClickRef.current = true
    }
    dragMovedRef.current = false
  }

  const handlePointerMove = (event) => {
    if (isLockedRef.current && !hoverOnly && !isTouchPointerRef.current) return

    if (hoverOnly) {
      if (enableHover || pointerActiveRef.current) {
        if (pointerActiveRef.current) dragMovedRef.current = true
        updatePosition(event)
      }
      return
    }

    if (!pointerActiveRef.current && !enableHover) return
    if (!isDraggingRef.current && !enableHover) return

    dragMovedRef.current = true
    if (isTouchPointerRef.current) {
      event.preventDefault()
    }
    updatePosition(event)
  }

  const lockInteraction = () => {
    setLocked(true)
    isDraggingRef.current = false
    setIsDragging(false)
    setUseDirectMotion(false)
    pointerActiveRef.current = false
    dragMovedRef.current = false
  }

  const unlockInteraction = () => {
    setLocked(false)
    pointerActiveRef.current = false
    dragMovedRef.current = false
    suppressClickRef.current = false
  }

  const handlePointerDown = (event) => {
    if (event.button > 0) return
    if (isLockedRef.current && !hoverOnly && event.pointerType === 'mouse') return

    isTouchPointerRef.current = event.pointerType === 'touch'
    pointerActiveRef.current = true
    isDraggingRef.current = true
    setIsDragging(true)
    setUseDirectMotion(true)
    dragMovedRef.current = false

    if (hoverOnly && !enableHover) {
      updatePosition(event)
    } else if (!enableHover || event.pointerType === 'touch') {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      updatePosition(event)
    }
  }

  const handlePointerUp = (event) => {
    if (hoverOnly) {
      if (dragMovedRef.current) suppressClickRef.current = true
      finishPointer(event)
      return
    }

    if (isLockedRef.current && !isTouchPointerRef.current) return
    finishPointer(event, { lockAfterDrag: !isTouchPointerRef.current && !enableHover })
  }

  const handleMouseEnter = (event) => {
    if (hoverOnly) {
      unlockInteraction()
      if (enableHover) updatePosition(event)
      return
    }

    if (isLockedRef.current) unlockInteraction()
    if (enableHover) updatePosition(event)
  }

  const handleMouseLeave = () => {
    if (hoverOnly) {
      motionValue.jump(50)
      setSliderPosition(50)
      pointerActiveRef.current = false
      isDraggingRef.current = false
      setIsDragging(false)
      setUseDirectMotion(false)
      dragMovedRef.current = false
      return
    }

    if (!enableHover && pointerActiveRef.current) {
      finishPointer(null)
    }
  }

  const handleClick = () => {
    if (hoverOnly) return

    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (isLockedRef.current) {
      unlockInteraction()
      return
    }
    if (enableHover) {
      lockInteraction()
    }
  }

  return (
    <ImageComparisonContext.Provider
      value={{ sliderPosition, setSliderPosition, motionSliderPosition, isLocked }}
    >
      <div
        ref={containerRef}
        className={cn(
          'image-comparison',
          (enableHover || hoverOnly) && !isLocked && 'image-comparison--hover',
          hoverOnly && 'image-comparison--hover-only',
          isLocked && 'image-comparison--locked',
          isDragging && 'image-comparison--dragging',
          className,
        )}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handlePointerMove}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
      >
        {children}
      </div>
    </ImageComparisonContext.Provider>
  )
}

export function ImageComparisonImage({ className, alt, src, position }) {
  const ctx = useContext(ImageComparisonContext)
  if (!ctx) throw new Error('ImageComparisonImage must be used within ImageComparison')

  const { motionSliderPosition } = ctx
  const leftClipPath = useTransform(
    motionSliderPosition,
    (value) => `inset(0 0 0 ${value}%)`,
  )
  const rightClipPath = useTransform(
    motionSliderPosition,
    (value) => `inset(0 ${100 - value}% 0 0)`,
  )

  return (
    <motion.img
      src={src}
      alt={alt}
      className={cn('image-comparison__image', className)}
      draggable={false}
      style={{
        clipPath: position === 'left' ? leftClipPath : rightClipPath,
      }}
    />
  )
}

export function ImageComparisonSlider({ className, children }) {
  const ctx = useContext(ImageComparisonContext)
  if (!ctx) throw new Error('ImageComparisonSlider must be used within ImageComparison')

  const { motionSliderPosition } = ctx
  const left = useTransform(motionSliderPosition, (value) => `${value}%`)

  return (
    <motion.div
      className={cn('image-comparison__slider', className)}
      style={{ left, x: '-50%' }}
      aria-hidden="true"
    >
      {children ?? <span className="image-comparison__handle" />}
    </motion.div>
  )
}
