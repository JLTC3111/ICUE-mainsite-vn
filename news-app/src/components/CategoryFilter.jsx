import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_SLUGS, categoryColor } from '../lib/categories'
import './CategoryFilter.css'

// Compact category filter: quick chips for common topics + a "More" menu for the rest.
// On small screens it collapses to a single styled dropdown.
const PRIMARY_SLUGS = ['economics', 'urban', 'projects', 'social', 'health']
const OVERFLOW_SLUGS = CATEGORY_SLUGS.filter((s) => !PRIMARY_SLUGS.includes(s))

export default function CategoryFilter({ value, onChange }) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef(null)

  const overflowActive = OVERFLOW_SLUGS.includes(value)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const pick = (slug) => {
    onChange(slug)
    setMenuOpen(false)
  }

  return (
    <nav className="cat-filter" aria-label={t('categories.label')} ref={rootRef}>
      <div className="icue-container cat-filter__inner">
        {/* Desktop / tablet: All + primary chips + More menu */}
        <div className="cat-filter__chips" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={value === 'all'}
            className={`cat-filter__chip${value === 'all' ? ' is-active' : ''}`}
            onClick={() => pick('all')}
          >
            {t('categories.all')}
          </button>
          {PRIMARY_SLUGS.map((slug) => (
            <button
              key={slug}
              type="button"
              role="tab"
              aria-selected={value === slug}
              className={`cat-filter__chip${value === slug ? ' is-active' : ''}`}
              style={{ '--cat-color': categoryColor(slug) }}
              onClick={() => pick(slug)}
            >
              {t(`categories.${slug}`)}
            </button>
          ))}
          <div className="cat-filter__more-wrap">
            <button
              type="button"
              className={`cat-filter__chip cat-filter__more${overflowActive ? ' is-active' : ''}${menuOpen ? ' is-open' : ''}`}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {overflowActive ? t(`categories.${value}`) : t('categories.more')}
              <span className="cat-filter__chev" aria-hidden>▾</span>
            </button>
            {menuOpen && (
              <ul className="cat-filter__menu" role="listbox">
                {OVERFLOW_SLUGS.map((slug) => (
                  <li key={slug}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === slug}
                      className={`cat-filter__menu-item${value === slug ? ' is-active' : ''}`}
                      style={{ '--cat-color': categoryColor(slug) }}
                      onClick={() => pick(slug)}
                    >
                      <span className="cat-filter__dot" aria-hidden />
                      {t(`categories.${slug}`)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Mobile: compact dropdown */}
        <label className="cat-filter__select-wrap">
          <span className="visually-hidden">{t('categories.label')}</span>
          <select
            className="cat-filter__select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="all">{t('categories.all')}</option>
            {CATEGORY_SLUGS.map((slug) => (
              <option key={slug} value={slug}>{t(`categories.${slug}`)}</option>
            ))}
          </select>
        </label>
      </div>
    </nav>
  )
}
