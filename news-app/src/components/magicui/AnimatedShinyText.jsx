import './AnimatedShinyText.css'

/**
 * Magic UI Animated Shiny Text — adapted for ICUE (no Tailwind).
 * Original props: shimmerWidth (default 100), className, span attrs.
 * @see https://magicui.design/docs/components/animated-shiny-text
 */
export function AnimatedShinyText({
  children,
  className = '',
  shimmerWidth = 100,
  ...props
}) {
  return (
    <span
      className={`animated-shiny-text${className ? ` ${className}` : ''}`}
      style={{ '--shiny-width': `${shimmerWidth}px` }}
      {...props}
    >
      {children}
    </span>
  )
}
