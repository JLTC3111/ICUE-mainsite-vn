import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Trash2 } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import {
  deleteArticleTranslation,
  fetchArticleTranslations,
  normalizeLang,
  saveArticleTranslation,
} from '../lib/translate'
import RichTextEditor from './RichTextEditor'
import './ArticleTranslationsEditor.css'

const EMPTY = { title: '', subtitle: '', content_html: '' }

/**
 * Per-locale translations authored by hand. Whatever is saved here is what
 * readers see when they switch language — there is no machine translation
 * anywhere in the pipeline, so a locale left blank simply falls back to the
 * article's original language.
 */
export default function ArticleTranslationsEditor({ articleId, sourceLanguage }) {
  const { t } = useTranslation()
  const sourceLang = normalizeLang(sourceLanguage) || 'vi'

  const locales = useMemo(
    () => SUPPORTED_LANGUAGES.filter((l) => l.code !== sourceLang),
    [sourceLang],
  )

  const [active, setActive] = useState(locales[0]?.code || '')
  const [drafts, setDrafts] = useState({})
  const [stored, setStored] = useState({})
  const [state, setState] = useState('loading') // loading | ready | error
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState('')

  useEffect(() => {
    let live = true
    setState('loading')
    fetchArticleTranslations(articleId)
      .then((rows) => {
        if (!live) return
        setStored(rows)
        setDrafts(rows)
        setState('ready')
      })
      .catch(() => live && setState('error'))
    return () => { live = false }
  }, [articleId])

  const current = drafts[active] || EMPTY

  const update = useCallback((field, value) => {
    setSaved('')
    setDrafts((prev) => ({
      ...prev,
      [active]: { ...(prev[active] || EMPTY), [field]: value },
    }))
  }, [active])

  const isDirty = useMemo(() => {
    const base = stored[active] || EMPTY
    return base.title !== current.title
      || (base.subtitle || '') !== (current.subtitle || '')
      || base.content_html !== current.content_html
  }, [stored, active, current])

  const handleSave = useCallback(async () => {
    setBusy(true)
    setSaved('')
    try {
      await saveArticleTranslation(articleId, active, current)
      setStored((prev) => ({ ...prev, [active]: { ...current } }))
      setSaved(active)
    } catch {
      setSaved('error')
    } finally {
      setBusy(false)
    }
  }, [articleId, active, current])

  const handleDelete = useCallback(async () => {
    setBusy(true)
    try {
      await deleteArticleTranslation(articleId, active)
      setStored((prev) => {
        const next = { ...prev }
        delete next[active]
        return next
      })
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[active]
        return next
      })
      setSaved('')
    } catch {
      setSaved('error')
    } finally {
      setBusy(false)
    }
  }, [articleId, active])

  if (!locales.length) return null

  return (
    <section className="translations-editor">
      <div className="translations-editor__head">
        <h3 className="translations-editor__title">{t('translationsEditor.title')}</h3>
        <p className="translations-editor__hint">{t('translationsEditor.hint')}</p>
      </div>

      <div className="translations-editor__tabs" role="tablist">
        {locales.map((l) => {
          const hasContent = Boolean(stored[l.code]?.title || stored[l.code]?.content_html)
          return (
            <button
              key={l.code}
              type="button"
              role="tab"
              aria-selected={active === l.code}
              className={`translations-editor__tab${active === l.code ? ' is-active' : ''}`}
              onClick={() => { setActive(l.code); setSaved('') }}
            >
              {l.label}
              {hasContent && <Check size={14} strokeWidth={2.5} aria-hidden />}
            </button>
          )
        })}
      </div>

      {state === 'loading' && <p className="translations-editor__status">{t('translationsEditor.loading')}</p>}
      {state === 'error' && (
        <p className="translations-editor__status is-error">{t('translationsEditor.loadError')}</p>
      )}

      {state === 'ready' && (
        <div className="translations-editor__panel" role="tabpanel">
          <div className="field">
            <label htmlFor={`tr-title-${active}`}>{t('translationsEditor.fieldTitle')}</label>
            <input
              id={`tr-title-${active}`}
              className="input"
              type="text"
              value={current.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder={t('translationsEditor.titlePlaceholder')}
            />
          </div>

          <div className="field">
            <label htmlFor={`tr-subtitle-${active}`}>{t('translationsEditor.fieldSubtitle')}</label>
            <input
              id={`tr-subtitle-${active}`}
              className="input"
              type="text"
              value={current.subtitle || ''}
              onChange={(e) => update('subtitle', e.target.value)}
              placeholder={t('translationsEditor.subtitlePlaceholder')}
            />
          </div>

          <div className="field">
            <label>{t('translationsEditor.fieldStory')}</label>
            <RichTextEditor
              key={active}
              value={current.content_html}
              onChange={(html) => update('content_html', html)}
              placeholder={t('translationsEditor.storyPlaceholder')}
            />
          </div>

          <div className="translations-editor__actions">
            <button
              type="button"
              className="btn btn-accent btn-sm"
              onClick={handleSave}
              disabled={busy || !isDirty}
            >
              {busy ? t('translationsEditor.saving') : t('translationsEditor.save')}
            </button>

            {stored[active] && (
              <button
                type="button"
                className="btn btn-ghost btn-sm translations-editor__delete"
                onClick={handleDelete}
                disabled={busy}
              >
                <Trash2 size={15} strokeWidth={2} aria-hidden />
                {t('translationsEditor.remove')}
              </button>
            )}

            {saved === active && (
              <span className="translations-editor__saved">{t('translationsEditor.saved')}</span>
            )}
            {saved === 'error' && (
              <span className="translations-editor__saved is-error">{t('translationsEditor.saveError')}</span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
