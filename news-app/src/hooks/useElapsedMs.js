import { useEffect, useState } from 'react'

/**
 * Live elapsed milliseconds while `active` is true.
 * Freezes on the last value when deactivated so callers can linger the readout.
 */
export function useElapsedMs(active, { tickMs = 16 } = {}) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) return undefined

    const start = performance.now()
    setElapsed(0)

    let rafId = 0
    let lastShown = -1

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
      setElapsed(Math.max(0, Math.floor(performance.now() - start)))
    }
  }, [active, tickMs])

  return elapsed
}

export default useElapsedMs
