import { useEffect } from 'react'

export function useIosPickerTouchLock(containerRef, enabled) {
  useEffect(() => {
    if (!enabled) return undefined

    const node = containerRef.current
    if (!node) return undefined

    let touchStartY = 0
    let touchStartX = 0
    let lockScroll = false

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return
      touchStartY = event.touches[0].clientY
      touchStartX = event.touches[0].clientX
      lockScroll = false
    }

    const onTouchMove = (event) => {
      if (event.touches.length !== 1) return

      const deltaY = event.touches[0].clientY - touchStartY
      const deltaX = event.touches[0].clientX - touchStartX

      if (!lockScroll && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 6) {
        lockScroll = true
      }

      if (lockScroll) {
        event.preventDefault()
      }
    }

    node.addEventListener('touchstart', onTouchStart, { passive: true })
    node.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
    }
  }, [containerRef, enabled])
}
