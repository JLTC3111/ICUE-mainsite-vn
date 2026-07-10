import { useEffect } from 'react'
import gsap from 'gsap'

export function useRainText(textRef, text) {
  useEffect(() => {
    const el = textRef.current
    if (!el || !text) return undefined

    el.textContent = ''

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      el.textContent = text
      el.style.opacity = '1'
      el.style.visibility = 'visible'
      el.style.color = '#ffffff'
      el.style.webkitTextFillColor = '#ffffff'
      return undefined
    }

    const spans = [...text].map((char) => {
      const span = document.createElement('span')
      span.textContent = char === ' ' ? '\u00A0' : char
      span.style.display = 'inline-block'
      span.style.opacity = '0'
      el.appendChild(span)
      return span
    })

    const tweens = spans.map((span, i) =>
      gsap.fromTo(
        span,
        { x: '-50vw', opacity: 0 },
        {
          x: 0,
          opacity: 1,
          delay: i * 0.05,
          duration: 0.75,
          ease: 'bounce.out',
        },
      ),
    )

    const safetyId = window.setTimeout(() => {
      spans.forEach((span) => {
        span.style.opacity = '1'
        span.style.transform = 'none'
      })
    }, Math.ceil(text.length * 50 + 1000))

    return () => {
      window.clearTimeout(safetyId)
      tweens.forEach((tween) => tween.kill())
      el.textContent = text
    }
  }, [text, textRef])
}
