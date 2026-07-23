import { useLayoutEffect, useState } from 'react'

const VIEWPORT_GUTTER = 12

/**
 * Fixed-position popover anchored under a trigger, sized to use available
 * viewport width (not just the often-narrow trigger field).
 *
 * Narrow viewports (~430px): nearly full width.
 * Desktop: comfortable calendar width (minWidth–maxWidth).
 */
export function usePopoverPosition(open, triggerRef, {
  minWidth = 280,
  maxWidth = 360,
  offset = 6,
} = {}) {
  const [style, setStyle] = useState(null)

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null)
      return undefined
    }

    const update = () => {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const available = Math.max(minWidth, vw - VIEWPORT_GUTTER * 2)

      // Phones / small tablets: use nearly the full viewport.
      // Desktop: stay within minWidth–maxWidth for a readable calendar.
      const preferred = vw <= 640
        ? available
        : Math.min(maxWidth, Math.max(minWidth, Math.max(rect.width, 320)))
      const width = Math.min(available, Math.max(minWidth, preferred))

      let left = rect.left
      if (left + width > vw - VIEWPORT_GUTTER) {
        left = vw - VIEWPORT_GUTTER - width
      }
      left = Math.max(VIEWPORT_GUTTER, left)

      const spaceBelow = vh - rect.bottom - VIEWPORT_GUTTER
      const spaceAbove = rect.top - VIEWPORT_GUTTER
      const preferBelow = spaceBelow >= 280 || spaceBelow >= spaceAbove

      const next = {
        position: 'fixed',
        left: `${Math.round(left)}px`,
        width: `${Math.round(width)}px`,
        maxWidth: `${Math.round(available)}px`,
        right: 'auto',
        zIndex: 80,
      }

      if (preferBelow) {
        next.top = `${Math.round(rect.bottom + offset)}px`
        next.bottom = 'auto'
        next.maxHeight = `${Math.round(Math.max(180, spaceBelow - offset))}px`
      } else {
        next.top = 'auto'
        next.bottom = `${Math.round(vh - rect.top + offset)}px`
        next.maxHeight = `${Math.round(Math.max(180, spaceAbove - offset))}px`
      }

      setStyle(next)
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, triggerRef, minWidth, maxWidth, offset])

  return style
}
