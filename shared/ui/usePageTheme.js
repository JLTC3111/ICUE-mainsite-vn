import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PAGE_THEME_STORAGE_KEY, readPageThemePreference, systemPageTheme } from './pageTheme.js'
import './page-theme.css'

/** Only pages that call this hook opt into the shared palette and control. */
export default function usePageTheme(page, { enabled = true } = {}) {
  const [theme, setThemeState] = useState(() => readPageThemePreference() || systemPageTheme())
  const manual = useRef(readPageThemePreference() != null)

  const setTheme = useCallback(next => {
    const value = next === 'dark' ? 'dark' : 'light'
    manual.current = true
    setThemeState(value)
    try { localStorage.setItem(PAGE_THEME_STORAGE_KEY, value) } catch { /* Switching still works. */ }
  }, [])
  const setDark = useCallback(dark => setTheme(dark ? 'dark' : 'light'), [setTheme])

  useLayoutEffect(() => {
    if (!enabled) return
    const preference = readPageThemePreference()
    if (preference != null) {
      manual.current = true
      setThemeState(preference)
    } else if (!manual.current) {
      setThemeState(systemPageTheme())
    }
  }, [enabled])

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
  }, [])

  return useMemo(() => ({ theme, isDark: theme === 'dark', setTheme, setDark }), [theme, setTheme, setDark])
}
