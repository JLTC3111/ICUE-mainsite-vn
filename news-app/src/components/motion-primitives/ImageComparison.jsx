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
  const [isDragging, setIsDragging] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const isLockedRef = useRef(false)
  const motionValue = useMotionValue(50)
  const springPosition = useSpring(motionValue, springOptions ?? DEFAULT_SPRING_OPTIONS)
  const motionSliderPosition = (enableHover || hoverOnly) ? motionValue : springPosition
  const [sliderPosition, setSliderPosition] = useState(50)
  const dragMovedRef = useRef(false)
  const pointerActiveRef = useRef(false)
  const suppressClickRef = useRef(false)

  const setLocked = (locked) => {
    isLockedRef.current = locked
    setIsLocked(locked)
  }

  const updatePosition = (event) => {
    const containerRect = event.currentTarget.getBoundingClientRect()
    const x = 'touches' in event
      ? event.touches[0].clientX - containerRect.left
      : event.clientX - containerRect.left

    const width = Math.max(containerRect.width, 1)
    const percentage = Math.min(Math.max((x / width) * 100, 0), 100)
    motionValue.jump(percentage)
    setSliderPosition(percentage)
  }

  const handleDrag = (event) => {
    if (isLockedRef.current && !hoverOnly) return

    if (hoverOnly) {
      if (enableHover || pointerActiveRef.current) {
        dragMovedRef.current = pointerActiveRef.current
        updatePosition(event)
      }
      return
    }

    if (!pointerActiveRef.current && !enableHover) return
    if (!isDragging && !enableHover) return

    dragMovedRef.current = true
    updatePosition(event)
  }

  const lockInteraction = () => {
    setLocked(true)
    setIsDragging(false)
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
    if (isLockedRef.current && !hoverOnly) return
    pointerActiveRef.current = true
    dragMovedRef.current = false
    if (hoverOnly && !enableHover) {
      setIsDragging(true)
      updatePosition(event)
      return
    }
    if (!enableHover) setIsDragging(true)
  }

  const handlePointerUp = () => {
    if (hoverOnly) {
      pointerActiveRef.current = false
      setIsDragging(false)
      if (dragMovedRef.current) suppressClickRef.current = true
      dragMovedRef.current = false
      return
    }

    if (isLockedRef.current) return
    if (!enableHover) setIsDragging(false)
    pointerActiveRef.current = false
    if (dragMovedRef.current) {
      lockInteraction()
      suppressClickRef.current = true
    }
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
      setIsDragging(false)
      dragMovedRef.current = false
      return
    }

    if (!enableHover) handlePointerUp()
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
    // Click without dragging (e.g. hover mode) locks the split in place.
    if (enableHover) {
      lockInteraction()
    }
  }

  const handleTouchEnd = () => {
    handlePointerUp()
  }

  return (
    <ImageComparisonContext.Provider
      value={{ sliderPosition, setSliderPosition, motionSliderPosition, isLocked }}
    >
      <div
        className={cn(
          'image-comparison',
          (enableHover || hoverOnly) && !isLocked && 'image-comparison--hover',
          hoverOnly && 'image-comparison--hover-only',
          isLocked && 'image-comparison--locked',
          className,
        )}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleDrag}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleDrag}
        onTouchStart={handlePointerDown}
        onTouchEnd={handleTouchEnd}
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
