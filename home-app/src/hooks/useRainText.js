import { useEffect } from 'react'

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
    // .home-hero__subtitle ships `visibility: hidden` so the literal React text
    // never flashes before this effect swaps in the per-character spans. The
    // en site has no such rule, which is why its copy of this hook omits the
    // line — dropping it here would leave the subtitle permanently invisible.
    el.style.visibility = 'visible'

    const animations = spans.map((span, index) =>
      span.animate(
        [
          { transform: 'translate3d(-50vw, 0, 0)', opacity: 0 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1 },
        ],
        {
          delay: index * 50,
          duration: 750,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          fill: 'forwards',
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
      animations.forEach((animation) => animation.cancel())
      el.textContent = text
    }
  }, [text, textRef])
}
