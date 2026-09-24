import { createContext, useContext } from 'react'

export const NewsroomThemeContext = createContext(null)

export function useNewsroomTheme() {
  const ctx = useContext(NewsroomThemeContext)
  if (!ctx) {
    throw new Error('useNewsroomTheme must be used within NewsroomThemeProvider')
  }
  return ctx
}
