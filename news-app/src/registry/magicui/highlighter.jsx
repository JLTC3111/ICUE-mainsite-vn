import { useLayoutEffect, useRef } from 'react'
import { useInView } from 'motion/react'
import { annotate } from 'rough-notation'
import './highlighter.css'

export const MAGIC_UNDERLINE_COLOR = '#f59e0b'

/**
 * Magic UI's Rough Notation-powered text highlighter, adapted to this app's
 * JavaScript/CSS setup while keeping the documented component API.
 */
export function Highlighter({
  children,
  target = null,
  targetClassName = '',
  action = 'highlight',
  color = '#ffd1dc',
  strokeWidth = 1.5,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
  isView = false,
}) {
  const elementRef = useRef(null)
  const isInView = useInView(elementRef, { once: true, margin: '-10%' })
  const shouldShow = Boolean(target) || !isView || isInView

  useLayoutEffect(() => {
    const element = target || elementRef.current
    if (!shouldShow || !element) return undefined

    const targetClasses = targetClassName.split(/\s+/).filter(Boolean)
    if (target) targetClasses.forEach((className) => element.classList.add(className))

    const annotation = annotate(element, {
      type: action,
      color,
      strokeWidth,
      animationDuration,
      iterations,
      padding,
      multiline,
    })

    annotation.show()

    // Rough Notation already observes its target. The additional body observer
    // is useful for an owned inline component, but would multiply expensive
    // whole-page redraws for reader-side persisted marks.
    const resizeObserver = target || typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
        annotation.hide()
        annotation.show()
      })

    resizeObserver?.observe(element)
    resizeObserver?.observe(document.body)

    return () => {
      annotation.remove()
      resizeObserver?.disconnect()
      if (target) targetClasses.forEach((className) => element.classList.remove(className))
    }
  }, [
    shouldShow,
    target,
    targetClassName,
    action,
    color,
    strokeWidth,
    animationDuration,
    iterations,
    padding,
    multiline,
  ])

  if (target) return null

  return (
    <span ref={elementRef} className="magic-highlighter">
      {children}
    </span>
  )
}
