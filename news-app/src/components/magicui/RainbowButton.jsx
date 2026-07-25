import React from 'react'
import './RainbowButton.css'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Magic UI Rainbow Button — adapted for ICUE (no Tailwind).
 * @see https://magicui.design/docs/components/rainbow-button
 */
export const RainbowButton = React.forwardRef(function RainbowButton(
  { children, className = '', variant = 'default', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-slot="button"
      className={cn(
        'rainbow-button',
        variant === 'outline' && 'rainbow-button--outline',
        className,
      )}
      {...props}
    >
      <span className="rainbow-button__label">{children}</span>
    </button>
  )
})

RainbowButton.displayName = 'RainbowButton'
