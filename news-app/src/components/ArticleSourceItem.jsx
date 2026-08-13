import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, X } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import { DEFAULT_ARTICLE_SOURCE_LANGUAGE } from '../lib/articleSources'
import DatePickerField from './DatePickerField'

/**
 * One collapsible reference.
 *
 * Open/closed state is owned by the parent so that "Expand all / Collapse all"
 * can drive every item through exactly the same transition as a manual toggle,
 * and so state survives parent re-renders (it is keyed by the stable row id, not
 * by list position).
 *
 * The whole header is a <button>, not just the chevron — a large hit target is
 * easier to use on touch, and a real button gives keyboard focus, Enter/Space
 * activation, and correct screen-reader semantics for free.
 */
export default function ArticleSourceItem({
  row,
  index,
  expanded,
  onToggle,
  onRemove,
  onUpdate,
  error,
  onValidateUrl,
}) {
  const { t } = useTranslation()
  const panelId = useId()
  const headerId = useId()

  // Collapsed summary: enough to identify the reference without opening it.
  const summary = row.label?.trim()
    || row.url?.trim()
    || t('editor.sourceUntitled', { n: index + 1 })
  const meta = [row.publisher?.trim(), row.url?.trim()].filter(Boolean).join(' · ')

  return (
    <li className={`source-item${expanded ? ' is-expanded' : ''}`}>
      <div className="source-item__head">
        <button
          type="button"
          id={headerId}
          className="source-item__toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <ChevronRight
            size={16}
            strokeWidth={2.5}
            className="source-item__chevron"
            aria-hidden
          />
          <span className="source-item__num" aria-hidden>{index + 1}</span>
          <span className="source-item__summary">
            <span className="source-item__label">{summary}</span>
            {meta && !expanded && <span className="source-item__meta">{meta}</span>}
          </span>
        </button>

        <button
          type="button"
          className="source-item__remove btn btn-ghost btn-sm"
          onClick={onRemove}
          aria-label={`${t('editor.removeSource')}: ${summary}`}
        >
          <X size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {/*
        Kept mounted (not unmounted or `hidden`) so typed input survives a
        collapse and so the height transition has something to animate.
        `inert` takes collapsed fields out of the tab order and the
        accessibility tree without breaking that animation.
      */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className="source-item__panel"
        inert={!expanded}
      >
        <div className="source-item__fields">
          <label className="field source-item__field">
            <span>{t('editor.sourceLanguage')}</span>
            <select
              className="input"
              value={row.language || DEFAULT_ARTICLE_SOURCE_LANGUAGE}
              onChange={(e) => onUpdate({ language: e.target.value })}
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field source-item__field">
            <span>{t('editor.sourceLabel')}</span>
            <input
              className="input"
              type="text"
              value={row.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              maxLength={240}
            />
          </label>

          <label className="field source-item__field">
            <span>{t('editor.sourceUrl')}</span>
            <input
              className={`input${error ? ' input--invalid' : ''}`}
              type="url"
              value={row.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              onBlur={(e) => onValidateUrl(e.target.value)}
              placeholder="https://"
              maxLength={2048}
            />
            {error && <span className="source-item__error">{error}</span>}
          </label>

          <label className="field source-item__field">
            <span>{t('editor.sourcePublisher')}</span>
            <input
              className="input"
              type="text"
              value={row.publisher || ''}
              onChange={(e) => onUpdate({ publisher: e.target.value })}
              maxLength={120}
            />
          </label>

          <div className="field source-item__field source-item__field--date">
            <span>{t('editor.sourceAccessed')}</span>
            <DatePickerField
              value={row.accessed_at || ''}
              onChange={(next) => onUpdate({ accessed_at: next })}
              allowClear
            />
          </div>
        </div>
      </div>
    </li>
  )
}
