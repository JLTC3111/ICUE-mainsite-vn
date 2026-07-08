import React from 'react'
import './ShimmerButton.css'

const ShimmerButton = React.forwardRef(function ShimmerButton(
  {
    children,
    className = '',
    href,
    target,
    rel,
    shimmerColor = '#ffffff',
    shimmerSize = '0.05em',
    shimmerDuration = '3s',
    borderRadius = '100px',
    background = 'rgba(0, 0, 0, 1)',
    style,
    ...props
  },
  ref
) {
  const Comp = href ? 'a' : 'button'
  const cssVars = {
    '--shimmer-color': shimmerColor,
    '--cut': shimmerSize,
    '--speed': shimmerDuration,
    '--radius': borderRadius,
    '--bg': background,
    ...style,
  }

  return (
    <Comp
      ref={ref}
      href={href}
      target={target}
      rel={rel}
      type={href ? undefined : 'button'}
      className={`shim-button ${className}`.trim()}
      style={cssVars}
      {...props}
    >
      <div className="shim-button__spark" aria-hidden="true">
        <div className="shim-button__spark-slide">
          <div className="shim-button__spark-spin" />
        </div>
      </div>
      <span className="shim-button__label">{children}</span>
      <div className="shim-button__highlight" aria-hidden="true" />
      <div className="shim-button__backdrop" aria-hidden="true" />
    </Comp>
  )
})

ShimmerButton.displayName = 'ShimmerButton'

export default ShimmerButton
