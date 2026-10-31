import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PAGE_THEME_STORAGE_KEY, readPageThemePreference, systemPageTheme } from './pageTheme.js'
import { rememberThemePreference } from './incomingTheme.js'
import './page-theme.css'

/** Only pages that call this hook opt into the shared palette and control. */
export default function usePageTheme(page, { enabled = true, theme: controlledTheme } = {}) {
  const controlled = controlledTheme === 'light' || controlledTheme === 'dark'
  const [preference, setThemeState] = useState(() => readPageThemePreference() || systemPageTheme())
  // Apps with an existing appearance switch can publish its resolved theme
  // without a second preference or control competing with that switch.
  const theme = controlled ? controlledTheme : preference
  const manual = useRef(readPageThemePreference() != null)

  const setTheme = useCallback(next => {
    const value = next === 'dark' ? 'dark' : 'light'
    manual.current = true
    setThemeState(value)
    rememberThemePreference(value)
  }, [])
  const setDark = useCallback(dark => setTheme(dark ? 'dark' : 'light'), [setTheme])

  useLayoutEffect(() => {
    if (!enabled || controlled) return
    const preference = readPageThemePreference()
    if (preference != null) {
      manual.current = true
      setThemeState(preference)
    } else if (!manual.current) {
      setThemeState(systemPageTheme())
    }
  }, [enabled, controlled])

  useLayoutEffect(() => {
    if (!enabled) return undefined
    const root = document.documentElement
    const previousTheme = root.getAttribute('data-icue-page-theme')
    const previousPage = root.getAttribute('data-icue-theme-page')
    const meta = document.querySelector('meta[name="theme-color"]')
    const previousColor = meta?.getAttribute('content')
    root.setAttribute('data-icue-page-theme', theme)
    root.setAttribute('data-icue-theme-page', page)
    meta?.setAttribute('content', theme === 'dark' ? '#0b0f14' : '#f5f5f5')

    return () => {
      if (root.getAttribute('data-icue-theme-page') !== page) return
      if (previousTheme == null) root.removeAttribute('data-icue-page-theme')
      else root.setAttribute('data-icue-page-theme', previousTheme)
      if (previousPage == null) root.removeAttribute('data-icue-theme-page')
      else root.setAttribute('data-icue-theme-page', previousPage)
      if (meta) {
        if (previousColor == null) meta.removeAttribute('content')
        else meta.setAttribute('content', previousColor)
      }
    }
  }, [enabled, page, theme])

  useEffect(() => {
    if (controlled) return undefined
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onSystemChange = event => {
      if (!manual.current) setThemeState(event.matches ? 'dark' : 'light')
    }
    const onStorage = event => {
      if (event.key !== PAGE_THEME_STORAGE_KEY && event.key != null) return
      const preference = readPageThemePreference()
      manual.current = preference != null
      setThemeState(preference || systemPageTheme())
    }
    media?.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorage)
    return () => {
      media?.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [controlled])

  return useMemo(() => ({ theme, isDark: theme === 'dark', setTheme, setDark }), [theme, setTheme, setDark])
}
