import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from '../../../shared/main-site-nav/ThemeToggle.jsx'
import { pageThemeLabel } from '../../../shared/ui/pageTheme.js'
import useClickOutside from '../hooks/useClickOutside'
import './HeaderMenu.css'

export default function HeaderMenu({ pageTheme }) {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(params.get('q') || '')
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const inputRef = useRef(null)
  const panelId = useId()
  const inputId = useId()
  const hasQuery = Boolean(params.get('q')?.trim())

  useEffect(() => {
    setValue(params.get('q') || '')
  }, [params])

  const close = useCallback(() => setOpen(false), [])

  useClickOutside(rootRef, close)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const submit = useCallback((event) => {
    event.preventDefault()
    const q = value.trim()
    setParams(q ? { q } : {})
    setOpen(false)
  }, [value, setParams])

  const clear = useCallback(() => {
    setValue('')
    setParams({})
    inputRef.current?.focus()
  }, [setParams])

  const locale = i18n.resolvedLanguage || i18n.language

  return (
    <div ref={rootRef} className={`structure-header-menu${open ? ' is-open' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`structure-header-menu__trigger${hasQuery ? ' has-query' : ''}`}
        aria-label={t('nav.moreOptions')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="structure-header-menu__kebab" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="structure-header-menu__dot structure-header-menu__dot--top" cx="12" cy="5" r="1.85" />
          <circle className="structure-header-menu__dot structure-header-menu__dot--mid" cx="12" cy="12" r="1.85" />
          <circle className="structure-header-menu__dot structure-header-menu__dot--bot" cx="12" cy="19" r="1.85" />
        </svg>
      </button>

      <div id={panelId} className="structure-header-menu__panel" hidden={!open}>
        <form className="structure-header-menu__search" role="search" onSubmit={submit}>
          <label className="visually-hidden" htmlFor={inputId}>
            {t('documents.searchAria')}
          </label>
          <SearchIcon />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            className="structure-header-menu__input"
            placeholder={t('documents.searchPlaceholder')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          {value ? (
            <button
              type="button"
              className="structure-header-menu__clear"
              onClick={clear}
              aria-label={t('documents.searchClear')}
            >
              <CloseIcon />
            </button>
          ) : null}
        </form>

        <div className="structure-header-menu__row">
          <span className="structure-header-menu__label">{t('language')}</span>
          <LanguageSwitcher />
        </div>

        <div className="structure-header-menu__row">
          <span className="structure-header-menu__label">{t('nav.darkMode')}</span>
          <ThemeToggle
            checked={pageTheme.isDark}
            onCheckedChange={pageTheme.setDark}
            label={pageThemeLabel(locale)}
          />
        </div>
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg className="structure-header-menu__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18" strokeLinecap="round" />
      <path d="m6 6 12 12" strokeLinecap="round" />
    </svg>
  )
}
