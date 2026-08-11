import { useEffect } from 'react'

/**
 * Fades `.ct-reveal` blocks in as they arrive. Deliberately small: this page is
 * a document, and anything more than a short rise would fight the reading.
 *
 * Elements start hidden in CSS, so the reduced-motion path and the
 * no-IntersectionObserver path both have to reveal everything immediately —
 * an effect that never runs would leave the page blank.
 */
export function useReveal(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const targets = [...root.querySelectorAll('.ct-reveal')]
    const revealAll = () => targets.forEach((el) => el.classList.add('is-in'))

    if (
      typeof IntersectionObserver === 'undefined'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      revealAll()
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    targets.forEach((el) => {
      if (el.classList.contains('is-in')) return
      observer.observe(el)
    })

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export default useReveal
