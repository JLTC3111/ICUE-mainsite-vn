import { useEffect } from 'react'
import { motion, useAnimation, useMotionValue } from 'motion/react'
import './CircularText.css'

const getRotationTransition = (duration, from, loop = true) => ({
  from,
  to: from + 360,
  ease: 'linear',
  duration,
  type: 'tween',
  repeat: loop ? Infinity : 0,
})

const getTransition = (duration, from) => ({
  rotate: getRotationTransition(duration, from),
  scale: {
    type: 'spring',
    damping: 20,
    stiffness: 300,
  },
})

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function CircularText({
  text,
  spinDuration = 20,
  onHover = 'speedUp',
  className = '',
  lightColor = '#ffffff',
  darkColor = '#ffffff',
  tintColor = '#ffffff',
  brightness = 1.28,
  contrast = 0.52,
}) {
  const letters = Array.from(text)
  const controls = useAnimation()
  const rotation = useMotionValue(0)
  const reducedMotion = prefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return undefined
    const start = rotation.get()
    controls.start({
      rotate: start + 360,
      scale: 1,
      transition: getTransition(spinDuration, start),
    })
    return undefined
  }, [spinDuration, text, onHover, controls, reducedMotion, rotation])

  const handleHoverStart = () => {
    if (reducedMotion || !onHover) return
    const start = rotation.get()

    if (onHover === 'pause') {
      controls.stop()
      return
    }

    let transitionConfig
    let scaleVal = 1

    switch (onHover) {
      case 'slowDown':
        transitionConfig = getTransition(spinDuration * 2, start)
        break
      case 'speedUp':
        transitionConfig = getTransition(spinDuration / 4, start)
        break
      case 'goBonkers':
        transitionConfig = getTransition(spinDuration / 20, start)
        scaleVal = 0.8
        break
      default:
        transitionConfig = getTransition(spinDuration, start)
    }

    controls.start({
      rotate: start + 360,
      scale: scaleVal,
      transition: transitionConfig,
    })
  }

  const handleHoverEnd = () => {
    if (reducedMotion) return
    const start = rotation.get()
    controls.start({
      rotate: start + 360,
      scale: 1,
      transition: getTransition(spinDuration, start),
    })
  }

  return (
    <motion.div
      className={`circular-text ${className}`.trim()}
      style={{
        rotate: rotation,
        '--circular-text-light': lightColor,
        '--circular-text-dark': darkColor,
        '--circular-text-tint': tintColor,
        '--circular-text-brightness': Math.min(Math.max(brightness, 0.85), 1.2),
        '--circular-text-contrast': Math.min(Math.max(0.8 + contrast * 0.4, 0.85), 1.2),
      }}
      initial={{ rotate: 0 }}
      animate={controls}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      aria-hidden="true"
    >
      {letters.map((letter, i) => {
        const rotationDeg = (360 / letters.length) * i
        const factor = Math.PI / letters.length
        const x = factor * i
        const y = factor * i
        const transform = `rotateZ(${rotationDeg}deg) translate3d(${x}px, ${y}px, 0)`

        return (
          <span key={`${letter}-${i}`} style={{ transform, WebkitTransform: transform }}>
            {letter}
          </span>
        )
      })}
    </motion.div>
  )
}
