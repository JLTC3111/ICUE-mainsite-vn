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
  springOptions,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const motionValue = useMotionValue(50)
  const motionSliderPosition = useSpring(motionValue, springOptions ?? DEFAULT_SPRING_OPTIONS)
  const [sliderPosition, setSliderPosition] = useState(50)
  const dragMovedRef = useRef(false)
  const pointerActiveRef = useRef(false)
  const suppressClickRef = useRef(false)

  const updatePosition = (event) => {
    const containerRect = event.currentTarget.getBoundingClientRect()
    const x = 'touches' in event
      ? event.touches[0].clientX - containerRect.left
      : event.clientX - containerRect.left

    const percentage = Math.min(Math.max((x / containerRect.width) * 100, 0), 100)
    motionValue.set(percentage)
    setSliderPosition(percentage)
  }

  const handleDrag = (event) => {
    if (isLocked) return
    if (!pointerActiveRef.current && !enableHover) return
    if (!isDragging && !enableHover) return

    dragMovedRef.current = true
    updatePosition(event)
  }

  const lockInteraction = () => {
    setIsLocked(true)
    setIsDragging(false)
    pointerActiveRef.current = false
    dragMovedRef.current = false
  }

  const handlePointerDown = () => {
    if (isLocked) return
    pointerActiveRef.current = true
    dragMovedRef.current = false
    if (!enableHover) setIsDragging(true)
  }

  const handlePointerUp = () => {
    if (isLocked) return
    if (!enableHover) setIsDragging(false)
    pointerActiveRef.current = false
    if (dragMovedRef.current) {
      lockInteraction()
      suppressClickRef.current = true
    }
  }

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (isLocked) {
      setIsLocked(false)
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
          enableHover && !isLocked && 'image-comparison--hover',
          isLocked && 'image-comparison--locked',
          className,
        )}
        onMouseMove={handleDrag}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => {
          if (!enableHover) handlePointerUp()
        }}
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
      style={{ left }}
      aria-hidden="true"
    >
      {children ?? <span className="image-comparison__handle" />}
    </motion.div>
  )
}
