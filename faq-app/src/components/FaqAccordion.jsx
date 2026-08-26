import { useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_ICONS } from '../data/categoryIcons'

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

export default function FaqAccordion({ categories }) {
  const { t } = useTranslation()
  const [openKey, setOpenKey] = useState(null)
  const id = useId()

  // Re-clicking the open card closes it, as the legacy accordion did
  // (src/script.js:3039-3042). Only one category is open at a time.
  const toggle = useCallback((key) => {
    setOpenKey((current) => (current === key ? null : key))
  }, [])

  const open = categories.find((category) => category.key === openKey) || null

  /*
   * The panel sits below the whole grid, not inside the clicked cell.
   *
   * Both of the obvious alternatives leave a hole. Putting it in the cell makes
   * the grid row as tall as the opened panel, so the other one or two cards in
   * that row get a column of empty space beside them. Putting it in the grid
   * spanning `1 / -1` — which is what the legacy page did — pushes every later
   * card down a row, and when the opened card is not the last in its row the
   * remaining columns of that row are left blank. One panel under the grid has
   * neither problem, and gives the answers the full width to wrap in.
   */
  return (
    <>
      <div className="fq-grid" role="list" aria-label={t('a11y.categoryList')}>
        {categories.map((category) => {
          const isOpen = category.key === openKey
          return (
            <div className="fq-grid__cell" role="listitem" key={category.key}>
              <button
                type="button"
                className={`fq-card${isOpen ? ' is-active' : ''}`}
                aria-expanded={isOpen}
                aria-controls={`${id}-panel`}
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
            </div>
          )
        })}
      </div>

      {open && (
        <div className="fq-panel" id={`${id}-panel`}>
          {/* Names the open category: with the panel below the grid rather than
              inside the card, the highlighted card alone is a thin cue. */}
          <h3 className="fq-panel__heading">{open.label}</h3>
          <div className="fq-panel__answers">
            {open.entries.map((entry) => (
              <Answer key={entry.q} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
