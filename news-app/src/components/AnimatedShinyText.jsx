import './AnimatedShinyText.css'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 100,
  ...props
}) {
  return (
    <span
      style={{ '--shiny-width': `${shimmerWidth}px` }}
      className={cn('shiny-text', className)}
      {...props}
    >
      {children}
    </span>
  )
}
