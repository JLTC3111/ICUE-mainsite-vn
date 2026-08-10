import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CircleAlert, Trash2 } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import { normalizeSources } from '../lib/articleSources'
import {
  getArticleTranslationCompleteness,
  getLocaleTranslationCompleteness,
} from '../lib/translationCompleteness'
import {
  deleteArticleTranslation,
  fetchArticleTranslations,
  inferSourceLanguage,
  normalizeLang,
  saveArticleTranslation,
} from '../lib/translate'
import RichTextEditor from './RichTextEditor'
import './ArticleTranslationsEditor.css'

const EMPTY = { title: '', subtitle: '', content_html: '', cover_info: '', media: [] }

/** Caption text keyed by media id, for easy diffing and editing. */
function captionsOf(entry) {
  const map = {}
  for (const item of entry?.media || []) {
    if (item?.id != null) map[String(item.id)] = item.info || ''
  }
  return map
}

function sourcesOf(entry) {
  const map = {}
  for (const source of entry?.sources || []) {
    if (source?.id == null) continue
    map[String(source.id)] = {
      label: source.label || '',
      publisher: source.publisher || '',
    }
  }
  return map
}

/**
 * Per-locale translations authored by hand. Whatever is saved here is what
 * readers see when they switch language — there is no machine translation
 * anywhere in the pipeline, so a locale left blank simply falls back to the
 * article's original language.
 */
export default function ArticleTranslationsEditor({
  articleId,
  sourceLanguage,
  sourceSample = '',
  sourceTitle = '',
  sourceSubtitle = '',
  sourceContentHtml = '',
  coverInfo = '',
  sources = [],
  media = [],
}) {
  const { t } = useTranslation()

  /*
   * Infer the language from the article's actual text, exactly as the reader
   * does via shouldTranslateArticle(). Trusting the declared `language` column
   * silently broke this editor: an article stored as 'en' whose body and
   * captions are Vietnamese had its English tab removed entirely (you cannot
   * translate "into" the declared source), so English translations were typed
   * into the Vietnamese tab and readers never saw them.
   */
  const declaredLang = normalizeLang(sourceLanguage) || 'vi'
  const sourceLang = inferSourceLanguage(declaredLang, sourceSample) || declaredLang
  const languageMismatch = sourceLang !== declaredLang

  // Only media the author actually captioned needs a translation.
  const captionSources = useMemo(
    () => (media || [])
      .filter((m) => m?.id != null && String(m.info || '').trim())
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
    [media],
  )

  const sourceRows = useMemo(() => normalizeSources(sources), [sources])

  const sourceArticle = useMemo(() => ({
    title: sourceTitle,
    subtitle: sourceSubtitle,
    content_html: sourceContentHtml,
    cover_info: coverInfo,
    sources: sourceRows,
    media,
    language: sourceLang,
  }), [sourceTitle, sourceSubtitle, sourceContentHtml, coverInfo, sourceRows, media, sourceLang])

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const currentCaptions = useMemo(() => captionsOf(current), [current])
  const currentSources = useMemo(() => sourcesOf(current), [current])

  const updateCaption = useCallback((mediaId, value) => {
    setSaved('')
    setDrafts((prev) => {
      const entry = prev[active] || EMPTY
      const existing = Array.isArray(entry.media) ? entry.media : []
      const index = existing.findIndex((m) => String(m?.id) === String(mediaId))
      const next = [...existing]
      if (index >= 0) {
        next[index] = { ...next[index], info: value }
      } else {
        const source = captionSources.find((m) => String(m.id) === String(mediaId))
        next.push({ id: mediaId, kind: source?.kind || 'image', info: value })
      }
      return { ...prev, [active]: { ...entry, media: next } }
    })
  }, [active, captionSources])

  const updateSource = useCallback((sourceId, field, value) => {
    setSaved('')
    setDrafts((prev) => {
      const entry = prev[active] || EMPTY
      const existing = Array.isArray(entry.sources) ? entry.sources : []
      const source = sourceRows.find((row) => String(row.id) === String(sourceId))
      const index = existing.findIndex((row) => String(row?.id) === String(sourceId))
      const next = [...existing]
      const base = {
        id: sourceId,
        label: '',
        publisher: '',
        ...(index >= 0 ? existing[index] : {}),
        url: source?.url || existing[index]?.url || '',
        accessed_at: source?.accessed_at || existing[index]?.accessed_at || null,
      }
      const updated = { ...base, [field]: value }
      if (index >= 0) next[index] = updated
      else next.push(updated)
      return { ...prev, [active]: { ...entry, sources: next } }
    })
  }, [active, sourceRows])

  const isDirty = useMemo(() => {
    const base = stored[active] || EMPTY
    return base.title !== current.title
      || (base.subtitle || '') !== (current.subtitle || '')
      || base.content_html !== current.content_html
      || (base.cover_info || '') !== (current.cover_info || '')
      || JSON.stringify(captionsOf(base)) !== JSON.stringify(currentCaptions)
      || JSON.stringify(sourcesOf(base)) !== JSON.stringify(currentSources)
  }, [stored, active, current, currentCaptions, currentSources])

  const storedCompleteness = useMemo(
    () => getArticleTranslationCompleteness(sourceArticle, stored, locales),
    [sourceArticle, stored, locales],
  )
  const currentCompleteness = useMemo(
    () => getLocaleTranslationCompleteness(sourceArticle, current),
    [sourceArticle, current],
  )

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
        {state === 'ready' && (
          <p className={`translations-editor__completion${storedCompleteness.complete ? ' is-complete' : ' is-incomplete'}`}>
            {storedCompleteness.complete ? (
              <Check size={15} strokeWidth={2.5} aria-hidden />
            ) : (
              <CircleAlert size={15} strokeWidth={2.2} aria-hidden />
            )}
            {t('translationsEditor.completionSummary', {
              complete: storedCompleteness.completedLocales,
              total: storedCompleteness.totalLocales,
            })}
          </p>
        )}
        {languageMismatch && (
          <p className="translations-editor__warning">
            {t('translationsEditor.languageMismatch', {
              declared: declaredLang,
              detected: sourceLang,
            })}
          </p>
        )}
      </div>

      <div className="translations-editor__tabs" role="tablist">
        {locales.map((l) => {
          const localeStatus = storedCompleteness.locales[l.code]
          const complete = state === 'ready' && localeStatus?.complete
          return (
            <button
              key={l.code}
              type="button"
              role="tab"
              aria-selected={active === l.code}
              className={`translations-editor__tab${active === l.code ? ' is-active' : ''}${state === 'ready' ? complete ? ' is-complete' : ' is-incomplete' : ''}`}
              onClick={() => { setActive(l.code); setSaved('') }}
            >
              {l.label}
              {complete ? (
                <Check size={14} strokeWidth={2.5} aria-hidden />
              ) : state === 'ready' ? (
                <CircleAlert size={14} strokeWidth={2.2} aria-hidden />
              ) : null}
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
          <p className={`translations-editor__locale-status${currentCompleteness.complete ? ' is-complete' : ' is-incomplete'}`}>
            {currentCompleteness.complete ? (
              <Check size={15} strokeWidth={2.5} aria-hidden />
            ) : (
              <CircleAlert size={15} strokeWidth={2.2} aria-hidden />
            )}
            {currentCompleteness.complete
              ? t('translationsEditor.complete')
              : t('translationsEditor.missingItems', { count: currentCompleteness.missingCount })}
          </p>

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
              /* RichTextEditor emits { html, json } — destructure it. Passing the
                 whole object stored it as content_html, which the editor's sync
                 effect then fed back into setContent(); that threw inside its
                 try/catch, so typed text never rendered and nothing was logged. */
              onChange={({ html }) => update('content_html', html)}
              placeholder={t('translationsEditor.storyPlaceholder')}
            />
          </div>

          {coverInfo && (
            <div className="field">
              <label htmlFor={`tr-cover-${active}`}>
                {t('translationsEditor.fieldCoverInfo')}
              </label>
              <span className="translations-editor__original">{coverInfo}</span>
              <input
                id={`tr-cover-${active}`}
                className="input"
                type="text"
                maxLength={240}
                value={current.cover_info || ''}
                onChange={(e) => update('cover_info', e.target.value)}
                placeholder={coverInfo}
              />
            </div>
          )}

          {captionSources.length > 0 && (
            <div className="translations-editor__captions">
              <p className="translations-editor__captions-label">
                {t('translationsEditor.captions')}
              </p>
              <p className="translations-editor__hint">{t('translationsEditor.captionsHint')}</p>

              {captionSources.map((m) => (
                <div className="field translations-editor__caption" key={m.id}>
                  <label htmlFor={`tr-cap-${active}-${m.id}`}>
                    <span className="translations-editor__caption-kind">
                      {t(`translationsEditor.kind_${m.kind}`)}
                    </span>
                    <span className="translations-editor__caption-original">{m.info}</span>
                  </label>
                  <input
                    id={`tr-cap-${active}-${m.id}`}
                    className="input"
                    type="text"
                    maxLength={240}
                    value={currentCaptions[String(m.id)] || ''}
                    onChange={(e) => updateCaption(m.id, e.target.value)}
                    placeholder={m.info}
                  />
                </div>
              ))}
            </div>
          )}

          {sourceRows.length > 0 && (
            <div className="translations-editor__sources">
              <p className="translations-editor__captions-label">
                {t('translationsEditor.sources')}
              </p>
              <p className="translations-editor__hint">{t('translationsEditor.sourcesHint')}</p>

              {sourceRows.map((source) => (
                <div className="translations-editor__source" key={source.id}>
                  <div className="field">
                    <label htmlFor={`tr-source-label-${active}-${source.id}`}>
                      {t('translationsEditor.sourceLabel')}
                      <span className="translations-editor__original">{source.label}</span>
                    </label>
                    <input
                      id={`tr-source-label-${active}-${source.id}`}
                      className="input"
                      type="text"
                      value={currentSources[String(source.id)]?.label || ''}
                      onChange={(event) => updateSource(source.id, 'label', event.target.value)}
                      placeholder={source.label}
                    />
                  </div>

                  {source.publisher && (
                    <div className="field">
                      <label htmlFor={`tr-source-publisher-${active}-${source.id}`}>
                        {t('translationsEditor.sourcePublisher')}
                        <span className="translations-editor__original">{source.publisher}</span>
                      </label>
                      <input
                        id={`tr-source-publisher-${active}-${source.id}`}
                        className="input"
                        type="text"
                        value={currentSources[String(source.id)]?.publisher || ''}
                        onChange={(event) => updateSource(source.id, 'publisher', event.target.value)}
                        placeholder={source.publisher}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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
