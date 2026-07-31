import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'

const LANG_LABELS = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l.label]))

/**
 * Inline hand-authoring of one comment's translation for the active UI locale.
 * Shown only to the article's author and to admins; the matching RLS policy on
 * comment_translations enforces the same rule server-side.
 *
 * `suggestion` is the on-device machine translation when one is on screen — it
 * prefills the box so an editor can accept or correct it rather than retype,
 * but it is only ever stored once a human presses Save.
 */
export default function CommentTranslationEditor({
  locale,
  initialValue = '',
  suggestion = '',
  onSave,
  onDelete,
  onClose,
}) {
  const { t } = useTranslation()
  // Prefilled once on mount: the editor is mounted fresh each time it opens, and
  // a machine translation landing mid-edit must not overwrite what is typed.
  const [value, setValue] = useState(initialValue || suggestion || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(async (action) => {
    setBusy(true)
    setError('')
    try {
      await action()
      onClose?.()
    } catch {
      setError(t('engagement.error'))
    } finally {
      setBusy(false)
    }
  }, [onClose, t])

  const trimmed = value.trim()
  const langLabel = LANG_LABELS[locale] || locale

  return (
    <div className="comments__editor">
      <label className="comments__editor-label" htmlFor={`ct-${locale}`}>
        {t('engagement.translationFor', { lang: langLabel })}
      </label>
      <textarea
        id={`ct-${locale}`}
        className="textarea comments__editor-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={t('engagement.translationPlaceholder')}
      />
      {error && <p className="comments__error">{error}</p>}
      <div className="comments__editor-actions">
        {initialValue && (
          <button
            type="button"
            className="btn btn-sm comments__editor-remove"
            disabled={busy}
            onClick={() => run(() => onDelete())}
          >
            {t('common.delete')}
          </button>
        )}
        <button type="button" className="btn btn-sm" disabled={busy} onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="btn btn-accent btn-sm"
          disabled={busy || !trimmed}
          onClick={() => run(() => onSave(trimmed))}
        >
          {t('engagement.saveTranslation')}
        </button>
      </div>
    </div>
  )
}
