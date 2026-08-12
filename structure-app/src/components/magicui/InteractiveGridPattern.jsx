import { memo, useCallback, useEffect, useRef } from 'react'
import './InteractiveGridPattern.css'

/**
 * Grid backdrop with a cursor-following highlight.
 *
 * Adapted from Magic UI's Interactive Grid Pattern, which draws one <rect> per
 * cell so each can light up on :hover. On this page that meant 36 x 22 = 792
 * SVG nodes in the hero, each with its own 1s fill transition — and the whole
 * thing sits under a 420px radial mask, so the great majority were never
 * visible in the first place.
 *
 * The lines are now a repeating-linear-gradient on a single element and the
 * highlight is a radial gradient that follows the pointer, snapped to the cell
 * grid so it still reads as "a square lit up" rather than a blob. Same effect,
 * one DOM node, nothing transitioning off-screen.
 *
 * @see https://magicui.design/docs/components/interactive-grid-pattern
 */
function InteractiveGridPatternImpl({
  width = 40,
  height = 40,
  squares = [24, 24],
  className = '',
  interactive = true,
  ...props
}) {
  const [horizontal, vertical] = squares
  const rootRef = useRef(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const frameRef = useRef(0)

  const apply = useCallback(() => {
    frameRef.current = 0
    const root = rootRef.current
    if (!root) return

    const rect = root.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    // Snap to the cell the pointer is over so the highlight lands on the grid.
    const cellX = Math.floor((pointerRef.current.x - rect.left) / width) * width
    const cellY = Math.floor((pointerRef.current.y - rect.top) / height) * height

    root.style.setProperty('--grid-cell-x', `${cellX}px`)
    root.style.setProperty('--grid-cell-y', `${cellY}px`)
  }, [width, height])

  const handlePointerMove = useCallback((event) => {
    pointerRef.current.x = event.clientX
    pointerRef.current.y = event.clientY
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(apply)
  }, [apply])

  const handlePointerLeave = useCallback(() => {
    rootRef.current?.style.setProperty('--grid-cell-opacity', '0')
  }, [])

  const handlePointerEnter = useCallback(() => {
    rootRef.current?.style.setProperty('--grid-cell-opacity', '1')
  }, [])

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`interactive-grid-pattern ${className}`.trim()}
      style={{
        '--grid-cell-w': `${width}px`,
        '--grid-cell-h': `${height}px`,
        '--grid-cols': horizontal,
        '--grid-rows': vertical,
      }}
      {...(interactive
        ? {
            onPointerMove: handlePointerMove,
            onPointerEnter: handlePointerEnter,
            onPointerLeave: handlePointerLeave,
          }
        : {})}
      {...props}
    />
  )
}

export const InteractiveGridPattern = memo(InteractiveGridPatternImpl)
export default InteractiveGridPattern
