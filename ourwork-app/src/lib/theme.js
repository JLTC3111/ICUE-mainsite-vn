export const THEME_STORAGE_KEY = 'icue-ourwork-theme'
export const THEME_DARK = 'dark'
export const THEME_LIGHT = 'light'

/**
 * Must stay in sync with the pre-paint script in index.html — that script sets
 * the first frame, this module owns every frame after it.
 */
export function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === THEME_LIGHT || stored === THEME_DARK) return stored
  } catch {
    /* private mode / blocked storage */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return THEME_LIGHT
  }
  return THEME_DARK
}

export function writeStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}

export function syncDocumentTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === THEME_LIGHT ? '#f6f7f8' : '#0b0d10')
}
