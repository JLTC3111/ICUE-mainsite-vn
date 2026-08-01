import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, MotionConfig } from 'motion/react'
import { ArrowLeft, Search, X } from 'lucide-react'
import useClickOutside from '../hooks/useClickOutside'
import './ArticleSearch.css'

const transition = {
  type: 'spring',
  bounce: 0.1,
  duration: 0.2,
}

function ToolbarButton({ children, onClick, disabled, ariaLabel, type = 'button' }) {
  return (
    <button
      className="article-search__btn"
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

export default function ArticleSearch({ open, onOpenChange }) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : uncontrolledOpen
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
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const close = useCallback(() => setIsOpen(false), [setIsOpen])

  useClickOutside(containerRef, close)

  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  const submit = useCallback((e) => {
    e?.preventDefault()
    const q = value.trim()
    if (location.pathname === '/') {
      setParams(q ? { q } : {})
    } else {
      navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
    }
    setIsOpen(false)
  }, [value, location.pathname, navigate, setParams, setIsOpen])

  const clear = useCallback(() => {
    setDraft({ source: queryValue, value: '' })
    if (location.pathname === '/') {
      setParams({})
    } else {
      navigate('/')
    }
    inputRef.current?.focus()
  }, [location.pathname, navigate, queryValue, setParams])

  return (
    <MotionConfig transition={transition}>
      <div
        ref={containerRef}
        className={`article-search${isOpen ? ' is-open' : ''}${hasQuery ? ' has-query' : ''}`}
      >
        <div className="article-search__shell">
          <motion.div
            className="article-search__motion"
            animate={{ width: isOpen ? 300 : 36 }}
            initial={false}
          >
            <div className="article-search__inner">
              {!isOpen ? (
                <div className="article-search__row">
                  <ToolbarButton
                    onClick={() => setIsOpen(true)}
                    ariaLabel={t('search.open')}
                  >
                    <Search className="article-search__icon" strokeWidth={2} aria-hidden />
                  </ToolbarButton>
                </div>
              ) : (
                <form className="article-search__row" onSubmit={submit} role="search">
                  <ToolbarButton onClick={close} ariaLabel={t('search.back')}>
                    <ArrowLeft className="article-search__icon" strokeWidth={2} aria-hidden />
                  </ToolbarButton>
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
                      autoFocus
                    />
                    <div className="article-search__field-actions">
                      {value ? (
                        <ToolbarButton onClick={clear} ariaLabel={t('search.clear')}>
                          <X className="article-search__icon article-search__icon--sm" strokeWidth={2} aria-hidden />
                        </ToolbarButton>
                      ) : null}
                    </div>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  )
}
