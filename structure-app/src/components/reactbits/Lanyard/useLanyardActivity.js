import { useEffect, useState } from 'react'

/** Keep the scene and its GPU resources mounted while pausing hidden work. */
export default function useLanyardActivity(ref) {
  const [active, setActive] = useState(() => typeof document === 'undefined' || !document.hidden)
  useEffect(() => {
    let visible = true
    const sync = () => setActive(visible && !document.hidden)
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting)
      sync()
    })
    if (ref.current) observer?.observe(ref.current)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', sync) }
  }, [ref])
  return active
}
