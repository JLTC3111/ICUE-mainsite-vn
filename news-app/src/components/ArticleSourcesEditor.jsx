import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createEmptySource,
  isValidSourceUrl,
  MAX_ARTICLE_SOURCES,
  normalizeSourcesForEditor,
} from '../lib/articleSources'
import ArticleSourceItem from './ArticleSourceItem'
import './ArticleSourcesEditor.css'

/** Long lists benefit from bulk controls; short ones just get clutter. */
const BULK_CONTROL_THRESHOLD = 3

export default function ArticleSourcesEditor({ sources, onChange }) {
  const { t } = useTranslation()
  const rows = useMemo(() => normalizeSourcesForEditor(sources), [sources])
  const [fieldErrors, setFieldErrors] = useState({})

  /**
   * Expanded ids, not booleans-by-index: the parent form re-renders on every
   * keystroke, and index-keyed state would jump to the wrong item as soon as a
   * reference is added or removed. Multiple items may be open at once — these
   * are reference entries an author cross-checks against each other, so forcing
   * a strict one-at-a-time accordion would fight the actual task.
   */
  const [expandedIds, setExpandedIds] = useState(() => new Set())

  // A newly added reference is empty, so it opens straight away — collapsed, it
  // would show nothing useful and require an extra click.
  const addRow = useCallback(() => {
    if (rows.length >= MAX_ARTICLE_SOURCES) return
    const next = createEmptySource()
    onChange([...rows, next])
    setExpandedIds((prev) => new Set(prev).add(next.id))
  }, [onChange, rows])

  const toggleRow = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    [onChange, rows],
  )

  const validateUrl = useCallback(
    (id, value) => {
      const url = String(value ?? '').trim()
      if (!url || isValidSourceUrl(url)) {
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        return
      }
      setFieldErrors((prev) => ({ ...prev, [id]: t('editor.sourceUrlInvalid') }))
    },
    [t],
  )

  const expandedCount = rows.filter((row) => expandedIds.has(row.id)).length
  // Label reflects what the click will DO. Past the halfway mark the useful
  // action is to collapse; otherwise it is to expand.
  const willExpandAll = expandedCount * 2 <= rows.length

  const toggleAll = useCallback(() => {
    setExpandedIds(willExpandAll ? new Set(rows.map((row) => row.id)) : new Set())
  }, [willExpandAll, rows])

  const showBulkControl = rows.length >= BULK_CONTROL_THRESHOLD

  return (
    <section className="article-sources-editor" aria-labelledby="article-sources-editor-heading">
      <div className="article-sources-editor__head">
        <div className="article-sources-editor__head-text">
          <h2 id="article-sources-editor-heading" className="article-sources-editor__title">
            {t('editor.sourcesTitle')}
            {rows.length > 0 && (
              <span className="article-sources-editor__count">{rows.length}</span>
            )}
          </h2>
          <p className="article-sources-editor__hint">{t('editor.sourcesOptional')}</p>
        </div>

        {showBulkControl && (
          <button
            type="button"
            className="article-sources-editor__bulk btn btn-ghost btn-sm"
            onClick={toggleAll}
            aria-label={willExpandAll
              ? t('editor.sourcesExpandAllAria')
              : t('editor.sourcesCollapseAllAria')}
          >
            {willExpandAll ? t('editor.sourcesExpandAll') : t('editor.sourcesCollapseAll')}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="article-sources-editor__empty">{t('editor.sourcesEmpty')}</p>
      ) : (
        <ul className="article-sources-editor__list">
          {rows.map((row, index) => (
            <ArticleSourceItem
              key={row.id}
              row={row}
              index={index}
              expanded={expandedIds.has(row.id)}
              onToggle={() => toggleRow(row.id)}
              onRemove={() => removeRow(row.id)}
              onUpdate={(patch) => updateRow(row.id, patch)}
              onValidateUrl={(value) => validateUrl(row.id, value)}
              error={fieldErrors[row.id]}
            />
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
