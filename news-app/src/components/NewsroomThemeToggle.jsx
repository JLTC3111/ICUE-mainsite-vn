import { useTranslation } from 'react-i18next'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'
import { NEWSROOM_THEME_DARK } from '../lib/newsroomTheme'
import './NewsroomThemeToggle.css'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 14.5A8.38 8.38 0 0 1 12.5 22 8.5 8.5 0 0 1 11 3.06 8.38 8.38 0 0 0 21 14.5Z"
      />
    </svg>
  )
}

export default function NewsroomThemeToggle({ className = '' }) {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useNewsroomTheme()
  const isDark = theme === NEWSROOM_THEME_DARK

  return (
    <button
      type="button"
      className={`newsroom-theme-toggle${className ? ` ${className}` : ''}`}
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
    >
      <span className="newsroom-theme-toggle__icon">
        {isDark ? <SunIcon /> : <MoonIcon />}
      </span>
      <span className="newsroom-theme-toggle__label">
        {isDark ? t('theme.light') : t('theme.dark')}
      </span>
    </button>
  )
}
