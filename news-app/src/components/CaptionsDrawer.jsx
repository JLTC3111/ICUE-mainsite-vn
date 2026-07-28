import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import {
  fetchArticleTranslations,
  inferSourceLanguage,
  normalizeLang,
  saveArticleTranslation,
} from '../lib/translate'
import './CaptionsDrawer.css'

/**
 * Slide-in panel for translating media captions from anywhere on the edit page.
 *
 * Exists because captions previously lived only in the Translations section at
 * the very bottom of the form: touching one caption meant scrolling past the
 * entire body editor and losing your place. This is reachable at any scroll
 * position and restores it on close.
 *
 * IMPORTANT — saving merges, it does not replace. A translation row holds the
 * title, subtitle, body and cover info for that locale too; saving only the
 * captions would wipe all of it, since saveArticleTranslation() upserts the
 * whole row. Every save therefore starts from the stored row and overlays just
 * the caption edits.
 */
export default function CaptionsDrawer({
  open,
  onClose,
  articleId,
  media = [],
  sourceLanguage,
  sourceSample = '',
}) {
  const { t } = useTranslation()

  const declaredLang = normalizeLang(sourceLanguage) || 'vi'
  const sourceLang = inferSourceLanguage(declaredLang, sourceSample) || declaredLang

  const captionSources = useMemo(
    () => (media || [])
      .filter((m) => m?.id != null && String(m.info || '').trim())
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
    [media],
  )

  const locales = useMemo(
    () => SUPPORTED_LANGUAGES.filter((l) => l.code !== sourceLang),
    [sourceLang],
  )

  const [active, setActive] = useState(locales[0]?.code || '')
  const [rows, setRows] = useState({})          // locale -> stored translation row
  const [edits, setEdits] = useState({})        // locale -> { mediaId: text }
  const [state, setState] = useState('idle')    // idle | loading | ready | error
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState('')

  // Load once per open, so reopening always reflects what is actually stored.
  useEffect(() => {
    if (!open || !articleId) return undefined
    let live = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState('loading')
    setSaved('')
    fetchArticleTranslations(articleId)
      .then((data) => {
        if (!live) return
        setRows(data)
        setEdits(Object.fromEntries(
          Object.entries(data).map(([locale, row]) => [
            locale,
            Object.fromEntries((row.media || []).map((m) => [String(m.id), m.info || ''])),
          ]),
        ))
        setState('ready')
      })
      .catch(() => live && setState('error'))
    return () => { live = false }
  }, [open, articleId])

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

  const setCaption = useCallback((mediaId, value) => {
    setSaved('')
    setEdits((prev) => ({
      ...prev,
      [active]: { ...(prev[active] || {}), [String(mediaId)]: value },
    }))
  }, [active])

  const currentEdits = useMemo(() => edits[active] || {}, [edits, active])

  const isDirty = useMemo(() => {
    const stored = Object.fromEntries(
      ((rows[active]?.media) || []).map((m) => [String(m.id), m.info || '']),
    )
    return captionSources.some(
      (m) => (currentEdits[String(m.id)] || '') !== (stored[String(m.id)] || ''),
    )
  }, [rows, active, currentEdits, captionSources])

  const handleSave = useCallback(async () => {
    setBusy(true)
    setSaved('')
    try {
      const stored = rows[active] || {}
      const existing = new Map(((stored.media) || []).map((m) => [String(m.id), m]))

      for (const source of captionSources) {
        const key = String(source.id)
        const text = currentEdits[key] || ''
        const prev = existing.get(key)
        existing.set(key, { ...(prev || { id: source.id, kind: source.kind }), info: text })
      }

      // Spread the stored row first so title/subtitle/body/cover_info survive.
      const merged = { ...stored, media: [...existing.values()] }
      await saveArticleTranslation(articleId, active, merged)
      setRows((prev) => ({ ...prev, [active]: merged }))
      setSaved(active)
    } catch {
      setSaved('error')
    } finally {
      setBusy(false)
    }
  }, [rows, active, currentEdits, captionSources, articleId])

  if (!open) return null

  return (
    <div className="captions-drawer" role="dialog" aria-modal="true" aria-label={t('captionsDrawer.title')}>
      <button
        type="button"
        className="captions-drawer__backdrop"
        onClick={onClose}
        aria-label={t('common.close')}
      />

      <div className="captions-drawer__panel">
        <header className="captions-drawer__head">
          <h2 className="captions-drawer__title">{t('captionsDrawer.title')}</h2>
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
          {locales.map((l) => (
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

          {state === 'ready' && captionSources.length === 0 && (
            <p className="captions-drawer__status">{t('captionsDrawer.empty')}</p>
          )}

          {state === 'ready' && captionSources.map((m) => (
            <div className="captions-drawer__item" key={m.id}>
              <div className="captions-drawer__item-head">
                <span className="captions-drawer__kind">
                  {t(`translationsEditor.kind_${m.kind}`)}
                </span>
                <span className="captions-drawer__original">{m.info}</span>
              </div>
              <input
                className="input"
                type="text"
                maxLength={240}
                value={currentEdits[String(m.id)] || ''}
                onChange={(e) => setCaption(m.id, e.target.value)}
                placeholder={m.info}
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
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={handleSave}
            disabled={busy || !isDirty || state !== 'ready'}
          >
            {busy ? t('translationsEditor.saving') : t('translationsEditor.save')}
          </button>
        </footer>
      </div>
    </div>
  )
}
