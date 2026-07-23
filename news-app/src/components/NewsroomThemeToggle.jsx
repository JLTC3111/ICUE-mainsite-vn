import { useTranslation } from 'react-i18next'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'
import {
  NEWSROOM_THEME_DARK,
  NEWSROOM_THEME_LIGHT,
} from '../lib/newsroomTheme'
import AnimatedThemeToggler from './magicui/AnimatedThemeToggler'
import './NewsroomThemeToggle.css'

export default function NewsroomThemeToggle({ className = '', showCompactLabel = false }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useNewsroomTheme()
  const isDark = theme === NEWSROOM_THEME_DARK

  const handleThemeChange = (next) => {
    setTheme(next === 'dark' ? NEWSROOM_THEME_DARK : NEWSROOM_THEME_LIGHT)
  }

  return (
    <AnimatedThemeToggler
      className={`newsroom-theme-toggle${
        showCompactLabel ? ' newsroom-theme-toggle--compact-label' : ''
      }${className ? ` ${className}` : ''}`}
      theme={isDark ? 'dark' : 'light'}
      onThemeChange={handleThemeChange}
      variant="square"
      label={showCompactLabel ? (isDark ? t('theme.light') : t('theme.dark')) : undefined}
      duration={400}
      aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
    />
  )
}
