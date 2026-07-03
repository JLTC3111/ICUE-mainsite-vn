import { useEffect, useState } from 'react'

function formatClock(now = new Date()) {
  const month = now.toLocaleString('en-US', { month: 'long' })
  const day = String(now.getDate())
  let hours = now.getHours()
  const minutes = now.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const formattedMinutes = minutes < 10 ? `0${minutes}` : String(minutes)
  return {
    month,
    day,
    time: `${hours}:${formattedMinutes}${ampm}`,
  }
}

export function useCalendarClock() {
  const [clock, setClock] = useState(() => formatClock())

  useEffect(() => {
    const tick = () => setClock(formatClock())
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return clock
}
