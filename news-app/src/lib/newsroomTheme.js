export const NEWSROOM_THEME_STORAGE_KEY = 'icue-newsroom-theme'

export const NEWSROOM_THEME_DARK = 'dark'
export const NEWSROOM_THEME_LIGHT = 'light'

export function readNewsroomTheme() {
  try {
    const stored = localStorage.getItem(NEWSROOM_THEME_STORAGE_KEY)
    if (stored === NEWSROOM_THEME_LIGHT || stored === NEWSROOM_THEME_DARK) {
      return stored
    }
  } catch {
    /* private mode / blocked storage */
  }
  return NEWSROOM_THEME_DARK
}

export function writeNewsroomTheme(theme) {
  try {
    localStorage.setItem(NEWSROOM_THEME_STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}
