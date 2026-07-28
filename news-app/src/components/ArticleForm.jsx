import { useState, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_AVATAR } from '../lib/defaults'
import { CATEGORY_SLUGS, DEFAULT_CATEGORY } from '../lib/categories'
import RichTextEditor from './RichTextEditor'
import ArticleSourcesEditor from './ArticleSourcesEditor'
import MediaUploader from './MediaUploader'
import EditorSection from './EditorSection'
import EditorOutlineRail from './EditorOutlineRail'
import ArticleTranslationsEditor from './ArticleTranslationsEditor'
import CaptionsDrawer from './CaptionsDrawer'
import { MessageSquare } from 'lucide-react'
import { buildArticleTranslateSample } from '../lib/translate'
import ErrorBoundary from './ErrorBoundary'
import { normalizeSources } from '../lib/articleSources'
import {
  coverComparisonToEditorIds,
  COVER_COMPARISON_ID,
  COVER_COMPARISON_ID_2,
  findEditorCoverComparisonPairs,
  pruneEditorComparison,
} from '../lib/mediaComparison'
import CoverComparisonEditor from './CoverComparisonEditor'
import ArticleThumbnail from './ArticleThumbnail'
import DatePickerField from './DatePickerField'
import TimePickerField from './TimePickerField'
import './ArticleForm.css'

const todayStr = () => new Date().toISOString().slice(0, 10)
const nowTime = () => new Date().toTimeString().slice(0, 5)

export default function ArticleForm({ mode = 'create', initial, onSubmit }) {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const goBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/dashboard')
  }, [navigate])

  const [title, setTitle] = useState(initial?.title || '')
  const [subtitle, setSubtitle] = useState(initial?.subtitle || '')
  // Byline shown on the article — independent of the logged-in account.
  const [author, setAuthor] = useState(
    initial?.author_name || profile?.display_name || profile?.full_name || '',
  )
  const [date, setDate] = useState(initial?.article_date || todayStr())
  const [time, setTime] = useState(initial?.article_time?.slice(0, 5) || nowTime())
  const [category, setCategory] = useState(initial?.category || DEFAULT_CATEGORY)
  const [contentHtml, setContentHtml] = useState(initial?.content_html || '')
  const [contentJson, setContentJson] = useState(initial?.content_json || null)
  const [sources, setSources] = useState(() => normalizeSources(initial?.sources))
  const [items, setItems] = useState(initial?.items || [])
  const [coverComparison, setCoverComparison] = useState(() =>
    coverComparisonToEditorIds(initial?.cover_comparison, initial?.items || []),
  )
  const [coverUrl, setCoverUrl] = useState(initial?.cover_image_url || '')
  const [coverAltUrl, setCoverAltUrl] = useState(initial?.cover_image_alt_url || '')
  const [coverInfo, setCoverInfo] = useState(initial?.cover_info || '')
  const [captionsOpen, setCaptionsOpen] = useState(false)
  const [metaOpen, setMetaOpen] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(null)

  // Captions only exist for media already saved to the database, so the pill is
  // hidden while creating a new article (nothing has an id yet).
  const captionedMedia = useMemo(
    () => (initial?.media || []).filter((m) => m?.id && String(m.info || '').trim()),
    [initial],
  )

  const outlineItems = useMemo(() => {
    const items = [
      { id: 'edit-meta', label: t('editor.outlineMeta'), kind: 'expands' },
      { id: 'edit-cover', label: t('editor.outlineCover'), kind: 'expands' },
      { id: 'edit-title', label: t('editor.outlineTitle') },
      { id: 'edit-body', label: t('editor.outlineBody') },
      { id: 'edit-sources', label: t('editor.outlineSources') },
      { id: 'edit-media', label: t('editor.outlineMedia') },
    ]
    if (mode === 'edit') {
      items.push({ id: 'edit-translations', label: t('editor.outlineTranslations') })
      // Always listed once the article exists — hiding it at zero made the
      // entry look broken on articles whose author never captioned anything.
      // The drawer explains the empty state instead.
      items.push({
        id: 'captions',
        label: t('captionsDrawer.title'),
        kind: 'drawer',
        count: captionedMedia.length,
      })
    }
    return items
  }, [t, mode, captionedMedia])

  const handleOutlineNavigate = useCallback((item) => {
    setActiveSection(item.id)

    // Captions live in the drawer, not the page flow — open it, don't scroll.
    if (item.kind === 'drawer') {
      setCaptionsOpen(true)
      return
    }

    // A collapsed section has nothing to scroll to but its one-line header, so
    // expand it first; the scroll runs on the next frame, once the panel has
    // begun laying out at its full height.
    if (item.id === 'edit-meta') setMetaOpen(true)
    if (item.id === 'edit-cover') setCoverOpen(true)

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => {
      document.getElementById(item.id)?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }, [])

  const coverFileRef = useRef(null)
  const coverAltFileRef = useRef(null)
  const coverInputRef = useRef(null)
  const coverAltInputRef = useRef(null)
  const [coverPreview, setCoverPreview] = useState(initial?.cover_image_url || '')
  const [coverAltPreview, setCoverAltPreview] = useState(initial?.cover_image_alt_url || '')

  const pickCover = useCallback(() => {
    coverInputRef.current?.click()
  }, [])

  const pickCoverAlt = useCallback(() => {
    coverAltInputRef.current?.click()
  }, [])

  const removeMediaItem = useCallback((id) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.isNew && target.url?.startsWith('blob:')) URL.revokeObjectURL(target.url)
      return prev.filter((item) => item.id !== id)
    })
    setCoverComparison((prev) => pruneEditorComparison(prev, id))
  }, [])

  const [busy, setBusy] = useState(null) // 'draft' | 'publish' | 'update'
  const [error, setError] = useState('')

  const galleryImages = useMemo(
    () => items.filter((item) => item.kind === 'image'),
    [items],
  )

  const thumbnailComparison = useMemo(
    () => findEditorCoverComparisonPairs(
      coverPreview,
      galleryImages,
      coverComparison,
      coverAltPreview,
    )[0] ?? null,
    [coverPreview, coverAltPreview, galleryImages, coverComparison],
  )

  const onEditorChange = useCallback(({ html, json }) => {
    setContentHtml(html)
    setContentJson(json)
    setError((e) => (e ? '' : e))
  }, [])

  const onTitleChange = useCallback((e) => {
    setTitle(e.target.value)
    setError((prev) => (prev ? '' : prev))
  }, [])

  const onCoverChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    coverFileRef.current = file
    setCoverPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setCoverUrl('')
    e.target.value = ''
  }, [])

  const onCoverAltChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    coverAltFileRef.current = file
    setCoverAltPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setCoverAltUrl('')
    e.target.value = ''
  }, [])

  // Drop the cover entirely: clear any pending upload, the preview, and the
  // stored URL so submit persists a null cover.
  const removeCover = useCallback(() => {
    coverFileRef.current = null
    if (coverInputRef.current) coverInputRef.current.value = ''
    setCoverPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return ''
    })
    setCoverUrl('')
    setCoverComparison((prev) => ({
      pairs: (prev.pairs ?? []).map((pair) => ({
        beforeId: pair.beforeId === COVER_COMPARISON_ID ? null : pair.beforeId,
        afterId: pair.afterId === COVER_COMPARISON_ID ? null : pair.afterId,
        splitPercent: pair.splitPercent,
      })),
    }))
  }, [])

  const removeCoverAlt = useCallback(() => {
    coverAltFileRef.current = null
    if (coverAltInputRef.current) coverAltInputRef.current.value = ''
    setCoverAltPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return ''
    })
    setCoverAltUrl('')
    setCoverComparison((prev) => ({
      pairs: (prev.pairs ?? []).map((pair) => ({
        beforeId: pair.beforeId === COVER_COMPARISON_ID_2 ? null : pair.beforeId,
        afterId: pair.afterId === COVER_COMPARISON_ID_2 ? null : pair.afterId,
        splitPercent: pair.splitPercent,
      })),
    }))
  }, [])

  const submit = useCallback(
    async (status) => {
      const plain = contentHtml.replace(/<[^>]*>/g, '').trim()
      if (!title.trim()) {
        setError(t('editor.needTitle'))
        return
      }
      if (!plain) {
        setError(t('editor.needContent'))
        return
      }
      setError('')
      setBusy(status === 'published' ? (mode === 'edit' ? 'update' : 'publish') : 'draft')
      try {
        await onSubmit({
          form: {
            title,
            subtitle,
            author: author.trim(),
            date,
            time,
            contentHtml,
            contentJson,
            sources,
            coverComparison,
            coverImageUrl: coverUrl || null,
            coverInfo: coverInfo || null,
            coverImageAltUrl: coverAltUrl || null,
            language: initial?.language || 'vi',
            category,
          },
          items,
          coverFile: coverFileRef.current,
          coverAltFile: coverAltFileRef.current,
          status,
        })
      } catch (err) {
        setError(err.message || t('editor.uploadError'))
        setBusy(null)
      }
    },
    [title, subtitle, author, date, time, category, contentHtml, contentJson, sources, coverComparison, items, coverUrl, coverAltUrl, coverInfo, onSubmit, mode, t, initial?.language],
  )

  // The currently logged-in account (the editor), shown in the top bar.
  const loginName = profile?.display_name || profile?.full_name || '—'

  return (
    <div className="article-form">
      <div className="article-form__bar icue-container">
        <div className="article-form__author">
          <Link to="/profile" className="article-form__avatar-link" title={t('profile.avatar')}>
            <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="" className="article-form__avatar" />
          </Link>
          <div>
            <span className="article-form__author-label">{t('editor.loggedInAs')}</span>
            <span className="article-form__author-name">{loginName}</span>
          </div>
        </div>

        <div className="article-form__actions">
          <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={goBack}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => submit('draft')}>
            {busy === 'draft' ? <span className="spin" style={{ borderColor: '#ccc', borderTopColor: '#111' }} /> : t('editor.saveDraft')}
          </button>
          <button className="btn btn-accent btn-sm" disabled={!!busy} onClick={() => submit('published')}>
            {busy === 'publish' || busy === 'update' ? (
              <><span className="spin" style={{ borderColor: 'rgba(255,255,255,.35)', borderTopColor: '#fff' }} />{t('editor.publishing')}</>
            ) : mode === 'edit' ? t('editor.update') : t('editor.publish')}
          </button>
        </div>
      </div>

      <div className="article-form__layout icue-container">
        <EditorOutlineRail
          items={outlineItems}
          activeId={activeSection}
          onNavigate={handleOutlineNavigate}
        />

      <div className="article-form__canvas" lang={initial?.language || 'vi'}>
        {error && <p className="article-form__error">{error}</p>}

        <EditorSection
          id="edit-meta"
          open={metaOpen}
          onOpenChange={setMetaOpen}
          label={t('editor.sectionMeta')}
          summary={[t(`categories.${category}`), date, time, author].filter(Boolean).join(' · ')}
        >
        <div className="article-form__meta">
          <label className="field article-form__meta-field article-form__meta-field--category">
            <span>{t('editor.category')}</span>
            <select className="input input--category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_SLUGS.map((slug) => (
                <option key={slug} value={slug}>{t(`categories.${slug}`)}</option>
              ))}
            </select>
          </label>
          <div className="field article-form__meta-field">
            <span>{t('editor.date')}</span>
            <DatePickerField value={date} onChange={setDate} />
          </div>
          <div className="field article-form__meta-field">
            <span>{t('editor.time')}</span>
            <TimePickerField value={time} onChange={setTime} />
          </div>
          <label className="field article-form__meta-field article-form__meta-field--author">
            <span>{t('editor.author')}</span>
            <input
              className="input"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t('editor.authorPlaceholder')}
              maxLength={120}
            />
          </label>
        </div>
        </EditorSection>

        <EditorSection
          id="edit-cover"
          open={coverOpen}
          onOpenChange={setCoverOpen}
          label={t('editor.sectionCovers')}
          summary={
            coverPreview || coverAltPreview ? (
              <>
                {coverPreview && (
                  <img src={coverPreview} alt="" className="editor-section__summary-swatch" />
                )}
                {coverAltPreview && (
                  <img src={coverAltPreview} alt="" className="editor-section__summary-swatch" />
                )}
              </>
            ) : t('editor.sectionCoversEmpty')
          }
        >
        <div className="article-form__cover-block">
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={onCoverChange}
          />
          <input
            ref={coverAltInputRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={onCoverAltChange}
          />
          <div className="article-form__covers">
            <div className="article-form__cover-slot">
              <p className="article-form__cover-label">{t('editor.coverImagePrimary')}</p>
              {coverPreview ? (
                <div className="article-form__cover-filled">
                  <img src={coverPreview} alt="" className="article-form__cover-img" />
                  <div className="article-form__cover-tools">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={pickCover}>
                      {t('editor.changeCover')}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={removeCover}>
                      {t('editor.removeCover')}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="article-form__cover" onClick={pickCover}>
                  <span className="article-form__cover-empty">＋ {t('editor.coverImage')}</span>
                </button>
              )}
            </div>

            <div className="article-form__cover-slot">
              <p className="article-form__cover-label">{t('editor.coverImageSecondary')}</p>
              {coverAltPreview ? (
                <div className="article-form__cover-filled">
                  <img src={coverAltPreview} alt="" className="article-form__cover-img" />
                  <div className="article-form__cover-tools">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={pickCoverAlt}>
                      {t('editor.changeCover')}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={removeCoverAlt}>
                      {t('editor.removeCover')}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="article-form__cover" onClick={pickCoverAlt}>
                  <span className="article-form__cover-empty">＋ {t('editor.coverImageAlt')}</span>
                </button>
              )}
            </div>
          </div>

          <label className="field article-form__cover-info">
            <span>{t('editor.coverInfo')}</span>
            <input
              className="input"
              type="text"
              value={coverInfo}
              maxLength={240}
              placeholder={t('editor.coverInfoPlaceholder')}
              onChange={(e) => setCoverInfo(e.target.value)}
            />
          </label>

          <CoverComparisonEditor
            coverUrl={coverPreview}
            coverAltUrl={coverAltPreview}
            images={galleryImages}
            comparison={coverComparison}
            onComparisonChange={setCoverComparison}
            onRemoveImage={removeMediaItem}
          />
          {thumbnailComparison && (
            <div className="article-form__thumb-preview">
              <p className="article-form__thumb-preview-label">{t('editor.thumbnailPreview')}</p>
              <div className="article-form__thumb-preview-frame">
                <ArticleThumbnail comparison={thumbnailComparison} />
              </div>
            </div>
          )}
        </div>
        </EditorSection>

        <div id="edit-title">
          <input
            className="article-form__title"
            placeholder={t('editor.titlePlaceholder')}
            value={title}
            onChange={onTitleChange}
            maxLength={160}
          />
          <input
            className="article-form__subtitle"
            placeholder={t('editor.subtitlePlaceholder')}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={220}
          />
        </div>

        <div id="edit-body">
          <ErrorBoundary>
            <RichTextEditor value={contentHtml} onChange={onEditorChange} placeholder={t('editor.storyPlaceholder')} />
          </ErrorBoundary>
        </div>

        <div id="edit-sources">
          <ArticleSourcesEditor sources={sources} onChange={setSources} />
        </div>

        <div id="edit-media">
          <MediaUploader items={items} onChange={setItems} />
        </div>

        {/* Translations render inside the canvas (not on the Edit page) so the
            rail can treat them as one more flowing section. */}
        {mode === 'edit' && initial?.id && (
          <div id="edit-translations">
            <ArticleTranslationsEditor
              articleId={initial.id}
              sourceLanguage={initial.language}
              sourceSample={buildArticleTranslateSample(initial)}
              coverInfo={initial.cover_info || ''}
              media={initial.media}
            />
          </div>
        )}
      </div>
      </div>

      {mode === 'edit' && initial?.id && (
        <>
          <button
            type="button"
            className="captions-pill"
            onClick={() => setCaptionsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={captionsOpen}
          >
            <MessageSquare size={16} strokeWidth={2} aria-hidden />
            <span>{t('captionsDrawer.title')}</span>
            <span className="captions-pill__count">{captionedMedia.length}</span>
          </button>

          <CaptionsDrawer
            open={captionsOpen}
            onClose={() => setCaptionsOpen(false)}
            articleId={initial?.id}
            media={captionedMedia}
            sourceLanguage={initial?.language}
            sourceSample={buildArticleTranslateSample(initial)}
          />
        </>
      )}
    </div>
  )
}
