import { useEffect, useRef } from 'react'
import './AnimatedContent.css'

const CSS_EASINGS = {
  'power2.out': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  'power2.in': 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  'power3.out': 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  'power3.in': 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  'power4.out': 'cubic-bezier(0.165, 0.84, 0.44, 1)',
}

function cssEase(ease) {
  return CSS_EASINGS[ease] || ease || 'ease'
}

function transformFor(axis, offset, scale) {
  const x = axis === 'x' ? offset : 0
  const y = axis === 'y' ? offset : 0
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`
}

export default function AnimatedContent({
  children,
  container,
  distance = 100,
  direction = 'vertical',
  reverse = false,
  duration = 0.8,
  ease = 'power3.out',
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  disappearAfter = 0,
  disappearDuration = 0.5,
  disappearEase = 'power3.in',
  onComplete,
  onDisappearanceComplete,
  className = '',
  ...props
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const axis = direction === 'horizontal' ? 'x' : 'y'
    const offset = reverse ? -distance : distance
    const initialTransform = transformFor(axis, offset, scale)
    const finalTransform = transformFor(axis, 0, 1)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      el.style.opacity = '1'
      el.style.visibility = 'visible'
      el.style.transform = finalTransform
      return undefined
    }

    let scrollerTarget = container || document.getElementById('snap-main-container') || null
    if (typeof scrollerTarget === 'string') {
      scrollerTarget = document.querySelector(scrollerTarget)
    }

    let enterAnimation = null
    let exitAnimation = null
    let disappearTimer = null

    el.style.opacity = animateOpacity ? String(initialOpacity) : '1'
    el.style.visibility = 'visible'
    el.style.transform = initialTransform

    const finishEnter = () => {
      el.style.opacity = '1'
      el.style.transform = finalTransform
      onComplete?.()

      if (disappearAfter <= 0) return
      disappearTimer = window.setTimeout(() => {
        const exitTransform = transformFor(
          axis,
          reverse ? distance : -distance,
          0.8,
        )

        if (typeof el.animate !== 'function') {
          el.style.opacity = animateOpacity ? String(initialOpacity) : '0'
          el.style.transform = exitTransform
          onDisappearanceComplete?.()
          return
        }

        exitAnimation = el.animate(
          [
            { opacity: 1, transform: finalTransform },
            { opacity: animateOpacity ? initialOpacity : 0, transform: exitTransform },
          ],
          {
            duration: disappearDuration * 1000,
            easing: cssEase(disappearEase),
            fill: 'forwards',
          },
        )
        exitAnimation.addEventListener('finish', () => {
          el.style.opacity = animateOpacity ? String(initialOpacity) : '0'
          el.style.transform = exitTransform
          onDisappearanceComplete?.()
        }, { once: true })
      }, disappearAfter * 1000)
    }

    const play = () => {
      if (typeof el.animate !== 'function') {
        finishEnter()
        return
      }

      enterAnimation = el.animate(
        [
          { opacity: animateOpacity ? initialOpacity : 1, transform: initialTransform },
          { opacity: 1, transform: finalTransform },
        ],
        {
          duration: duration * 1000,
          delay: delay * 1000,
          easing: cssEase(ease),
          fill: 'forwards',
        },
      )
      enterAnimation.addEventListener('finish', finishEnter, { once: true })
    }

    const root = scrollerTarget instanceof Element ? scrollerTarget : null
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          observer.disconnect()
          play()
        },
        { root, threshold: Math.min(Math.max(threshold, 0), 1) },
      )

    if (observer) observer.observe(el)
    else play()

    return () => {
      observer?.disconnect()
      enterAnimation?.cancel()
      exitAnimation?.cancel()
      if (disappearTimer != null) window.clearTimeout(disappearTimer)
    }
  }, [
    container,
    distance,
    direction,
    reverse,
    duration,
    ease,
    initialOpacity,
    animateOpacity,
    scale,
    threshold,
    delay,
    disappearAfter,
    disappearDuration,
    disappearEase,
    onComplete,
    onDisappearanceComplete,
  ])

  return (
    <div ref={ref} className={`animated-content ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
