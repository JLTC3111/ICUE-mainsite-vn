import { readIncomingTheme } from './incomingTheme.js'
// Retain the preference already used by About, Awards, and Past Projects.
// People, Our Work, and Newsroom keep their existing theme systems.
export const PAGE_THEME_STORAGE_KEY = 'aboutUs_theme'

export function readPageThemePreference() {
  const incoming = readIncomingTheme()
  try {
    const stored = localStorage.getItem(PAGE_THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : incoming
  } catch {
    return incoming
  }
}

export function systemPageTheme() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function pageThemeLabel(locale = 'vi') {
  const labels = {
    vi: 'Chuyển giao diện sáng/tối',
    en: 'Switch between light and dark',
    de: 'Zwischen Hell und Dunkel wechseln',
    fr: 'Passer du mode clair au mode sombre',
    ja: 'ライトモードとダークモードを切り替える',
    ko: '라이트 모드와 다크 모드 전환',
  }
  return labels[String(locale).split('-')[0]] || labels.vi
}
