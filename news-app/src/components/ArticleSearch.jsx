import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import DevIcon218 from './icons/DevIcon218'
import useClickOutside from '../hooks/useClickOutside'
import './ArticleSearch.css'

function ToolbarButton({
  children,
  onClick,
  disabled,
  ariaLabel,
  type = 'button',
  className = '',
  ...buttonProps
}) {
  return (
    <button
      className={`article-search__btn${className ? ` ${className}` : ''}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      {...buttonProps}
    >
      {children}
    </button>
  )
}

export default function ArticleSearch({ open, expanded = false, onOpenChange }) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = expanded || (isControlled ? open : uncontrolledOpen)
  const queryValue = params.get('q') || ''
  const [draft, setDraft] = useState(() => ({ source: queryValue, value: queryValue }))
  const value = draft.source === queryValue ? draft.value : queryValue
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const lastQueryRef = useRef(queryValue)
  const hasQuery = Boolean(queryValue.trim())

  const setIsOpen = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(isOpen) : next
    if (!isControlled) setUncontrolledOpen(resolved)
    onOpenChange?.(resolved)
  }, [isControlled, isOpen, onOpenChange])

  useEffect(() => {
    if (lastQueryRef.current === queryValue) return undefined
    lastQueryRef.current = queryValue
    const frameId = requestAnimationFrame(() => {
      setDraft({ source: queryValue, value: queryValue })
    })
    return () => cancelAnimationFrame(frameId)
  }, [queryValue])

  useEffect(() => {
    if (isOpen && !expanded) inputRef.current?.focus()
  }, [expanded, isOpen])

  const close = useCallback(() => {
    if (!expanded) setIsOpen(false)
  }, [expanded, setIsOpen])

  useClickOutside(containerRef, close)

  useEffect(() => {
    if (!isOpen || expanded) return undefined
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [expanded, isOpen, close])

  const submit = useCallback((e) => {
    e?.preventDefault()
    const q = value.trim()
    if (location.pathname === '/') {
      const nextParams = new URLSearchParams(params)
      if (q) nextParams.set('q', q)
      else nextParams.delete('q')
      setParams(nextParams)
    } else {
      navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
    }
    setIsOpen(false)
  }, [value, location.pathname, navigate, params, setParams, setIsOpen])

  const clear = useCallback(() => {
    setDraft({ source: queryValue, value: '' })
    if (location.pathname === '/') {
      const nextParams = new URLSearchParams(params)
      nextParams.delete('q')
      setParams(nextParams, { replace: true })
    } else {
      navigate('/')
    }
    inputRef.current?.focus()
  }, [location.pathname, navigate, params, queryValue, setParams])

  return (
    <div
      ref={containerRef}
      className={`article-search${isOpen ? ' is-open' : ''}${expanded ? ' is-expanded' : ''}${hasQuery ? ' has-query' : ''}`}
    >
      <div className="article-search__shell">
        <div className="article-search__motion">
          <div className="article-search__inner">
            {!isOpen ? (
              <div className="article-search__row">
                <ToolbarButton
                  onClick={() => setIsOpen(true)}
                  ariaLabel={hasQuery
                    ? `${t('search.open')}. ${t('search.showing', { query: queryValue.trim() })}`
                    : t('search.open')}
                  aria-expanded={isOpen}
                  aria-controls="article-search-form"
                >
                  <DevIcon218 className="article-search__icon article-search__icon--lens" />
                  {hasQuery && <span className="article-search__active-dot" aria-hidden="true" />}
                </ToolbarButton>
              </div>
            ) : (
              <form
                id="article-search-form"
                className="article-search__row"
                onSubmit={submit}
                role="search"
                aria-label={t('search.label')}
              >
                {!expanded && (
                  <ToolbarButton onClick={close} ariaLabel={t('search.back')}>
                    <ArrowLeft className="article-search__icon" strokeWidth={2} aria-hidden />
                  </ToolbarButton>
                )}
                <div className="article-search__field">
                  <label className="visually-hidden" htmlFor="article-search-input">
                    {t('search.label')}
                  </label>
                  <input
                    ref={inputRef}
                    id="article-search-input"
                    type="search"
                    className="article-search__input"
                    placeholder={t('search.placeholder')}
                    value={value}
                    onChange={(e) => setDraft({ source: queryValue, value: e.target.value })}
                    autoComplete="off"
                    enterKeyHint="search"
                    autoFocus={!expanded}
                  />
                  <div className="article-search__field-actions">
                    {value ? (
                      <ToolbarButton onClick={clear} ariaLabel={t('search.clear')}>
                        <X className="article-search__icon article-search__icon--sm" strokeWidth={2} aria-hidden />
                      </ToolbarButton>
                    ) : null}
                    <ToolbarButton
                      type="submit"
                      className="article-search__btn--submit"
                      ariaLabel={t('search.submit')}
                    >
                      <DevIcon218 className="article-search__icon article-search__icon--lens article-search__icon--sm" />
                    </ToolbarButton>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
