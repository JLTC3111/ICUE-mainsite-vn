import { useEffect, useEffectEvent } from 'react'

/**
 * Call `handler` when a pointerdown happens outside `ref`.
 * @param {React.RefObject<HTMLElement | null>} ref
 * @param {() => void} handler
 */
export default function useClickOutside(ref, handler) {
  const onOutside = useEffectEvent(handler)

  useEffect(() => {
    const onPointerDown = (event) => {
      const el = ref.current
      if (!el || el.contains(event.target)) return
      onOutside()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [ref])
}
