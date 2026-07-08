import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import './ArticleSearch.css'

export default function ArticleSearch() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(params.get('q') || '')
  const inputRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    setValue(params.get('q') || '')
  }, [params])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const submit = useCallback((e) => {
    e?.preventDefault()
    const q = value.trim()
    if (location.pathname === '/') {
      setParams(q ? { q } : {})
    } else {
      navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
    }
    setOpen(false)
  }, [value, location.pathname, navigate, setParams])

  const clear = useCallback(() => {
    setValue('')
    if (location.pathname === '/') {
      setParams({})
    } else {
      navigate('/')
    }
    setOpen(false)
  }, [location.pathname, navigate, setParams])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className={`article-search${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="article-search__toggle"
        aria-label={t('search.open')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <form className="article-search__panel" onSubmit={submit} role="search">
          <label className="visually-hidden" htmlFor="article-search-input">{t('search.label')}</label>
          <input
            ref={inputRef}
            id="article-search-input"
            type="search"
            className="article-search__input"
            placeholder={t('search.placeholder')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          {value && (
            <button type="button" className="article-search__clear" onClick={clear}>
              {t('search.clear')}
            </button>
          )}
          <button type="submit" className="article-search__submit">{t('search.submit')}</button>
        </form>
      )}
    </div>
  )
}
