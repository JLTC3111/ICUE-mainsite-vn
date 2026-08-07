import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react'
import {
  readStoredTheme,
  syncDocumentTheme,
  writeStoredTheme,
  THEME_DARK,
  THEME_LIGHT,
} from '../lib/theme'

const ThemeContext = createContext({ theme: THEME_DARK, setTheme: () => {}, toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)

  useLayoutEffect(() => {
    syncDocumentTheme(theme)
  }, [theme])

  const setTheme = useCallback((next) => {
    const value = next === THEME_LIGHT ? THEME_LIGHT : THEME_DARK
    writeStoredTheme(value)
    setThemeState(value)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK
      writeStoredTheme(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
