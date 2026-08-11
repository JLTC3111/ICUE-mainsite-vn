import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import LineSidebarNav from './LineSidebarNav'
import { useLineSidebarProximity } from './useLineSidebarProximity'
import useDrawerResize from './useDrawerResize'
import './DrawerMenu.css'

function CloseIcon() {
  return (
    <svg
      className="nav-drawer__close-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#f8fafc"
      strokeWidth={2.25}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function DrawerMenuPanel({
  links,
  people,
  open: openProp,
  onOpenChange,
  showToggle = true,
  showFloatingClose = true,
  portal = true,
  resizable = false,
  drawerId = 'drawerMenu',
  overlayId,
  menuToggleId = 'menuToggle',
  drawerClassName = '',
  menuLabel = 'Menu',
  closeLabel = 'Close',
  navLabel = 'Site',
  resizeLabel = 'Resize navigation menu',
  resizeTitle = 'Drag to resize menu',
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const drawerRef = useRef(null)
  const handleRef = useRef(null)

  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen

  const setOpen = useCallback(
    (nextValue) => {
      const resolved = typeof nextValue === 'function' ? nextValue(open) : nextValue
      onOpenChange?.(resolved)
      if (!isControlled) setInternalOpen(resolved)
    },
    [isControlled, onOpenChange, open],
  )

  const close = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  const toggle = useCallback(() => {
    setOpen((wasOpen) => !wasOpen)
  }, [setOpen])

  const isDesktop = () => window.matchMedia('(min-width: 1441px)').matches
  useDrawerResize(drawerRef, handleRef, resizable && open && isDesktop())

  const { navRef, handlePointerMove, handlePointerLeave } = useLineSidebarProximity({
    enabled: open,
    deps: [people?.open, links, people],
  })

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close, open])

  useEffect(() => {
    if (portal) {
      document.body.style.overflow = open ? 'hidden' : ''
      document.body.classList.toggle('nav-drawer-open', open)
      return () => {
        document.body.style.overflow = ''
        document.body.classList.remove('nav-drawer-open')
      }
    }
    return undefined
  }, [open, portal])

  useEffect(() => {
    if (!open || portal) return undefined

    const onOutsideClick = (e) => {
      const drawer = drawerRef.current
      const toggleEl = document.getElementById(menuToggleId)
      const overlay = overlayId ? document.getElementById(overlayId) : null
      if (!drawer || !toggleEl) return
      if (
        !drawer.contains(e.target)
        && !toggleEl.contains(e.target)
        && !(overlay && overlay.contains(e.target))
      ) {
        close()
      }
    }

    const timer = window.setTimeout(() => {
      document.addEventListener('click', onOutsideClick)
    }, 0)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', onOutsideClick)
    }
  }, [close, menuToggleId, open, overlayId, portal])

  const drawerPanelClass = [
    'nav-drawer',
    drawerClassName,
    open ? 'is-open open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const panel = (
    <>
      <div
        id={overlayId}
        className={`nav-drawer__overlay ${open ? 'is-open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        ref={drawerRef}
        className={drawerPanelClass}
        id={drawerId}
        aria-hidden={!open}
      >
        <LineSidebarNav
          links={links}
          people={people}
          navRef={navRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          ariaLabel={navLabel}
        />

        {resizable ? (
          <button
            ref={handleRef}
            type="button"
            className="drawer-resize-handle"
            id="drawerResizeHandle"
            aria-label={resizeLabel}
            title={resizeTitle}
          />
        ) : null}
      </aside>
    </>
  )

  return (
    <>
      {showToggle ? (
        open ? (
          <span className="nav-drawer__toggle-placeholder" aria-hidden="true" />
        ) : (
          <button
            type="button"
            className="nav-drawer__toggle"
            aria-label={menuLabel}
            aria-expanded={false}
            onClick={toggle}
          >
            <span /><span /><span />
          </button>
        )
      ) : null}

      {showToggle && showFloatingClose && open
        ? createPortal(
            <button
              type="button"
              className="nav-drawer__toggle is-open nav-drawer__toggle--floating"
              aria-label={closeLabel}
              aria-expanded
              onClick={toggle}
            >
              <CloseIcon />
            </button>,
            document.body,
          )
        : null}

      {portal ? createPortal(panel, document.body) : panel}
    </>
  )
}

export default memo(DrawerMenuPanel)
