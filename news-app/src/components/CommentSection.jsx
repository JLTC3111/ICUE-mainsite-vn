import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchComments, addComment } from '../lib/engagement'
import {
  fetchCommentTranslations,
  saveCommentTranslation,
  deleteCommentTranslation,
} from '../lib/commentTranslations'
import {
  isBrowserTranslationSupported,
  resolveTranslationRoute,
  translateWithBrowser,
  detectLanguage,
} from '../lib/browserTranslator'
import { normalizeLang, shouldTranslateComment, inferSourceLanguage } from '../lib/translateUtils'
import CommentTranslationEditor from './CommentTranslationEditor'
import { formatDateTime } from '../lib/helpers'
import './Engagement.css'

// Auto-translation results are keyed by locale so switching languages naturally
// invalidates them without a reset effect.
const autoKey = (locale, commentId) => `${locale}::${commentId}`

/**
 * IP-based comments (no login). Any visitor can post; comments are public.
 *
 * Translation follows the same rule as the rest of the article: a hand-authored
 * translation always wins. When none exists, readers on a Chromium browser can
 * translate on the fly with the built-in on-device Translator API — that result
 * is shown but never stored. `canEdit` (article author or admin) unlocks inline
 * hand-authoring, mirroring the RLS policy on comment_translations.
 */
export default function CommentSection({ articleId, canEdit = false }) {
  const { t, i18n } = useTranslation()
  const uiLang = normalizeLang(i18n.resolvedLanguage || i18n.language)

  const [comments, setComments] = useState([])
  const [manual, setManual] = useState({})
  const [auto, setAuto] = useState({})
  const [originals, setOriginals] = useState(() => new Set())
  const [mtPhase, setMtPhase] = useState('idle') // idle | needs-download | busy
  const [progress, setProgress] = useState(0)
  const [editing, setEditing] = useState(null)

  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const mtSupported = useMemo(() => isBrowserTranslationSupported(), [])
  // Ids already machine-translated this session, so re-running the batch is cheap.
  const autoDoneRef = useRef(new Set())

  useEffect(() => {
    let active = true
    fetchComments(articleId)
      .then((rows) => active && setComments(rows))
      .catch(() => {})
    return () => { active = false }
  }, [articleId])

  // Hand-authored translations for the active locale.
  useEffect(() => {
    const ids = comments.map((c) => c.id)
    if (!ids.length || !uiLang) return undefined
    let active = true
    fetchCommentTranslations(ids, uiLang)
      .then((rows) => active && setManual(rows))
      .catch(() => {})
    return () => { active = false }
  }, [comments, uiLang])

  // Comments with no hand-authored translation that are not already in the
  // reader's language. Deliberately independent of `auto` so translating does
  // not feed back into this list.
  const pending = useMemo(
    () => comments.filter((c) => !manual[c.id] && shouldTranslateComment(c.body, uiLang)),
    [comments, manual, uiLang],
  )

  const untranslated = useMemo(
    () => pending.filter((c) => !auto[autoKey(uiLang, c.id)]),
    [pending, auto, uiLang],
  )

  const resolveSource = useCallback(async (text) => {
    const detected = await detectLanguage(text)
    return detected || inferSourceLanguage('', text)
  }, [])

  const runBrowserTranslation = useCallback(async () => {
    setMtPhase('busy')
    setProgress(0)
    try {
      for (const comment of pending) {
        if (autoDoneRef.current.has(autoKey(uiLang, comment.id))) continue
        const source = await resolveSource(comment.body)
        if (!source || source === uiLang) continue

        const output = await translateWithBrowser(comment.body, {
          sourceLanguage: source,
          targetLanguage: uiLang,
          onProgress: setProgress,
        })
        autoDoneRef.current.add(autoKey(uiLang, comment.id))
        if (output) {
          setAuto((prev) => ({ ...prev, [autoKey(uiLang, comment.id)]: output }))
        }
      }
    } finally {
      setMtPhase('idle')
    }
  }, [pending, uiLang, resolveSource])

  // Probe the on-device model. If it is already downloaded, translate straight
  // away; if it would need a download, wait for an explicit click.
  useEffect(() => {
    if (!mtSupported || !untranslated.length) return undefined
    let cancelled = false

    ;(async () => {
      const source = await resolveSource(untranslated[0].body)
      if (cancelled || !source) return
      // Route-aware: a non-English target is usually only reachable by pivoting
      // through English, which resolveTranslationRoute accounts for.
      const route = await resolveTranslationRoute(source, uiLang)
      if (cancelled || !route) return
      if (route.availability === 'available') {
        runBrowserTranslation()
      } else {
        setMtPhase('needs-download')
      }
    })()

    return () => { cancelled = true }
    // `untranslated` shrinks as results land, which re-runs this harmlessly and
    // stops once everything is translated.
  }, [mtSupported, untranslated, uiLang, resolveSource, runBrowserTranslation])

  const toggleOriginal = useCallback((id) => {
    setOriginals((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSaveTranslation = useCallback(async (commentId, text) => {
    await saveCommentTranslation(commentId, uiLang, text)
    setManual((prev) => ({ ...prev, [commentId]: text }))
  }, [uiLang])

  const handleDeleteTranslation = useCallback(async (commentId) => {
    await deleteCommentTranslation(commentId, uiLang)
    setManual((prev) => {
      const next = { ...prev }
      delete next[commentId]
      return next
    })
  }, [uiLang])

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      const text = body.trim()
      if (!text || busy) return
      setBusy(true)
      setError('')
      try {
        const row = await addComment(articleId, text, name.trim())
        setComments((list) => [row, ...list])
        setBody('')
      } catch {
        setError(t('engagement.error'))
      } finally {
        setBusy(false)
      }
    },
    [articleId, body, name, busy, t],
  )

  // The bar only appears once the probe has decided: a spinner while the model
  // works, a button when it would need a download first. An unsupported pair or
  // an unfinished probe shows nothing rather than a button that does nothing.
  const showTranslateBar =
    untranslated.length > 0 && (mtPhase === 'busy' || mtPhase === 'needs-download')

  return (
    <section className="comments icue-readw" aria-label={t('engagement.comments')}>
      <h2 className="comments__title">
        {t('engagement.commentsCount', { count: comments.length })}
      </h2>

      <form className="comments__form" onSubmit={onSubmit}>
        <input
          className="input comments__name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('engagement.namePlaceholder')}
          maxLength={80}
        />
        <textarea
          className="textarea comments__body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('engagement.commentPlaceholder')}
          rows={3}
          maxLength={2000}
        />
        {error && <p className="comments__error">{error}</p>}
        <div className="comments__actions">
          <button className="btn btn-accent btn-sm" type="submit" disabled={busy || !body.trim()}>
            {busy ? t('engagement.posting') : t('engagement.post')}
          </button>
        </div>
      </form>

      {showTranslateBar && (
        <div className="comments__translate-bar">
          {mtPhase === 'busy' ? (
            <p className="comments__translate-status">
              <span className="translator__spin" aria-hidden />
              {progress > 0 && progress < 1
                ? t('engagement.translateDownloading', { percent: Math.round(progress * 100) })
                : t('translate.translating')}
            </p>
          ) : (
            <button
              type="button"
              className="btn btn-sm comments__translate-btn"
              onClick={runBrowserTranslation}
            >
              {t('engagement.translateComments', { total: untranslated.length })}
            </button>
          )}
        </div>
      )}

      {comments.length === 0 ? (
        <p className="comments__empty">{t('engagement.empty')}</p>
      ) : (
        <ul className="comments__list">
          {comments.map((c) => {
            const manualBody = manual[c.id]
            const autoBody = auto[autoKey(uiLang, c.id)]
            const translated = manualBody || autoBody
            const showingOriginal = originals.has(c.id)
            const shown = translated && !showingOriginal ? translated : c.body

            return (
              <li key={c.id} className="comments__item">
                <div className="comments__meta">
                  <span className="comments__author">{c.author_name || t('engagement.anon')}</span>
                  <time className="comments__date" dateTime={c.created_at}>
                    {formatDateTime(c.created_at, i18n.resolvedLanguage)}
                  </time>
                </div>

                <p className="comments__text" lang={translated && !showingOriginal ? uiLang : undefined}>
                  {shown}
                </p>

                {(translated || canEdit) && (
                  <div className="comments__trans-row">
                    {translated && !showingOriginal && (
                      <span
                        className={`comments__trans-tag${manualBody ? ' is-human' : ''}`}
                        title={manualBody
                          ? t('engagement.translationHumanHint')
                          : t('engagement.translationOnDeviceHint')}
                      >
                        {manualBody
                          ? t('engagement.translationHuman')
                          : t('engagement.translationOnDevice')}
                      </span>
                    )}
                    {translated && (
                      <button
                        type="button"
                        className="comments__trans-toggle"
                        onClick={() => toggleOriginal(c.id)}
                      >
                        {showingOriginal
                          ? t('engagement.showTranslated')
                          : t('translate.original')}
                      </button>
                    )}
                    {canEdit && editing !== c.id && (
                      <button
                        type="button"
                        className="comments__trans-toggle"
                        onClick={() => setEditing(c.id)}
                      >
                        {manualBody
                          ? t('engagement.editTranslation')
                          : t('engagement.addTranslation')}
                      </button>
                    )}
                  </div>
                )}

                {canEdit && editing === c.id && (
                  <CommentTranslationEditor
                    locale={uiLang}
                    initialValue={manualBody || ''}
                    suggestion={autoBody || ''}
                    onSave={(text) => handleSaveTranslation(c.id, text)}
                    onDelete={() => handleDeleteTranslation(c.id)}
                    onClose={() => setEditing(null)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
