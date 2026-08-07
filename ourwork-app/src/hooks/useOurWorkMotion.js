import { useEffect } from 'react'

const REVEAL_FALLBACK_MS = 2600
const PARALLAX_MARGIN = 400
const MOBILE_PARALLAX = 26

/**
 * Spec §6 — parallax and reveal, both driven from ONE rAF pass on ONE passive
 * scroll listener. Do not add a second listener or a second loop.
 *
 * Two hard-won notes from the mockup:
 *   1. No IntersectionObserver. It misfires inside transformed / zoomed
 *      ancestors and leaves the whole page permanently blank. Rect-testing
 *      inside the pass we already run is reliable and costs nothing extra.
 *   2. Always ship the fallback timer. A missing scroll event must never be
 *      able to hide content.
 *
 * `is-revealed` is added imperatively. That is safe because React renders a
 * constant className on these nodes and so never rewrites the attribute.
 */
export function useOurWorkMotion(rootRef, resetKey) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const pending = [...root.querySelectorAll('.ow-reveal:not(.is-revealed)')]
    const images = [...root.querySelectorAll('[data-para]')]

    const revealAll = () => {
      for (const el of pending) el.classList.add('is-revealed')
      pending.length = 0
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealAll()
      return undefined
    }

    let frame = 0
    let queued = false

    const pass = () => {
      queued = false
      const vh = window.innerHeight
      const amount = window.innerWidth <= 768 ? MOBILE_PARALLAX : null

      for (const img of images) {
        const well = img.parentElement
        if (!well) continue
        const r = well.getBoundingClientRect()
        if (r.bottom < -PARALLAX_MARGIN || r.top > vh + PARALLAX_MARGIN) continue
        const travel = amount ?? (Number(img.dataset.para) || 34)
        const p = (r.top + r.height / 2 - vh / 2) / vh
        img.style.transform = `translate3d(0, ${(-p * travel).toFixed(1)}px, 0)`
      }

      for (let i = pending.length - 1; i >= 0; i -= 1) {
        const el = pending[i]
        const r = el.getBoundingClientRect()
        if (r.top < vh * 0.94 && r.bottom > -80) {
          el.classList.add('is-revealed')
          pending.splice(i, 1)
        }
      }
    }

    const schedule = () => {
      if (queued) return
      queued = true
      frame = requestAnimationFrame(pass)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()

    const fallback = setTimeout(revealAll, REVEAL_FALLBACK_MS)

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
      clearTimeout(fallback)
    }
  }, [rootRef, resetKey])
}
