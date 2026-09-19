import { usePageResume } from '../resilience/usePageResume.js'
import { useEffect, useMemo, useState } from 'react'

function formatClock(now, locale) {
  return {
    month: now.toLocaleString(locale, { month: 'long' }),
    day: now.toLocaleString(locale, { day: 'numeric' }),
    time: now.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
  }
}

export function useCalendarClock(locale = 'vi') {
  const [now, setNow] = useState(() => new Date())

  usePageResume(() => setNow(new Date()), { minHiddenMs: 0 })

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return useMemo(() => formatClock(now, locale), [now, locale])
}
