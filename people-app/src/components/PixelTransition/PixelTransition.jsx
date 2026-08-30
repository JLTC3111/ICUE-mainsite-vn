import { useRef, useEffect, useCallback } from 'react'
import './PixelTransition.css'

let gsapPromise = null

function loadGsap() {
  if (!gsapPromise) {
    gsapPromise = import('gsap').then((module) => module.gsap || module.default)
  }
  return gsapPromise
}

function PixelTransition({
  firstContent,
  secondContent,
  trigger = 0,
  gridSize = 8,
  pixelColor = '#120F17',
  animationStepDuration = 0.35,
  className = '',
  style = {},
  onComplete,
  disabled = false,
  displayKey,
}) {
  const pixelGridRef = useRef(null)
  const activeRef = useRef(null)
  const defaultRef = useRef(null)
  const delayedCallRef = useRef(null)
  const gsapRef = useRef(null)
  const mountedRef = useRef(false)
  const prevTrigger = useRef(trigger)
  const isAnimating = useRef(false)

  useEffect(() => {
    const pixelGridEl = pixelGridRef.current
    if (!pixelGridEl) return undefined

    pixelGridEl.innerHTML = ''

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const pixel = document.createElement('div')
        pixel.classList.add('pixel-transition__pixel')
        pixel.style.backgroundColor = pixelColor

        const size = 100 / gridSize
        pixel.style.width = `${size}%`
        pixel.style.height = `${size}%`
        pixel.style.left = `${col * size}%`
        pixel.style.top = `${row * size}%`
        pixelGridEl.appendChild(pixel)
      }
    }

    return undefined
  }, [gridSize, pixelColor])

  const runTransition = useCallback(async () => {
    const pixelGridEl = pixelGridRef.current
    const activeEl = activeRef.current
    const defaultEl = defaultRef.current
    if (!pixelGridEl || !activeEl || !defaultEl || isAnimating.current) return

    if (disabled) {
      activeEl.style.display = 'flex'
      defaultEl.style.display = 'none'
      onComplete?.()
      return
    }

    isAnimating.current = true

    let gsap
    try {
      gsap = await loadGsap()
    } catch {
      if (!mountedRef.current) return
      activeEl.style.display = 'flex'
      defaultEl.style.display = 'none'
      isAnimating.current = false
      onComplete?.()
      return
    }

    if (!mountedRef.current) return
    gsapRef.current = gsap
    const pixels = pixelGridEl.querySelectorAll('.pixel-transition__pixel')
    if (!pixels.length) {
      isAnimating.current = false
      onComplete?.()
      return
    }

    gsap.killTweensOf(pixels)
    if (delayedCallRef.current) {
      delayedCallRef.current.kill()
    }

    gsap.set(pixels, { display: 'none' })

    const totalPixels = pixels.length
    const staggerDuration = animationStepDuration / totalPixels

    gsap.to(pixels, {
      display: 'block',
      duration: 0,
      stagger: {
        each: staggerDuration,
        from: 'random',
      },
    })

    delayedCallRef.current = gsap.delayedCall(animationStepDuration, () => {
      activeEl.style.display = 'flex'
      defaultEl.style.display = 'none'
      isAnimating.current = false
      onComplete?.()
    })

    gsap.to(pixels, {
      display: 'none',
      duration: 0,
      delay: animationStepDuration,
      stagger: {
        each: staggerDuration,
        from: 'random',
      },
    })
  }, [animationStepDuration, disabled, onComplete])

  useEffect(() => {
    if (trigger === prevTrigger.current) return undefined

    if (trigger === 0) {
      prevTrigger.current = trigger
      return undefined
    }

    prevTrigger.current = trigger
    runTransition()
    return undefined
  }, [trigger, runTransition])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (delayedCallRef.current) delayedCallRef.current.kill()
      const pixels = pixelGridRef.current?.querySelectorAll('.pixel-transition__pixel')
      if (pixels?.length) gsapRef.current?.killTweensOf(pixels)
    }
  }, [])

  useEffect(() => {
    const activeEl = activeRef.current
    const defaultEl = defaultRef.current
    if (!activeEl || !defaultEl || isAnimating.current) return undefined
    activeEl.style.display = 'none'
    defaultEl.style.display = 'block'
    return undefined
  }, [displayKey])

  return (
    <div
      className={`pixel-transition ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <div ref={defaultRef} className="pixel-transition__default">
        {firstContent}
      </div>
      <div ref={activeRef} className="pixel-transition__active">
        {secondContent}
      </div>
      <div ref={pixelGridRef} className="pixel-transition__pixels" />
    </div>
  )
}

export default PixelTransition
