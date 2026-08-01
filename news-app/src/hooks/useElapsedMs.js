import { useEffect, useState } from 'react'

/**
 * Live elapsed milliseconds while `active` is true.
 * Freezes on the last value when deactivated so callers can linger the readout.
 */
export function useElapsedMs(active, { tickMs = 50 } = {}) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) return undefined

    const start = performance.now()

    let rafId = 0
    let lastShown = -tickMs

    const tick = (now) => {
      const next = Math.max(0, Math.floor(now - start))
      if (next - lastShown >= tickMs || next < lastShown) {
        lastShown = next
        setElapsed(next)
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [active, tickMs])

  return elapsed
}

export default useElapsedMs
