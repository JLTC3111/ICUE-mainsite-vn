import { memo, useCallback, useId, useState } from 'react'
import { Play, Upload, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MEDIA_LIMITS } from '../lib/supabase'
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
    </div>
  )
}

export default memo(MediaUploader)
