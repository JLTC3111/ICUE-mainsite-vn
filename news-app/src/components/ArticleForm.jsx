import { useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_AVATAR } from '../lib/defaults'
import { CATEGORY_SLUGS, DEFAULT_CATEGORY } from '../lib/categories'
import RichTextEditor from './RichTextEditor'
import MediaUploader from './MediaUploader'
import ErrorBoundary from './ErrorBoundary'
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
  const [items, setItems] = useState(initial?.items || [])
  const [coverUrl, setCoverUrl] = useState(initial?.cover_image_url || '')
  const coverFileRef = useRef(null)
  const [coverPreview, setCoverPreview] = useState(initial?.cover_image_url || '')

  const [busy, setBusy] = useState(null) // 'draft' | 'publish' | 'update'
  const [error, setError] = useState('')

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
    if (!file) return
    coverFileRef.current = file
    setCoverPreview(URL.createObjectURL(file))
  }, [])

  // Drop the cover entirely: clear any pending upload, the preview, and the
  // stored URL so submit persists a null cover.
  const removeCover = useCallback(() => {
    coverFileRef.current = null
    setCoverPreview('')
    setCoverUrl('')
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
            coverImageUrl: coverUrl || null,
            language: i18n.resolvedLanguage || 'vi',
            category,
          },
          items,
          coverFile: coverFileRef.current,
          status,
        })
      } catch (err) {
        setError(err.message || t('editor.uploadError'))
        setBusy(null)
      }
    },
    [title, subtitle, author, date, time, category, contentHtml, contentJson, items, coverUrl, onSubmit, mode, t, i18n],
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

      <div className="article-form__canvas icue-container">
        {error && <p className="article-form__error">{error}</p>}

        <div className="article-form__meta">
          <label className="field article-form__meta-field article-form__meta-field--category">
            <span>{t('editor.category')}</span>
            <select className="input input--category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_SLUGS.map((slug) => (
                <option key={slug} value={slug}>{t(`categories.${slug}`)}</option>
              ))}
            </select>
          </label>
          <label className="field article-form__meta-field">
            <span>{t('editor.date')}</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field article-form__meta-field">
            <span>{t('editor.time')}</span>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
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

        <div className="article-form__cover-block">
          {coverPreview ? (
            <div className="article-form__cover-filled">
              <img src={coverPreview} alt="" className="article-form__cover-img" />
              <div className="article-form__cover-tools">
                <label className="btn btn-ghost btn-sm article-form__cover-change">
                  {t('editor.changeCover')}
                  <input type="file" accept="image/*" className="visually-hidden" onChange={onCoverChange} />
                </label>
                <button type="button" className="btn btn-danger btn-sm" onClick={removeCover}>
                  {t('editor.removeCover')}
                </button>
              </div>
            </div>
          ) : (
            <label className="article-form__cover">
              <span className="article-form__cover-empty">＋ {t('editor.coverImage')}</span>
              <input type="file" accept="image/*" className="visually-hidden" onChange={onCoverChange} />
            </label>
          )}
        </div>

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

        <ErrorBoundary>
          <RichTextEditor value={contentHtml} onChange={onEditorChange} placeholder={t('editor.storyPlaceholder')} />
        </ErrorBoundary>

        <MediaUploader items={items} onChange={setItems} />
      </div>
    </div>
  )
}
