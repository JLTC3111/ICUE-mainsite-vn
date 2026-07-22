export const NEWSROOM_THEME_STORAGE_KEY = 'icue-newsroom-theme'

export const NEWSROOM_THEME_DARK = 'dark'
export const NEWSROOM_THEME_LIGHT = 'light'

/** Public reader surfaces that follow the newsroom light/dark preference. */
export function isNewsroomReaderRoute(pathname = '') {
  return pathname === '/' || pathname.startsWith('/article/')
}

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
