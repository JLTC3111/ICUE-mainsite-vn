import { memo, useCallback, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { MEDIA_LIMITS } from '../lib/supabase'
import './MediaUploader.css'

let tmpId = 0
const nextTmpId = () => `tmp_${Date.now()}_${tmpId++}`

// A media item: { id, kind, url, storagePath?, file?, isNew }
function MediaUploader({ items, onChange }) {
  const { t } = useTranslation()
  const imgInputId = useId()
  const vidInputId = useId()

  const images = items.filter((m) => m.kind === 'image')
  const videos = items.filter((m) => m.kind === 'video')
  const imagesLeft = MEDIA_LIMITS.images - images.length
  const videosLeft = MEDIA_LIMITS.videos - videos.length

  const addFiles = useCallback(
    (fileList, kind) => {
      const files = Array.from(fileList || [])
      if (!files.length) return
      const cap = kind === 'image' ? imagesLeft : videosLeft
      const next = files.slice(0, cap).map((file) => ({
        id: nextTmpId(),
        kind,
        url: URL.createObjectURL(file),
        file,
        isNew: true,
      }))
      onChange([...items, ...next])
    },
    [items, onChange, imagesLeft, videosLeft],
  )

  const remove = useCallback(
    (id) => {
      const target = items.find((m) => m.id === id)
      if (target?.isNew && target.url?.startsWith('blob:')) URL.revokeObjectURL(target.url)
      onChange(items.filter((m) => m.id !== id))
    },
    [items, onChange],
  )

  return (
    <div className="media-uploader">
      <div className="media-uploader__head">
        <h3>{t('editor.media')}</h3>
      </div>

      <div className="media-uploader__actions">
        <label className={`btn btn-ghost btn-sm ${imagesLeft <= 0 ? 'is-disabled' : ''}`} htmlFor={imgInputId}>
          🖼 {t('editor.addImages')}
          <span className="media-uploader__count">{t('editor.imagesLeft', { count: imagesLeft })}</span>
        </label>
        <input
          id={imgInputId}
          className="visually-hidden"
          type="file"
          accept="image/*"
          multiple
          disabled={imagesLeft <= 0}
          onChange={(e) => { addFiles(e.target.files, 'image'); e.target.value = '' }}
        />

        <label className={`btn btn-ghost btn-sm ${videosLeft <= 0 ? 'is-disabled' : ''}`} htmlFor={vidInputId}>
          🎬 {t('editor.addVideos')}
          <span className="media-uploader__count">{t('editor.videosLeft', { count: videosLeft })}</span>
        </label>
        <input
          id={vidInputId}
          className="visually-hidden"
          type="file"
          accept="video/*"
          multiple
          disabled={videosLeft <= 0}
          onChange={(e) => { addFiles(e.target.files, 'video'); e.target.value = '' }}
        />
      </div>

      {items.length > 0 && (
        <ul className="media-uploader__grid">
          {items.map((m) => (
            <li key={m.id} className="media-uploader__tile">
              {m.kind === 'image' ? (
                <img src={m.url} alt="" loading="lazy" decoding="async" />
              ) : (
                <video src={m.url} muted playsInline preload="metadata" />
              )}
              <span className="media-uploader__kind">{m.kind === 'image' ? 'IMG' : 'VIDEO'}</span>
              <button type="button" className="media-uploader__remove" onClick={() => remove(m.id)} aria-label="Remove">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default memo(MediaUploader)
