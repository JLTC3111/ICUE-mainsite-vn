import { useEffect, useState } from 'react'
import { subscribeToPageResume } from './pageResume.js'

/** A decorative reveal must never keep readable content hidden indefinitely. */
export function useRevealOnce(ref, { disabled = false, margin = '0px', amount = 0 } = {}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (disabled || visible) return undefined
    let observer
    let timer
    let unsubscribe
    const show = () => {
      observer?.disconnect()
      clearTimeout(timer)
      unsubscribe?.()
      setVisible(true)
    }
    if (typeof IntersectionObserver === 'undefined') {
      show()
      return undefined
    }
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) show()
    }, { rootMargin: margin, threshold: amount })
    if (ref.current) observer.observe(ref.current)
    // Restore content even if a suspended browser loses its observer callback.
    timer = setTimeout(show, 2000)
    unsubscribe = subscribeToPageResume(show, { minHiddenMs: 0, navigatorTarget: null })
    return () => {
      observer.disconnect()
      clearTimeout(timer)
      unsubscribe()
    }
  }, [ref, disabled, visible, margin, amount])
  return disabled || visible
}
