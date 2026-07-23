import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { motion, MotionConfig } from 'motion/react'
import useClickOutside from '../hooks/useClickOutside'
import './DocumentSearch.css'

const transition = {
  type: 'spring',
  bounce: 0.1,
  duration: 0.2,
}

function ToolbarButton({ children, onClick, disabled, ariaLabel, type = 'button' }) {
  return (
    <button
      className="document-search__btn"
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

export default function DocumentSearch({ open, onOpenChange }) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : uncontrolledOpen
  const [value, setValue] = useState(params.get('q') || '')
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const hasQuery = Boolean(params.get('q')?.trim())

  const setIsOpen = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(isOpen) : next
    if (!isControlled) setUncontrolledOpen(resolved)
    onOpenChange?.(resolved)
  }, [isControlled, isOpen, onOpenChange])

  useEffect(() => {
    setValue(params.get('q') || '')
  }, [params])

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
    setParams(q ? { q } : {})
    setIsOpen(false)
  }, [value, setParams, setIsOpen])

  const clear = useCallback(() => {
    setValue('')
    setParams({})
    inputRef.current?.focus()
  }, [setParams])

  return (
    <MotionConfig transition={transition}>
      <div
        ref={containerRef}
        className={`document-search${isOpen ? ' is-open' : ''}${hasQuery ? ' has-query' : ''}`}
      >
        <div className="document-search__shell">
          <motion.div
            className="document-search__motion"
            animate={{ width: isOpen ? 280 : 48 }}
            initial={false}
          >
            <div className="document-search__inner">
              {!isOpen ? (
                <div className="document-search__row">
                  <ToolbarButton
                    onClick={() => setIsOpen(true)}
                    ariaLabel={t('documents.searchOpen')}
                  >
                    <SearchIcon />
                  </ToolbarButton>
                </div>
              ) : (
                <form className="document-search__row" onSubmit={submit} role="search">
                  <ToolbarButton onClick={close} ariaLabel={t('documents.searchBack')}>
                    <ArrowLeftIcon />
                  </ToolbarButton>
                  <div className="document-search__field">
                    <label className="visually-hidden" htmlFor="document-search-input">
                      {t('documents.searchAria')}
                    </label>
                    <input
                      ref={inputRef}
                      id="document-search-input"
                      type="search"
                      className="document-search__input"
                      placeholder={t('documents.searchPlaceholder')}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      autoComplete="off"
                      enterKeyHint="search"
                      autoFocus
                    />
                    <div className="document-search__field-actions">
                      {value ? (
                        <ToolbarButton onClick={clear} ariaLabel={t('documents.searchClear')}>
                          <CloseIcon />
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

function SearchIcon() {
  return (
    <svg className="document-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg className="document-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M19 12H5" strokeLinecap="round" />
      <path d="m12 19-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="document-search__icon document-search__icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18" strokeLinecap="round" />
      <path d="m6 6 12 12" strokeLinecap="round" />
    </svg>
  )
}
