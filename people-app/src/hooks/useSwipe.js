import { useRef, useCallback } from 'react'

const MIN_SWIPE_DISTANCE = 50

export function useSwipe({ onSwipeLeft, onSwipeRight }) {
  const touchStart = useRef({ x: 0, y: 0 })

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const onTouchEnd = useCallback((e) => {
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y

    if (Math.abs(dx) < MIN_SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy)) return

    if (dx > 0) onSwipeRight?.()
    else onSwipeLeft?.()
  }, [onSwipeLeft, onSwipeRight])

  return { onTouchStart, onTouchEnd }
}
