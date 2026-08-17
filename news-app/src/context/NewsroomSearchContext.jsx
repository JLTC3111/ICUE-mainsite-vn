import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

const NewsroomSearchContext = createContext(null)

/** The grid route — the only one where a live query has anything to filter. */
const GRID_PATH = '/'

/**
 * How long the field must sit still before the live query reaches `?q=`.
 * The query itself is live; only its mirror in the URL waits. Writing per
 * keystroke would mean a `history.replaceState` per character, which Safari
 * rate-limits, for a value nobody reads mid-word.
 */
const URL_SYNC_DELAY = 400

/**
 * Owns the newsroom's live search query.
 *
 * It lives above both the header (which types into it) and the grid (which
 * filters on it) so a keystroke reaches the card list directly, without a
 * round-trip through the router. `?q=` is still the durable form of the query —
 * shareable, reloadable, and what history navigation restores — it just trails
 * the field instead of leading it.
 */
export function NewsroomSearchProvider({ children }) {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const urlQuery = params.get('q') || ''
  const [query, setQueryState] = useState(urlQuery)
  /* The last value the URL and this provider agreed on. A `?q=` that differs
     from it arrived from outside — a pasted link, back/forward — and wins over
     whatever is in the field. */
  const settledRef = useRef(urlQuery)
  const syncTimerRef = useRef(0)

  useEffect(() => {
    if (urlQuery === settledRef.current) return
    settledRef.current = urlQuery
    // Drop a pending mirror of the value being replaced, or it would write the
    // abandoned query straight back into the URL.
    window.clearTimeout(syncTimerRef.current)
    setQueryState(urlQuery)
  }, [urlQuery])

  const onGrid = pathname === GRID_PATH

  useEffect(() => {
    // Off the grid the query is only a draft for the header's submit, which
    // navigates. Mirroring it would rewrite an article's own URL.
    if (!onGrid) return undefined

    const next = query.trim()
    if (next === settledRef.current) return undefined

    syncTimerRef.current = window.setTimeout(() => {
      settledRef.current = next
      setParams((current) => {
        const nextParams = new URLSearchParams(current)
        if (next) nextParams.set('q', next)
        else nextParams.delete('q')
        return nextParams
      }, { replace: true })
    }, URL_SYNC_DELAY)

    return () => window.clearTimeout(syncTimerRef.current)
  }, [onGrid, query, setParams])

  /* Always a plain string: `clearQuery` is handed straight to onClick in a couple
     of places, and every reader of `query` calls string methods on it. */
  const setQuery = useCallback((next) => {
    setQueryState(typeof next === 'string' ? next : '')
  }, [])

  const clearQuery = useCallback(() => setQueryState(''), [])

  const value = useMemo(() => ({
    query,
    setQuery,
    clearQuery,
    hasQuery: Boolean(query.trim()),
  }), [query, setQuery, clearQuery])

  return (
    <NewsroomSearchContext.Provider value={value}>
      {children}
    </NewsroomSearchContext.Provider>
  )
}

export function useNewsroomSearch() {
  const ctx = useContext(NewsroomSearchContext)
  if (!ctx) {
    throw new Error('useNewsroomSearch must be used within NewsroomSearchProvider')
  }
  return ctx
}
