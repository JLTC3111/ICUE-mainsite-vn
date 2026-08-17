import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, MotionConfig } from 'motion/react'
import { ArrowLeft, X } from 'lucide-react'
import DevIcon218 from './icons/DevIcon218'
import useClickOutside from '../hooks/useClickOutside'
import useMediaQuery from '../hooks/useMediaQuery'
import { useNewsroomSearch } from '../context/NewsroomSearchContext'
import './ArticleSearch.css'

/* motion-primitives' Toolbar Dynamic. The spring on the track's width is the
   whole effect: the control reads as one thing changing shape, and the swap from
   trigger to field happens out of sight behind the closing track. */
const TRANSITION = { type: 'spring', bounce: 0.1, duration: 0.2 }

/* Track widths, closed → open. The compact breakpoint matches the one in
   ArticleSearch.css that floats the open bar over the header: there it is
   already width-constrained by its shell, so the track fills it. */
const COMPACT_QUERY = '(max-width: 860px)'
const WIDTHS = {
  compact: { closed: 44, open: '100%' },
  regular: { closed: 36, open: 270 },
}

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
  const navigate = useNavigate()
  const location = useLocation()
  const { query, setQuery, clearQuery, hasQuery } = useNewsroomSearch()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = expanded || (isControlled ? open : uncontrolledOpen)
  const isCompact = useMediaQuery(COMPACT_QUERY)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const widths = WIDTHS[isCompact ? 'compact' : 'regular']

  const setIsOpen = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(isOpen) : next
    if (!isControlled) setUncontrolledOpen(resolved)
    onOpenChange?.(resolved)
  }, [isControlled, isOpen, onOpenChange])

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

  /* Typing already filters the grid, so submitting is only ever "I am done" —
     except from an article, where there is no grid under the field and Enter has
     to carry the query to one. */
  const submit = useCallback((e) => {
    e?.preventDefault()
    const q = query.trim()
    if (location.pathname !== '/') navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
    setIsOpen(false)
  }, [query, location.pathname, navigate, setIsOpen])

  const clear = useCallback(() => {
    clearQuery()
    inputRef.current?.focus()
  }, [clearQuery])

  return (
    <MotionConfig transition={TRANSITION}>
      <div
        ref={containerRef}
        className={`article-search${isOpen ? ' is-open' : ''}${expanded ? ' is-expanded' : ''}${hasQuery ? ' has-query' : ''}`}
      >
        <div className="article-search__shell">
          <motion.div
            className="article-search__motion"
            animate={{ width: isOpen ? widths.open : widths.closed }}
            initial={false}
          >
            {/* The swap itself is not animated — as in the primitive, the track
                closing over it is what hides the change. Only the incoming row
                fades, so a 36px icon does not appear fully formed inside a
                270px field on the first frame. */}
            <div className="article-search__inner">
              {!isOpen ? (
                <motion.div
                  className="article-search__row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <ToolbarButton
                    onClick={() => setIsOpen(true)}
                    ariaLabel={hasQuery
                      ? `${t('search.open')}. ${t('search.showing', { query: query.trim() })}`
                      : t('search.open')}
                    aria-expanded={isOpen}
                    aria-controls="article-search-form"
                  >
                    <DevIcon218 className="article-search__icon article-search__icon--lens" />
                    {hasQuery && <span className="article-search__active-dot" aria-hidden="true" />}
                  </ToolbarButton>
                </motion.div>
              ) : (
                <motion.form
                  id="article-search-form"
                  className="article-search__row"
                  onSubmit={submit}
                  role="search"
                  aria-label={t('search.label')}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
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
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoComplete="off"
                      enterKeyHint="search"
                      autoFocus={!expanded}
                    />
                    <div className="article-search__field-actions">
                      {query ? (
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
                </motion.form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  )
}
