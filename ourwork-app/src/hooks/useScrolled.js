import { useEffect, useState } from 'react'

/* True once the page has left the very top.
 *
 * The two thresholds are deliberate. The header changes shape on this flag, so
 * a single `scrollY > 0` test would flap between the two designs on iOS
 * rubber-band and on trackpads that emit sub-pixel deltas around zero. Entering
 * costs 6px of scroll, leaving needs a return to within 1px of the top. */
const ENTER = 6
const LEAVE = 1

export function useScrolled() {
  const [scrolled, setScrolled] = useState(
    () => typeof window !== 'undefined' && window.scrollY > ENTER,
  )

  useEffect(() => {
    let frame = 0

    const read = () => {
      frame = 0
      const y = window.scrollY
      setScrolled((was) => (was ? y > LEAVE : y > ENTER))
    }

    // Scroll fires far faster than we can usefully restyle; coalesce to a frame.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return scrolled
}

export default useScrolled
