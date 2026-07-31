import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import { fetchComments } from '../lib/engagement'
import {
  fetchCommentTranslations,
  saveCommentTranslation,
  deleteCommentTranslation,
} from '../lib/commentTranslations'
import {
  isBrowserTranslationSupported,
  translateWithBrowser,
  detectLanguage,
} from '../lib/browserTranslator'
import { inferSourceLanguage } from '../lib/translateUtils'
import './CaptionsDrawer.css'

/**
 * Slide-in panel for translating reader comments by hand, alongside the
 * captions drawer it is modelled on.
 *
 * Unlike captions, every locale gets a tab: comments arrive in whatever
 * language a visitor typed, so there is no single source language to exclude.
 *
 * Each row is an independent upsert into comment_translations, so saving is a
 * per-comment write rather than the merge-the-whole-row dance the article
 * translation editor needs.
 */
export default function CommentTranslationsDrawer({ open, onClose, articleId }) {
  const { t } = useTranslation()

  const [comments, setComments] = useState([])
  const [stored, setStored] = useState({})   // commentId -> saved translation
  const [edits, setEdits] = useState({})     // commentId -> textarea value
  const [state, setState] = useState('idle') // idle | loading | ready | error
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState('')
  const [suggesting, setSuggesting] = useState(false)

  const [active, setActive] = useState(SUPPORTED_LANGUAGES[0]?.code || 'vi')
  const mtSupported = useMemo(() => isBrowserTranslationSupported(), [])

  // Load comments once per open, so reopening reflects newly posted ones.
  useEffect(() => {
    if (!open || !articleId) return undefined
    let live = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState('loading')
    setSaved('')
    fetchComments(articleId)
      .then((rows) => {
        if (!live) return
        setComments(rows)
        setState('ready')
      })
      .catch(() => live && setState('error'))
    return () => { live = false }
  }, [open, articleId])

  // Stored translations for the active tab.
  useEffect(() => {
    if (!open || !comments.length || !active) return undefined
    let live = true
    fetchCommentTranslations(comments.map((c) => c.id), active)
      .then((rows) => {
        if (!live) return
        setStored(rows)
        setEdits(rows)
      })
      .catch(() => {})
    return () => { live = false }
  }, [open, comments, active])

  // Escape to close, and freeze the page behind the drawer so the author's
  // scroll position is exactly where they left it when it closes.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const setValue = useCallback((commentId, value) => {
    setSaved('')
    setEdits((prev) => ({ ...prev, [commentId]: value }))
  }, [])

  const dirty = useMemo(
    () => comments.filter((c) => (edits[c.id] || '') !== (stored[c.id] || '')),
    [comments, edits, stored],
  )

  const handleSave = useCallback(async () => {
    setBusy(true)
    setSaved('')
    try {
      for (const comment of dirty) {
        const text = (edits[comment.id] || '').trim()
        // Clearing the box removes the translation rather than storing a blank.
        if (text) await saveCommentTranslation(comment.id, active, text)
        else await deleteCommentTranslation(comment.id, active)
      }
      setStored(() => {
        const next = {}
        for (const comment of comments) {
          const text = (edits[comment.id] || '').trim()
          if (text) next[comment.id] = text
        }
        return next
      })
      setSaved(active)
    } catch {
      setSaved('error')
    } finally {
      setBusy(false)
    }
  }, [dirty, edits, comments, active])

  /**
   * Fill empty boxes with on-device machine translation as a starting point.
   * Nothing is written until the editor reviews it and presses Save — the
   * stored translation stays something a human signed off on.
   */
  const handleSuggest = useCallback(async () => {
    setSuggesting(true)
    try {
      for (const comment of comments) {
        if ((edits[comment.id] || '').trim()) continue
        const source = (await detectLanguage(comment.body))
          || inferSourceLanguage('', comment.body)
        if (!source || source === active) continue
        const output = await translateWithBrowser(comment.body, {
          sourceLanguage: source,
          targetLanguage: active,
        })
        if (output) {
          setSaved('')
          setEdits((prev) => (
            (prev[comment.id] || '').trim() ? prev : { ...prev, [comment.id]: output }
          ))
        }
      }
    } finally {
      setSuggesting(false)
    }
  }, [comments, edits, active])

  if (!open) return null

  return (
    <div
      className="captions-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={t('commentsDrawer.title')}
    >
      <button
        type="button"
        className="captions-drawer__backdrop"
        onClick={onClose}
        aria-label={t('common.close')}
      />

      <div className="captions-drawer__panel">
        <header className="captions-drawer__head">
          <h2 className="captions-drawer__title">{t('commentsDrawer.title')}</h2>
          <button
            type="button"
            className="captions-drawer__close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="captions-drawer__tabs" role="tablist">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="tab"
              aria-selected={active === l.code}
              className={`captions-drawer__tab${active === l.code ? ' is-active' : ''}`}
              onClick={() => { setActive(l.code); setSaved('') }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="captions-drawer__body">
          {state === 'loading' && (
            <p className="captions-drawer__status">{t('translationsEditor.loading')}</p>
          )}
          {state === 'error' && (
            <p className="captions-drawer__status is-error">{t('translationsEditor.loadError')}</p>
          )}

          {state === 'ready' && comments.length === 0 && (
            <p className="captions-drawer__status">{t('commentsDrawer.empty')}</p>
          )}

          {state === 'ready' && comments.map((c) => (
            <div className="captions-drawer__item" key={c.id}>
              <div className="captions-drawer__item-head">
                <span className="captions-drawer__kind">
                  {c.author_name || t('engagement.anon')}
                </span>
                <span className="captions-drawer__original">{c.body}</span>
              </div>
              <textarea
                className="textarea"
                rows={2}
                maxLength={2000}
                value={edits[c.id] || ''}
                onChange={(e) => setValue(c.id, e.target.value)}
                placeholder={t('engagement.translationPlaceholder')}
              />
            </div>
          ))}
        </div>

        <footer className="captions-drawer__foot">
          {saved === active && (
            <span className="captions-drawer__saved">{t('translationsEditor.saved')}</span>
          )}
          {saved === 'error' && (
            <span className="captions-drawer__saved is-error">{t('translationsEditor.saveError')}</span>
          )}
          {mtSupported && state === 'ready' && comments.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleSuggest}
              disabled={suggesting || busy}
              title={t('commentsDrawer.suggestHint')}
            >
              {suggesting ? t('translate.translating') : t('commentsDrawer.suggest')}
            </button>
          )}
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={handleSave}
            disabled={busy || !dirty.length || state !== 'ready'}
          >
            {busy ? t('translationsEditor.saving') : t('translationsEditor.save')}
          </button>
        </footer>
      </div>
    </div>
  )
}
