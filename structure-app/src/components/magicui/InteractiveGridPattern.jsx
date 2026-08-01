import './InteractiveGridPattern.css'

/**
 * Magic UI Interactive Grid Pattern
 * @see https://magicui.design/docs/components/interactive-grid-pattern
 */
export function InteractiveGridPattern({
  width = 40,
  height = 40,
  squares = [24, 24],
  className = '',
  squaresClassName = '',
  ...props
}) {
  const [horizontal, vertical] = squares

  return (
    <svg
      width={width * horizontal}
      height={height * vertical}
      className={`interactive-grid-pattern ${className}`.trim()}
      aria-hidden="true"
      {...props}
    >
      {Array.from({ length: horizontal * vertical }).map((_, index) => {
        const x = (index % horizontal) * width
        const y = Math.floor(index / horizontal) * height
        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={width}
            height={height}
            className={`interactive-grid-pattern__square ${squaresClassName}`.trim()}
          />
        )
      })}
    </svg>
  )
}
