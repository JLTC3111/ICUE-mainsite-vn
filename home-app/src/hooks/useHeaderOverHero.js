import { useLayoutEffect, useState } from 'react'

// Follow the hero's actual position, including mobile header height and layout
// changes. There is no continuous animation loop; only geometry changes sample.
export default function useHeaderOverHero(headerRef, enabled) {
  const [overHero, setOverHero] = useState(false)

  useLayoutEffect(() => {
    if (!enabled) return undefined
    let frame = null
    let hero = null
    let resizeObserver

    const measure = () => {
      frame = null
      const nextHero = document.querySelector('.home-hero')
      if (nextHero !== hero) {
        if (hero) resizeObserver?.unobserve(hero)
        hero = nextHero
        if (hero) resizeObserver?.observe(hero)
      }
      const header = headerRef.current
      if (!header || !hero) {
        setOverHero(false)
        return
      }
      const headerRect = header.getBoundingClientRect()
      const heroRect = hero.getBoundingClientRect()
      const y = headerRect.top + headerRect.height / 2
      const overlaps = headerRect.width > 0 && headerRect.height > 0
        && heroRect.top <= y && heroRect.bottom > y
        && heroRect.left < headerRect.right && heroRect.right > headerRect.left
      setOverHero(previous => previous === overlaps ? previous : overlaps)
    }

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(measure)
    }
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(schedule)
      if (headerRef.current) resizeObserver.observe(headerRef.current)
    }

    measure()
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule)
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)
    const content = document.getElementById('content') ?? document.querySelector('main')
    const observer = content ? new MutationObserver(schedule) : null
    observer?.observe(content, { childList: true, subtree: true })

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      viewport?.removeEventListener('resize', schedule)
      viewport?.removeEventListener('scroll', schedule)
      observer?.disconnect()
      resizeObserver?.disconnect()
    }
  }, [headerRef, enabled])

  return enabled && overHero
}
