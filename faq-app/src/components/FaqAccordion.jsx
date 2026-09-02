import { useCallback, useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_ICONS } from '../data/categoryIcons'

const MOBILE_LAYOUT_QUERY = '(max-width: 768px)'

/**
 * The two-level accordion: eight category cards, each opening onto its
 * questions, each question opening onto its answer.
 *
 * Ported from `window.initFrequentlyAskedQuestions` (src/script.js:2963-3170).
 * Two things the legacy version did are deliberately not carried over:
 *
 *  - It read an implicit global `event` inside `openCategory`
 *    (src/script.js:3011) to find the clicked card. That worked only because
 *    the markup used inline `onclick`; React passes the event properly.
 *  - It animated the panels with GSAP, which the page did not load itself —
 *    it came from home-app's bundle. A standalone app would have had to pull
 *    in the whole library for one height tween, so the open/close is CSS.
 */

function CategoryIcon({ category }) {
  const markup = CATEGORY_ICONS[category]
  if (!markup) return null
  return (
    <span
      className="fq-card__icon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}

function useMobileLayout() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MOBILE_LAYOUT_QUERY).matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const query = window.matchMedia(MOBILE_LAYOUT_QUERY)
    const update = (event) => setIsMobile(event.matches)
    setIsMobile(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isMobile
}

function Answer({ entry }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  const { t } = useTranslation()

  return (
    <div className="fq-answer">
      <button
        type="button"
        className={`fq-answer__question${expanded ? ' is-expanded' : ''}`}
        aria-expanded={expanded}
        aria-controls={`${id}-body`}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="fq-answer__label">{t('labels.question')}</span>
        {entry.q}
      </button>
      {expanded && (
        <div className="fq-answer__body" id={`${id}-body`}>
          <span className="fq-answer__label">{t('labels.answer')}</span>
          {entry.a}
        </div>
      )}
    </div>
  )
}

function CategoryPanel({ category, panelId, triggerId }) {
  return (
    <div
      className="fq-panel"
      id={panelId}
      role="region"
      aria-labelledby={triggerId}
    >
      <h3 className="fq-panel__heading">{category.label}</h3>
      <div className="fq-panel__answers">
        {category.entries.map((entry) => (
          <Answer key={entry.q} entry={entry} />
        ))}
      </div>
    </div>
  )
}

export default function FaqAccordion({ categories }) {
  const { t } = useTranslation()
  const [openKey, setOpenKey] = useState(null)
  const isMobile = useMobileLayout()
  const id = useId()

  // Re-clicking the open card closes it, as the legacy accordion did
  // (src/script.js:3039-3042). Only one category is open at a time.
  const toggle = useCallback((key) => {
    setOpenKey((current) => (current === key ? null : key))
  }, [])

  const open = categories.find((category) => category.key === openKey) || null

  // Desktop keeps one full-width panel below the category grid. On mobile the
  // grid is a single column, so the panel belongs directly after its active
  // card; rendering it there also keeps keyboard and screen-reader order in
  // step with the visual order.
  return (
    <>
      <div className="fq-grid" role="list" aria-label={t('a11y.categoryList')}>
        {categories.map((category) => {
          const isOpen = category.key === openKey
          const panelId = `${id}-${category.key}-panel`
          const triggerId = `${id}-${category.key}-trigger`
          return (
            <div className="fq-grid__cell" role="listitem" key={category.key}>
              <button
                id={triggerId}
                type="button"
                className={`fq-card${isOpen ? ' is-active' : ''}`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-label={t(isOpen ? 'a11y.closeCategory' : 'a11y.openCategory', {
                  label: category.label,
                })}
                onClick={() => toggle(category.key)}
              >
                <CategoryIcon category={category.key} />
                <span className="fq-card__title">
                  <h3>{category.label}</h3>
                </span>
                <span className="fq-card__arrow" aria-hidden="true">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.5"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                  </svg>
                </span>
              </button>
              {isMobile && isOpen && (
                <CategoryPanel
                  category={category}
                  panelId={panelId}
                  triggerId={triggerId}
                />
              )}
            </div>
          )
        })}
      </div>

      {!isMobile && open && (
        <CategoryPanel
          category={open}
          panelId={`${id}-${open.key}-panel`}
          triggerId={`${id}-${open.key}-trigger`}
        />
      )}
    </>
  )
}
