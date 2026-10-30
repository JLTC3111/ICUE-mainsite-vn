import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import LineSidebarNav from './LineSidebarNav'
import { useLineSidebarProximity } from './useLineSidebarProximity'
import useDrawerResize from './useDrawerResize'
import useDrawerMotion, { DRAWER_MOTION_STYLE } from './useDrawerMotion'
import './DrawerMenu.css'

const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex], [contenteditable="true"], audio[controls], video[controls]'

function canFocus(element) {
  if (!element.isConnected || element.tabIndex < 0 || element.disabled || element.getAttribute('aria-disabled') === 'true') return false
  if (element.closest('[inert], [hidden], [aria-hidden="true"]')) return false
  for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
    const style = window.getComputedStyle(ancestor)
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false
  }
  return true
}

function CloseIcon() {
  return (
    <svg
      className="nav-drawer__close-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
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
  showClose = true,
  morphToggle = false,
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
  const closeRef = useRef(null)
  const toggleRef = useRef(null)
  const closeActionRef = useRef(null)
  const restoreFocusCleanupRef = useRef(null)

  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const { closing, visible, onTransitionEnd } = useDrawerMotion(open)

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
  closeActionRef.current = close

  const toggle = useCallback(() => {
    setOpen((wasOpen) => !wasOpen)
  }, [setOpen])

  const isDesktop = () => window.matchMedia('(min-width: 1441px)').matches
  useDrawerResize(drawerRef, handleRef, resizable && open && isDesktop())

  const { navRef, handlePointerMove, handlePointerLeave } = useLineSidebarProximity({
    enabled: open,
    deps: [people?.open, links, people],
  })

  const getToggle = useCallback(() => (
    showToggle ? toggleRef.current : document.getElementById(menuToggleId)
  ), [menuToggleId, showToggle])

  const getForegroundRoots = useCallback(() => {
    const drawer = drawerRef.current
    const toggleElement = getToggle()
    const foregroundHeader = showClose ? null : (
      portal
        ? toggleElement?.closest('header')
        : drawer?.closest('.main-site-nav')?.querySelector('.main-site-nav__bar')
    )
    return [drawer, foregroundHeader || (!showClose ? toggleElement : null)].filter(Boolean)
  }, [getToggle, portal, showClose])

  useEffect(() => {
    if (!visible) return undefined
    restoreFocusCleanupRef.current?.()
    const drawer = drawerRef.current
    const invokingToggle = getToggle()
    let lastFocused = null
    const contains = (element) => getForegroundRoots().some(root => root.contains(element))
    const focusables = () => [...new Set(getForegroundRoots().flatMap(root => [
      ...(root.matches(FOCUSABLE) ? [root] : []), ...root.querySelectorAll(FOCUSABLE),
    ]))]
      .filter(canFocus)
      .sort((first, second) => first.compareDocumentPosition(second) & window.Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
    const focusInitial = () => {
      const preferred = showClose ? closeRef.current : [...drawer.querySelectorAll(FOCUSABLE)].find(canFocus)
      const target = preferred && canFocus(preferred) ? preferred : focusables()[0] || drawer
      target.focus({ preventScroll: true })
    }
    const frame = window.requestAnimationFrame(() => {
      // A reader may already have focused a link before the opening frame.
      if (!drawer.contains(document.activeElement)) focusInitial()
    })
    const onFocus = (event) => {
      if (contains(event.target)) {
        lastFocused = event.target
        return
      }
      if (lastFocused && contains(lastFocused) && canFocus(lastFocused)) {
        lastFocused.focus({ preventScroll: true })
      } else {
        focusInitial()
      }
    }
    const onKey = (event) => {
      if (event.defaultPrevented || event.isComposing) return
      if (event.key === 'Escape') {
        event.preventDefault()
        closeActionRef.current()
      } else if (event.key === 'Tab') {
        const items = focusables()
        event.preventDefault()
        if (!items.length) {
          drawer.focus({ preventScroll: true })
          return
        }
        const current = items.indexOf(document.activeElement)
        const next = current < 0 ? (event.shiftKey ? items.length - 1 : 0)
          : (current + (event.shiftKey ? -1 : 1) + items.length) % items.length
        // The header and a portalled panel can have page links between them
        // in DOM order. Advance explicitly so Tab never visits that background.
        // Let the drawer scroll to links below a short or zoomed viewport.
        items[next].focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocus)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocus)
      const target = getToggle() || invokingToggle
      if (!target?.isConnected) return
      const closingFocus = document.activeElement
      let restoreFrame = null
      let timer = null
      const stopRestoring = () => {
        window.cancelAnimationFrame(restoreFrame)
        window.clearTimeout(timer)
        target.removeEventListener('transitionend', onTransition)
        target.removeEventListener('transitioncancel', onTransition)
        document.removeEventListener('focusin', onFocusElsewhere)
        if (restoreFocusCleanupRef.current === stopRestoring) restoreFocusCleanupRef.current = null
      }
      const restoreFocus = () => {
        if (!target.isConnected) {
          stopRestoring()
          return
        }
        const active = document.activeElement
        // Do not steal focus if the reader has already chosen another control,
        // or navigation has focused content on the destination page.
        if (active !== closingFocus && active !== target
          && active !== document.body && active !== document.documentElement
          && !drawer.contains(active)) {
          stopRestoring()
          return
        }
        if (active !== target && canFocus(target)) {
          target.focus({ preventScroll: true })
        }
      }
      const onTransition = (event) => {
        if (event.target === target && ['visibility', 'opacity'].includes(event.propertyName)) restoreFocus()
      }
      const onFocusElsewhere = (event) => {
        if (event.target !== target && event.target !== document.body
          && event.target !== document.documentElement && !drawer.contains(event.target)) stopRestoring()
      }
      restoreFocusCleanupRef.current?.()
      restoreFocusCleanupRef.current = stopRestoring
      target.addEventListener('transitionend', onTransition)
      target.addEventListener('transitioncancel', onTransition)
      document.addEventListener('focusin', onFocusElsewhere)
      restoreFocus()
      if (restoreFocusCleanupRef.current === stopRestoring) {
        // Ordinary toggles fade back from visibility:hidden. On the closing
        // commit Chrome can refuse focus, or blur it again as inert takes effect.
        // Check after paint, after the transition, and once after its 350ms end.
        restoreFrame = window.requestAnimationFrame(() => {
          restoreFrame = window.requestAnimationFrame(restoreFocus)
        })
        timer = window.setTimeout(() => {
          restoreFocus()
          stopRestoring()
        }, 400)
      }
    }
  }, [getForegroundRoots, getToggle, visible, showClose])

  useEffect(() => () => {
    restoreFocusCleanupRef.current?.()
  }, [])

  useEffect(() => {
    if (!portal || !visible) return undefined
    const previousOverflow = document.body.style.overflow
    const alreadyOpen = document.body.classList.contains('nav-drawer-open')
    document.body.style.overflow = 'hidden'
    document.body.classList.add('nav-drawer-open')
    return () => {
      document.body.style.overflow = previousOverflow
      if (!alreadyOpen) document.body.classList.remove('nav-drawer-open')
    }
  }, [visible, portal])

  useEffect(() => {
    if (!open || portal) return undefined

    const onOutsideClick = (e) => {
      const drawer = drawerRef.current
      const overlay = overlayId ? document.getElementById(overlayId) : null
      if (!drawer) return
      if (
        !getForegroundRoots().some(root => root.contains(e.target))
        && !(overlay && overlay.contains(e.target))
      ) {
        closeActionRef.current()
      }
    }

    const timer = window.setTimeout(() => {
      document.addEventListener('click', onOutsideClick)
    }, 0)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', onOutsideClick)
    }
  }, [getForegroundRoots, open, overlayId, portal])

  const drawerPanelClass = [
    'nav-drawer',
    drawerClassName,
    open ? 'is-open open' : closing ? 'is-closing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const panel = (
    <>
      <div
        id={overlayId}
        className={`nav-drawer__overlay ${open ? 'is-open' : closing ? 'is-closing' : ''}`}
        style={DRAWER_MOTION_STYLE}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        ref={drawerRef}
        className={drawerPanelClass}
        id={drawerId}
        style={DRAWER_MOTION_STYLE}
        inert={!visible}
        onTransitionEnd={onTransitionEnd}
        tabIndex={-1}
      >
        {showClose ? (
          <div className="nav-drawer__header">
            <button
              ref={closeRef}
              type="button"
              className="nav-drawer__close"
              aria-label={closeLabel}
              onClick={close}
            >
              <CloseIcon />
            </button>
          </div>
        ) : null}

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
        <button
          ref={toggleRef}
          type="button"
          className={[
            'nav-drawer__toggle',
            morphToggle ? 'nav-drawer__toggle--morph' : '',
            open || (closing && !morphToggle) ? 'is-open' : '',
            closing ? 'is-closing' : '',
          ].filter(Boolean).join(' ')}
          style={DRAWER_MOTION_STYLE}
          aria-label={morphToggle && open ? closeLabel : menuLabel}
          aria-expanded={open}
          aria-controls={drawerId}
          onClick={toggle}
        >
          <span className="nav-drawer__toggle-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          {morphToggle ? (
            <svg className="nav-drawer__toggle-x" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : null}
        </button>
      ) : null}

      {portal ? createPortal(panel, document.body) : panel}
    </>
  )
}

export default memo(DrawerMenuPanel)
