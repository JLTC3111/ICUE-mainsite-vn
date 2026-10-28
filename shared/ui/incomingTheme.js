// Cross-origin links carry an explicit preference because localStorage is scoped
// to an origin. Seed the existing page stores before their initial React render.
const STORAGE_KEYS = ['icue_home_theme', 'aboutUs_theme', 'icue-newsroom-theme', 'icue-ourwork-theme']
let acceptedSearch
let runtimePreference = null
const valid = (value) => value === 'light' || value === 'dark'

function persist(value) {
  for (const key of STORAGE_KEYS) {
    try { localStorage.setItem(key, value) } catch { /* The runtime value still works. */ }
  }
}

export function readIncomingTheme() {
  if (typeof window === 'undefined') return null
  const search = window.location?.search || ''
  const value = new URLSearchParams(search).get('theme')
  if (valid(value) && acceptedSearch !== search) {
    acceptedSearch = search
    runtimePreference = value
    persist(value)
  }
  return runtimePreference
}

export function rememberThemePreference(value) {
  if (!valid(value) || typeof window === 'undefined') return
  runtimePreference = value
  persist(value)
  if (!window.location?.href) return
  const url = new URL(window.location.href)
  if (url.searchParams.has('theme')) {
    url.searchParams.set('theme', value)
    try {
      window.history.replaceState(window.history.state, '', url)
      acceptedSearch = url.search
    } catch { /* Keep the in-memory and stored choice if history is restricted. */ }
  }
}
