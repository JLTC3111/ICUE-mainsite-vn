import { memo, useCallback, useId, useMemo, useState } from 'react'
import { Image as ImageIcon, Play, Upload, Video, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MEDIA_LIMITS } from '../lib/supabase'
import { findEditorComparisonPair } from '../lib/mediaComparison'
import ArticleImageComparison from './ArticleImageComparison'
import './MediaUploader.css'

let tmpId = 0
const nextTmpId = () => `tmp_${Date.now()}_${tmpId++}`

const kindOf = (file) => {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

function pruneComparison(comparison, itemId) {
  if (!comparison) return comparison
  return {
    beforeId: comparison.beforeId === itemId ? null : comparison.beforeId,
    afterId: comparison.afterId === itemId ? null : comparison.afterId,
  }
}

// A media item: { id, kind, url, storagePath?, file?, isNew }
function MediaUploader({
  items,
  onChange,
  comparison = { beforeId: null, afterId: null },
  onComparisonChange,
}) {
  const { t } = useTranslation()
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState('')

  const images = items.filter((m) => m.kind === 'image')
  const videos = items.filter((m) => m.kind === 'video')
  const imagesLeft = MEDIA_LIMITS.images - images.length
  const videosLeft = MEDIA_LIMITS.videos - videos.length

  const comparisonPair = useMemo(
    () => findEditorComparisonPair(images, comparison),
    [images, comparison],
  )

  const setComparisonRole = useCallback(
    (itemId, role) => {
      if (!onComparisonChange) return
      const next = { beforeId: comparison.beforeId, afterId: comparison.afterId }
      if (role === 'before') {
        next.beforeId = itemId
        if (next.afterId === itemId) next.afterId = null
      } else if (role === 'after') {
        next.afterId = itemId
        if (next.beforeId === itemId) next.beforeId = null
      } else if (role === 'clear-before') {
        if (next.beforeId === itemId) next.beforeId = null
      } else if (role === 'clear-after') {
        if (next.afterId === itemId) next.afterId = null
      }
      onComparisonChange(next)
    },
    [comparison, onComparisonChange],
  )

  const clearComparison = useCallback(() => {
    onComparisonChange?.({ beforeId: null, afterId: null })
  }, [onComparisonChange])

  const addFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || [])
      if (!files.length) return
      let imgLeft = imagesLeft
      let vidLeft = videosLeft
      let skipped = 0
      const next = []
      for (const file of files) {
        const kind = kindOf(file)
        if (kind === 'image' && imgLeft > 0) {
          next.push({ id: nextTmpId(), kind, url: URL.createObjectURL(file), file, isNew: true })
          imgLeft -= 1
        } else if (kind === 'video' && vidLeft > 0) {
          next.push({ id: nextTmpId(), kind, url: URL.createObjectURL(file), file, isNew: true })
          vidLeft -= 1
        } else {
          skipped += 1
        }
      }
      if (next.length) onChange([...items, ...next])
      setNotice(skipped ? t('editor.skipped', { count: skipped }) : '')
    },
    [items, onChange, imagesLeft, videosLeft, t],
  )

  const remove = useCallback(
    (id) => {
      const target = items.find((m) => m.id === id)
      if (target?.isNew && target.url?.startsWith('blob:')) URL.revokeObjectURL(target.url)
      onChange(items.filter((m) => m.id !== id))
      onComparisonChange?.(pruneComparison(comparison, id))
      setNotice('')
    },
    [items, onChange, comparison, onComparisonChange],
  )

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragging(false)
      addFiles(e.dataTransfer?.files)
    },
    [addFiles],
  )

  const full = imagesLeft <= 0 && videosLeft <= 0
  const hasComparison = Boolean(comparisonPair)
  const canCompare = images.length >= 2 && onComparisonChange

  return (
    <div className="media-uploader">
      <div className="media-uploader__head">
        <h3>{t('editor.media')}</h3>
        <div className="media-uploader__counts">
          <span className={`media-chip ${imagesLeft <= 0 ? 'is-full' : ''}`}>
            <ImageIcon size={14} strokeWidth={2} aria-hidden />
            {images.length}/{MEDIA_LIMITS.images}
          </span>
          <span className={`media-chip ${videosLeft <= 0 ? 'is-full' : ''}`}>
            <Video size={14} strokeWidth={2} aria-hidden />
            {videos.length}/{MEDIA_LIMITS.videos}
          </span>
        </div>
      </div>

      <label
        htmlFor={inputId}
        className={`media-dropzone ${dragging ? 'is-dragging' : ''} ${full ? 'is-full' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!full) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="media-dropzone__icon" aria-hidden>
          <Upload size={22} strokeWidth={2} />
        </span>
        <span className="media-dropzone__title">
          {full ? t('editor.mediaFull') : t('editor.dropHint')}
        </span>
        <span className="media-dropzone__sub">{t('editor.mediaLimits')}</span>
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept="image/*,video/*"
          multiple
          disabled={full}
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
        />
      </label>

      {notice && <p className="media-uploader__notice">{notice}</p>}

      {items.length > 0 && (
        <ul className="media-strip">
          {items.map((m) => (
            <li key={m.id} className="media-thumb">
              {m.kind === 'image' ? (
                <img src={m.url} alt="" loading="lazy" decoding="async" />
              ) : (
                <>
                  <video src={m.url} muted playsInline preload="metadata" />
                  <span className="media-thumb__play" aria-hidden>
                    <Play size={18} strokeWidth={2} fill="currentColor" />
                  </span>
                </>
              )}

              <button
                type="button"
                className="media-thumb__remove"
                onClick={() => remove(m.id)}
                aria-label={t('common.delete')}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {onComparisonChange && (
        <section className="media-comparison-editor" aria-labelledby="media-comparison-heading">
          <div className="media-comparison-editor__intro">
            <div>
              <h4 id="media-comparison-heading" className="media-comparison-editor__title">
                {t('editor.comparisonTitle')}
              </h4>
              <p className="media-comparison-editor__hint">{t('editor.comparisonHint')}</p>
            </div>
            {hasComparison && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearComparison}>
                {t('editor.comparisonClear')}
              </button>
            )}
          </div>

          {!canCompare ? (
            <p className="media-comparison-editor__empty">{t('editor.comparisonNeedTwo')}</p>
          ) : (
            <>
              <ul className="media-comparison-editor__grid">
                {images.map((img, index) => {
                  const isBefore = comparison.beforeId === img.id
                  const isAfter = comparison.afterId === img.id
                  return (
                    <li
                      key={img.id}
                      className={`media-comparison-editor__card${isBefore || isAfter ? ' is-selected' : ''}`}
                    >
                      <img src={img.url} alt="" loading="lazy" decoding="async" />
                      <span className="media-comparison-editor__index">{index + 1}</span>
                      {(isBefore || isAfter) && (
                        <span className={`media-comparison-editor__badge${isBefore ? ' is-before' : ' is-after'}`}>
                          {isBefore ? t('editor.comparisonBefore') : t('editor.comparisonAfter')}
                        </span>
                      )}
                      <div className="media-comparison-editor__actions">
                        <button
                          type="button"
                          className={`media-comparison-editor__pick${isBefore ? ' is-active' : ''}`}
                          onClick={() => setComparisonRole(
                            img.id,
                            isBefore ? 'clear-before' : 'before',
                          )}
                        >
                          {t('editor.comparisonBefore')}
                        </button>
                        <button
                          type="button"
                          className={`media-comparison-editor__pick${isAfter ? ' is-active' : ''}`}
                          onClick={() => setComparisonRole(
                            img.id,
                            isAfter ? 'clear-after' : 'after',
                          )}
                        >
                          {t('editor.comparisonAfter')}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>

              {hasComparison && (
                <div className="media-comparison-editor__preview">
                  <p className="media-comparison-editor__preview-label">{t('editor.comparisonPreview')}</p>
                  <ArticleImageComparison
                    before={comparisonPair.before}
                    after={comparisonPair.after}
                  />
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}

export default memo(MediaUploader)
