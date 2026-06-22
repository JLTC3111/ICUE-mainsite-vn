import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import './ArticleSearch.css'

export default function ArticleSearch({ variant = 'hero' }) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [value, setValue] = useState(params.get('q') || '')
  const inputRef = useRef(null)

  useEffect(() => {
    setValue(params.get('q') || '')
  }, [params])

  const applySearch = useCallback((q) => {
    const trimmed = q.trim()
    if (location.pathname === '/') {
      setParams(trimmed ? { q: trimmed } : {})
    } else {
      navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/')
    }
  }, [location.pathname, navigate, setParams])

  const submit = useCallback((e) => {
    e?.preventDefault()
    applySearch(value)
  }, [applySearch, value])

  const clear = useCallback(() => {
    setValue('')
    applySearch('')
    inputRef.current?.focus()
  }, [applySearch])

  if (variant === 'hero') {
    return (
      <form className="article-search article-search--hero" onSubmit={submit} role="search">
        <label className="article-search__hero-label" htmlFor="news-search-input">
          {t('search.label')}
        </label>
        <div className="article-search__hero-row">
          <span className="article-search__hero-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={inputRef}
            id="news-search-input"
            type="search"
            className="article-search__hero-input"
            placeholder={t('search.placeholder')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
          />
          {value && (
            <button type="button" className="article-search__hero-clear" onClick={clear}>
              {t('search.clear')}
            </button>
          )}
          <button type="submit" className="article-search__hero-submit">{t('search.submit')}</button>
        </div>
        {params.get('q') && (
          <p className="article-search__hero-hint">
            {t('search.showing', { query: params.get('q') })}
          </p>
        )}
      </form>
    )
  }

  return null
}
