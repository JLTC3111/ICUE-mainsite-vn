import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AnimatedViewToggle from '../../../shared/ui/AnimatedViewToggle.jsx'
import { useHomeTheme } from '../hooks/useHomeTheme.js'
import './HomeThemeToggle.css'

const LABELS = {
  vi: ['Chuyển sang giao diện sáng', 'Chuyển sang giao diện tối'],
  en: ['Switch to light mode', 'Switch to dark mode'],
  de: ['Zum hellen Modus wechseln', 'Zum dunklen Modus wechseln'],
  fr: ['Passer au mode clair', 'Passer au mode sombre'],
  ja: ['ライトモードに切り替える', 'ダークモードに切り替える'],
  ko: ['라이트 모드로 전환', '다크 모드로 전환'],
}

export default function HomeThemeToggle() {
  const { i18n } = useTranslation()
  const [theme, setTheme] = useHomeTheme()
  const dark = theme === 'dark'
  const language = String(i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]
  const label = (LABELS[language] || LABELS.en)[dark ? 0 : 1]
  return (
    <AnimatedViewToggle
      className="home-theme-toggle"
      checked={dark}
      onCheckedChange={next => setTheme(next ? 'dark' : 'light')}
      ariaLabel={label}
      title={label}
      duration={450}
      viewTransitionName="icue-avt-home-theme-icon"
      onIcon={<Moon size={20} strokeWidth={1.75} aria-hidden="true" />}
      offIcon={<Sun size={20} strokeWidth={1.75} aria-hidden="true" />}
    />
  )
}
