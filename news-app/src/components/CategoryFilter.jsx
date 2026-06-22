import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_SLUGS } from '../lib/categories'
import './CategoryFilter.css'

// Desktop: BBC/NYT-style horizontal tabs. Mobile: compact native select (easier with 14+ topics).
const PRIMARY_SLUGS = [
  'economics', 'urban', 'technology', 'projects', 'social', 'health', 'sport',
]
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
    <nav className="section-nav" aria-label={t('categories.label')} ref={rootRef}>
      <div className="icue-container section-nav__inner">
        {/* Desktop / tablet */}
        <div className="section-nav__desktop">
          <div className="section-nav__scroll">
            <div className="section-nav__list" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={value === 'all'}
                className={`section-nav__item${value === 'all' ? ' is-active' : ''}`}
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
                  className={`section-nav__item${value === slug ? ' is-active' : ''}`}
                  onClick={() => pick(slug)}
                >
                  {t(`categories.${slug}`)}
                </button>
              ))}
              <div className="section-nav__more-wrap">
                <button
                  type="button"
                  className={`section-nav__item section-nav__more${overflowActive ? ' is-active' : ''}${menuOpen ? ' is-open' : ''}`}
                  aria-haspopup="listbox"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  {overflowActive ? t(`categories.${value}`) : t('categories.more')}
                  <span className="section-nav__chev" aria-hidden>▾</span>
                </button>
                {menuOpen && (
                  <ul className="section-nav__menu" role="listbox">
                    {OVERFLOW_SLUGS.map((slug) => (
                      <li key={slug}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={value === slug}
                          className={`section-nav__menu-item${value === slug ? ' is-active' : ''}`}
                          onClick={() => pick(slug)}
                        >
                          {t(`categories.${slug}`)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: single compact dropdown */}
        <label className="section-nav__mobile">
          <span className="visually-hidden">{t('categories.label')}</span>
          <select
            className="section-nav__select"
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
