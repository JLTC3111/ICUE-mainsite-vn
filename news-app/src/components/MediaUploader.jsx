import { memo, useCallback, useId, useState } from 'react'
import { Play, Upload, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MEDIA_LIMITS } from '../lib/supabase'
import { NEWSROOM_COMPACT_QUERY } from '../lib/newsroom'
import useMediaQuery from '../hooks/useMediaQuery'
import { ImageMediaIcon, VideoMediaIcon } from './MediaUploadIcons'
import './MediaUploader.css'

let tmpId = 0
const nextTmpId = () => `tmp_${Date.now()}_${tmpId++}`

const kindOf = (file) => {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

// A media item: { id, kind, url, storagePath?, file?, isNew }
function MediaUploader({ items, onChange }) {
  const { t } = useTranslation()
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState(null)
  const isCompact = useMediaQuery(NEWSROOM_COMPACT_QUERY)

  const images = items.filter((m) => m.kind === 'image')
  const videos = items.filter((m) => m.kind === 'video')
  const imagesLeft = MEDIA_LIMITS.images - images.length
  const videosLeft = MEDIA_LIMITS.videos - videos.length

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
      setNotice('')
    },
    [items, onChange],
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

  return (
    <div className="media-uploader">
      <div className="media-uploader__head">
        <h3>{t('editor.media')}</h3>
        <div className="media-uploader__counts">
          <span className={`media-chip ${imagesLeft <= 0 ? 'is-full' : ''}`}>
            <ImageMediaIcon size={16} className="media-chip__icon" />
            {images.length}/{MEDIA_LIMITS.images}
          </span>
          <span className={`media-chip ${videosLeft <= 0 ? 'is-full' : ''}`}>
            <VideoMediaIcon size={16} className="media-chip__icon" />
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
                <button
                  type="button"
                  className="media-thumb__preview-trigger"
                  onClick={() => setPreview({ url: m.url, alt: m.file?.name || '', info: m.info || '' })}
                  aria-label={t('editor.previewImage')}
                >
                  <img src={m.url} alt="" loading="lazy" decoding="async" />
                </button>
              ) : (
                <>
                  {m.poster_url ? (
                    <img src={m.poster_url} alt="" loading="lazy" decoding="async" />
                  ) : isCompact ? (
                    <span className="media-thumb__video-fallback" aria-hidden>
                      <VideoMediaIcon size={30} />
                    </span>
                  ) : (
                    <video src={m.url} muted playsInline preload="metadata" />
                  )}
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
              <input
                className="media-thumb__info"
                type="text"
                value={m.info || ''}
                maxLength={240}
                placeholder={t('editor.mediaInfoPlaceholder')}
                aria-label={t('editor.mediaInfo')}
                onChange={(event) => onChange(items.map((item) => (
                  item.id === m.id ? { ...item, info: event.target.value } : item
                )))}
              />
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div className="media-preview" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <div className="media-preview__panel" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="media-preview__close" onClick={() => setPreview(null)} aria-label={t('common.close')}>
              <X size={20} strokeWidth={2} aria-hidden />
            </button>
            <img src={preview.url} alt={preview.alt} className="media-preview__image" />
            {preview.info && <p className="media-preview__info">{preview.info}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(MediaUploader)
