import { useCallback, useMemo, useState } from 'react'
import {
  NEWSROOM_THEME_DARK,
  NEWSROOM_THEME_LIGHT,
  readNewsroomTheme,
  writeNewsroomTheme,
} from '../lib/newsroomTheme'

import { NewsroomThemeContext } from './NewsroomThemeContext'

export function NewsroomThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readNewsroomTheme)

  const setTheme = useCallback((next) => {
    setThemeState(next)
    writeNewsroomTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === NEWSROOM_THEME_DARK ? NEWSROOM_THEME_LIGHT : NEWSROOM_THEME_DARK)
  }, [setTheme, theme])

  const isDark = theme === NEWSROOM_THEME_DARK

  const value = useMemo(
    () => ({ theme, isDark, setTheme, toggleTheme }),
    [isDark, setTheme, theme, toggleTheme],
  )

  return (
    <NewsroomThemeContext.Provider value={value}>
      {children}
    </NewsroomThemeContext.Provider>
  )
}
