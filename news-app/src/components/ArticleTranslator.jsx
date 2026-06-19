import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import { translateArticle } from '../lib/translate'
import './ArticleTranslator.css'

const LANG_LABELS = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label]),
)

// On-demand translator control. It does nothing until the reader opens the menu
// and picks a target language; then it machine-translates the article (any source
// language) and hands the result back to the parent via onApply.
export default function ArticleTranslator({ article, activeLang, onApply, onReset }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = async (code) => {
    setOpen(false)
    if (code === activeLang) return
    setError(false)
    setBusy(true)
    try {
      const result = await translateArticle(article, code)
      onApply(result, code)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="translator" ref={rootRef}>
      <div className="translator__controls">
        <button
          type="button"
          className="translator__btn"
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {busy ? (
            <span className="translator__spin" aria-hidden />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 5h7M9 3v2c0 4-2 7-6 9M5 9c0 2 2.5 4 6 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 19l3.5-8 3.5 8M14.4 16h4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span>{busy ? t('translate.translating') : t('translate.button')}</span>
        </button>

        {activeLang && !busy && (
          <button type="button" className="translator__reset" onClick={onReset}>
            {t('translate.original')}
          </button>
        )}
      </div>

      {open && (
        <ul className="translator__menu" role="listbox">
          {SUPPORTED_LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === activeLang}
                className={`translator__opt${l.code === activeLang ? ' is-active' : ''}`}
                onClick={() => choose(l.code)}
              >
                <span className="translator__flag" aria-hidden>{l.flag}</span>
                <span>{l.label}</span>
                {l.code === activeLang && <span className="translator__check" aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeLang && !busy && !error && (
        <p className="translator__status">
          {t('translate.translated', { lang: LANG_LABELS[activeLang] || activeLang })}
          <span className="translator__note"> · {t('translate.note')}</span>
        </p>
      )}
      {error && <p className="translator__status translator__status--err">{t('translate.error')}</p>}
    </div>
  )
}
