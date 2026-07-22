import { createContext, useContext, useState } from 'react'
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
  const motionValue = useMotionValue(50)
  const motionSliderPosition = useSpring(motionValue, springOptions ?? DEFAULT_SPRING_OPTIONS)
  const [sliderPosition, setSliderPosition] = useState(50)

  const handleDrag = (event) => {
    if (!isDragging && !enableHover) return

    const containerRect = event.currentTarget.getBoundingClientRect()
    const x = 'touches' in event
      ? event.touches[0].clientX - containerRect.left
      : event.clientX - containerRect.left

    const percentage = Math.min(Math.max((x / containerRect.width) * 100, 0), 100)
    motionValue.set(percentage)
    setSliderPosition(percentage)
  }

  return (
    <ImageComparisonContext.Provider
      value={{ sliderPosition, setSliderPosition, motionSliderPosition }}
    >
      <div
        className={cn(
          'image-comparison',
          enableHover && 'image-comparison--hover',
          className,
        )}
        onMouseMove={handleDrag}
        onMouseDown={() => !enableHover && setIsDragging(true)}
        onMouseUp={() => !enableHover && setIsDragging(false)}
        onMouseLeave={() => !enableHover && setIsDragging(false)}
        onTouchMove={handleDrag}
        onTouchStart={() => !enableHover && setIsDragging(true)}
        onTouchEnd={() => !enableHover && setIsDragging(false)}
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
