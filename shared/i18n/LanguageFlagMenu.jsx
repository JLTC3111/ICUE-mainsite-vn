import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { flagSvgUrl } from './langFlags'
import './LanguageFlagMenu.css'

/**
 * The main site's round flag button, extended into a switcher. On the main site
 * that flag is a single link between icue.vn and en.icue.vn; an app that
 * carries its own UI languages uses this instead — the button keeps the same
 * shape and shows the active language, and the alternates drop out of it as the
 * same round flags.
 *
 * Props mirror LanguageSwitcher in this folder on purpose, so the two controls
 * are interchangeable at the call site.
 */
function LanguageFlagMenu({ languages, value, onChange, ariaLabel = 'Language', className = '' }) {
  const [open, setOpen] = useState(false)

  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const itemRefs = useRef([])

  const current = languages.find((lang) => lang.code === value) ?? languages[0]
  const others = languages.filter((lang) => lang.code !== current.code)

  const close = useCallback((refocus) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return undefined

    const closeFromOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeFromEscape = (event) => {
      if (event.key === 'Escape') close(true)
    }

    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeFromEscape)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeFromEscape)
    }
  }, [close, open])

  // Menu semantics: opening moves focus into the list so it is reachable
  // without a mouse.
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus()
  }, [open])

  const handleItemKeyDown = (event, index) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : others.length - 1
    itemRefs.current[(index + step) % others.length]?.focus()
  }

  const choose = (code) => {
    onChange(code)
    close(true)
  }

  return (
    <div className={`icue-lang ${className}`.trim()} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icue-lang__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${current.label}`}
        title={current.label}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <img
          className="icue-lang__flag"
          src={flagSvgUrl(current.code)}
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable={false}
        />
      </button>

      <div
        className={`icue-lang__menu${open ? ' is-open' : ''}`}
        role="menu"
        aria-label={ariaLabel}
        aria-hidden={!open}
      >
        {others.map((lang, index) => (
          <button
            key={lang.code}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            type="button"
            role="menuitem"
            className="icue-lang__item"
            lang={lang.code}
            title={lang.label}
            tabIndex={open ? 0 : -1}
            onKeyDown={(event) => handleItemKeyDown(event, index)}
            onClick={() => choose(lang.code)}
          >
            <img
              className="icue-lang__flag"
              src={flagSvgUrl(lang.code)}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <span className="icue-lang__name">{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default memo(LanguageFlagMenu)
