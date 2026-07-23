import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import {
  createEmptySource,
  isValidSourceUrl,
  MAX_ARTICLE_SOURCES,
  normalizeSourcesForEditor,
} from '../lib/articleSources'
import DatePickerField from './DatePickerField'
import './ArticleSourcesEditor.css'

export default function ArticleSourcesEditor({ sources, onChange }) {
  const { t } = useTranslation()
  const rows = useMemo(() => normalizeSourcesForEditor(sources), [sources])
  const [fieldErrors, setFieldErrors] = useState({})

  const updateRow = useCallback(
    (id, patch) => {
      onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    },
    [onChange, rows],
  )

  const removeRow = useCallback(
    (id) => {
      onChange(rows.filter((row) => row.id !== id))
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    },
    [onChange, rows],
  )

  const addRow = useCallback(() => {
    if (rows.length >= MAX_ARTICLE_SOURCES) return
    onChange([...rows, createEmptySource()])
  }, [onChange, rows])

  const validateUrl = useCallback(
    (id, value) => {
      const url = String(value ?? '').trim()
      if (!url) {
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        return
      }
      if (!isValidSourceUrl(url)) {
        setFieldErrors((prev) => ({ ...prev, [id]: t('editor.sourceUrlInvalid') }))
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
    },
    [t],
  )

  return (
    <section className="article-sources-editor" aria-labelledby="article-sources-editor-heading">
      <div className="article-sources-editor__head">
        <h2 id="article-sources-editor-heading" className="article-sources-editor__title">
          {t('editor.sourcesTitle')}
        </h2>
        <p className="article-sources-editor__hint">{t('editor.sourcesOptional')}</p>
      </div>

      {rows.length > 0 && (
        <ul className="article-sources-editor__list">
          {rows.map((row, index) => (
            <li key={row.id} className="article-sources-editor__row">
              <div className="article-sources-editor__row-head">
                <span className="article-sources-editor__row-num">{index + 1}</span>
                <button
                  type="button"
                  className="article-sources-editor__remove btn btn-ghost btn-sm"
                  onClick={() => removeRow(row.id)}
                  aria-label={t('editor.removeSource')}
                >
                  <X size={16} strokeWidth={2} aria-hidden />
                  <span>{t('editor.removeSource')}</span>
                </button>
              </div>

              <div className="article-sources-editor__fields">
                <label className="field article-sources-editor__field">
                  <span>{t('editor.sourceLabel')}</span>
                  <input
                    className="input"
                    type="text"
                    value={row.label}
                    onChange={(e) => updateRow(row.id, { label: e.target.value })}
                    maxLength={240}
                  />
                </label>

                <label className="field article-sources-editor__field">
                  <span>{t('editor.sourceUrl')}</span>
                  <input
                    className={`input${fieldErrors[row.id] ? ' input--invalid' : ''}`}
                    type="url"
                    value={row.url}
                    onChange={(e) => updateRow(row.id, { url: e.target.value })}
                    onBlur={(e) => validateUrl(row.id, e.target.value)}
                    placeholder="https://"
                    maxLength={2048}
                  />
                  {fieldErrors[row.id] && (
                    <span className="article-sources-editor__error">{fieldErrors[row.id]}</span>
                  )}
                </label>

                <label className="field article-sources-editor__field">
                  <span>{t('editor.sourcePublisher')}</span>
                  <input
                    className="input"
                    type="text"
                    value={row.publisher || ''}
                    onChange={(e) => updateRow(row.id, { publisher: e.target.value })}
                    maxLength={120}
                  />
                </label>

                <div className="field article-sources-editor__field article-sources-editor__field--date">
                  <span>{t('editor.sourceAccessed')}</span>
                  <DatePickerField
                    value={row.accessed_at || ''}
                    onChange={(next) => updateRow(row.id, { accessed_at: next })}
                    allowClear
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="btn btn-ghost btn-sm article-sources-editor__add"
        onClick={addRow}
        disabled={rows.length >= MAX_ARTICLE_SOURCES}
      >
        + {t('editor.addSource')}
      </button>
    </section>
  )
}
