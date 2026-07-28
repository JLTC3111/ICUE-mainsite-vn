import { useTranslation } from 'react-i18next'
import { MessageSquare } from 'lucide-react'
import './EditorOutlineRail.css'

/**
 * "On this page" navigation for the edit canvas.
 *
 * It drives the existing UI rather than replacing it — three behaviours:
 *   - `expands`: the target is a collapsible section, so open it first (a scroll
 *     to a collapsed one-line row would land on nothing useful), then scroll.
 *   - default: a normal flowing block — just scroll.
 *   - `drawer`: captions live in the floating drawer, not in the flow, so this
 *     opens it and deliberately does NOT scroll.
 */
export default function EditorOutlineRail({ items, activeId, onNavigate }) {
  const { t } = useTranslation()

  return (
    <nav className="editor-rail" aria-label={t('editor.outlineHeading')}>
      <div className="editor-rail__inner">
        <p className="editor-rail__title">{t('editor.outlineHeading')}</p>
        <ul className="editor-rail__list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`editor-rail__item${activeId === item.id ? ' is-active' : ''}${item.kind === 'drawer' ? ' is-drawer' : ''}`}
                onClick={() => onNavigate(item)}
                aria-current={activeId === item.id ? 'true' : undefined}
              >
                {item.kind === 'drawer' && (
                  <MessageSquare size={13} strokeWidth={2} aria-hidden />
                )}
                <span className="editor-rail__label">{item.label}</span>
                {typeof item.count === 'number' && (
                  <span className="editor-rail__count">{item.count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
