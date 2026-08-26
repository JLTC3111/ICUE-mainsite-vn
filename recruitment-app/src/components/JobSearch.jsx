import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** Matches the legacy debounce at src/script.js:3365-3371. */
const DEBOUNCE_MS = 300

/**
 * The search field.
 *
 * Filtering happens as you type, debounced, exactly as the legacy JobBoard did
 * — the submit button is kept because the legacy form had one and because it
 * is what a reader on a phone keyboard reaches for, but it only flushes the
 * pending debounce rather than doing anything the typing has not already done.
 */
export default function JobSearch({ value, onChange }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value)
  const timerRef = useRef(null)

  // Keep the field in step when the parent clears the query.
  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const schedule = (next) => {
    setDraft(next)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(next), DEBOUNCE_MS)
  }

  const flush = (event) => {
    event.preventDefault()
    clearTimeout(timerRef.current)
    onChange(draft)
  }

  const clear = () => {
    clearTimeout(timerRef.current)
    setDraft('')
    onChange('')
  }

  return (
    <form className="rc-search__form" onSubmit={flush} role="search">
      <input
        type="search"
        className="rc-search__input"
        id="job-search"
        value={draft}
        onChange={(event) => schedule(event.target.value)}
        placeholder={t('search.placeholder')}
        aria-label={t('search.label')}
      />
      <button type="submit" className="rc-search__submit">
        {t('search.submit')}
      </button>
      <button type="button" className="rc-search__clear" onClick={clear} disabled={!draft}>
        {t('search.clear')}
      </button>
    </form>
  )
}
