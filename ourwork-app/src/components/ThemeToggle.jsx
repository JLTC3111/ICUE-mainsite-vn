import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { THEME_DARK } from '../lib/theme'
import AnimatedThemeToggler from './magicui/AnimatedThemeToggler'

function ThemeToggle({ className = '' }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const isDark = theme === THEME_DARK

  return (
    <AnimatedThemeToggler
      className={className}
      theme={isDark ? 'dark' : 'light'}
      onThemeChange={setTheme}
      variant="circle"
      duration={400}
      aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
    />
  )
}

export default memo(ThemeToggle)
