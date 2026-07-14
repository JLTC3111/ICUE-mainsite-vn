import { forwardRef, memo } from 'react'

export const DrawerMenuCloseIcon = forwardRef(function DrawerMenuCloseIcon(props, ref) {
  return (
    <svg
      ref={ref}
      className="nav-drawer__close-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
})

const DrawerMenuToggle = forwardRef(function DrawerMenuToggle({
  open = false,
  className = '',
  menuLabel = 'Menu',
  closeLabel = 'Close',
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={['nav-drawer__toggle', open ? 'is-open' : '', className].filter(Boolean).join(' ')}
      aria-label={open ? closeLabel : menuLabel}
      aria-expanded={open}
      {...props}
    >
      {open ? (
        <DrawerMenuCloseIcon />
      ) : (
        <>
          <span />
          <span />
          <span />
        </>
      )}
    </button>
  )
})

export default memo(DrawerMenuToggle)
