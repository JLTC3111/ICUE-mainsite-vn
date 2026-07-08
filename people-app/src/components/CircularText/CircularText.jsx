import { useEffect, useState } from 'react'
import { motion, useAnimation, useMotionValue } from 'motion/react'
import MetallicPaint from '../MetallicPaint/MetallicPaint'
import { useInteractiveBackgroundActive } from '../../contexts/InteractiveBackgroundContext'
import { renderCircularTextImage } from './renderCircularTextImage'
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

function CircularText({
  text,
  spinDuration = 20,
  onHover = 'speedUp',
  className = '',
}) {
  const letters = Array.from(text)
  const controls = useAnimation()
  const rotation = useMotionValue(0)
  const reducedMotion = prefersReducedMotion()
  const interactiveBg = useInteractiveBackgroundActive()
  const [imageSrc, setImageSrc] = useState(null)

  useEffect(() => {
    setImageSrc(renderCircularTextImage(text))
  }, [text])

  const metallicProps = interactiveBg
    ? {
        lightColor: '#ffffff',
        darkColor: '#88fff6',
        tintColor: '#ffffff',
        brightness: 1.35,
        contrast: 0.55,
      }
    : {
        lightColor: '#ffffff',
        darkColor: '#88fff6',
        tintColor: '#ffffff',
        brightness: 1.35,
        contrast: 0.5,
      }

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
      style={{ rotate: rotation }}
      initial={{ rotate: 0 }}
      animate={controls}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      aria-hidden="true"
    >
      {imageSrc ? (
        <MetallicPaint
          className="circular-text__metallic"
          imageSrc={imageSrc}
          seed={200}
          scale={5}
          speed={reducedMotion ? 0 : 0.05}
          blur={0.1}
          mouseAnimation={false}
          {...metallicProps}
        />
      ) : (
        letters.map((letter, i) => {
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
        })
      )}
    </motion.div>
  )
}

export default CircularText
