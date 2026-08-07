import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { flagSvgUrl } from '@icue/i18n/langFlags'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import './LanguageFlagMenu.css'

/**
 * The main site's round flag button, extended into a switcher. There the flag
 * is a single link between icue.vn and en.icue.vn; this app carries six UI
 * languages of its own, so the button keeps that shape and shows the active
 * one, and the other five drop out of it as the same round flags.
 */
function LanguageFlagMenu() {
  const { t, i18n } = useTranslation()
  const currentCode = i18n.resolvedLanguage || i18n.language
  const [open, setOpen] = useState(false)

  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const itemRefs = useRef([])

  const current = SUPPORTED_LANGUAGES.find((lang) => lang.code === currentCode)
    ?? SUPPORTED_LANGUAGES[0]
  const others = SUPPORTED_LANGUAGES.filter((lang) => lang.code !== current.code)

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
    i18n.changeLanguage(code)
    close(true)
  }

  return (
    <div className="ow-lang" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="ow-lang__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('language')}: ${current.label}`}
        title={current.label}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <img
          className="ow-lang__flag"
          src={flagSvgUrl(current.code)}
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable={false}
        />
      </button>

      <div
        className={`ow-lang__menu${open ? ' is-open' : ''}`}
        role="menu"
        aria-label={t('language')}
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
            className="ow-lang__item"
            lang={lang.code}
            title={lang.label}
            tabIndex={open ? 0 : -1}
            onKeyDown={(event) => handleItemKeyDown(event, index)}
            onClick={() => choose(lang.code)}
          >
            <img
              className="ow-lang__flag"
              src={flagSvgUrl(lang.code)}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <span className="ow-lang__name">{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default memo(LanguageFlagMenu)
