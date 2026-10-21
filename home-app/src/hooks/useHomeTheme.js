import { useLayoutEffect, useSyncExternalStore } from 'react'

export const HOME_THEME_STORAGE_KEY = 'icue_home_theme'
const CHANGE_EVENT = 'icue:homeThemeChanged'
let runtimeTheme

export function readHomeTheme() {
  if (runtimeTheme !== undefined) return runtimeTheme
  try { return window.localStorage.getItem(HOME_THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light' }
  catch { return 'light' }
}

export function setHomeTheme(next) {
  const value = typeof next === 'function' ? next(readHomeTheme()) : next
  runtimeTheme = value === 'dark' ? 'dark' : 'light'
  try { window.localStorage.setItem(HOME_THEME_STORAGE_KEY, runtimeTheme) } catch { /* Keep the choice for this visit. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new window.Event(CHANGE_EVENT))
}

function subscribe(listener) {
  if (typeof window === 'undefined') return () => {}
  const onStorage = event => {
    if (event.key !== HOME_THEME_STORAGE_KEY && event.key !== null) return
    runtimeTheme = undefined
    listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

const serverSnapshot = () => 'light'
const restore = (element, attribute, value) => {
  if (value == null) element.removeAttribute(attribute)
  else element.setAttribute(attribute, value)
}

// The page owns the document palette; header controls only read/write its store.
export function useHomeTheme({ applyToDocument = false } = {}) {
  const theme = useSyncExternalStore(subscribe, readHomeTheme, serverSnapshot)
  useLayoutEffect(() => {
    if (!applyToDocument) return undefined
    const root = document.documentElement
    const previousHome = root.getAttribute('data-icue-home-theme')
    const previousTheme = root.getAttribute('data-icue-page-theme')
    const previousPage = root.getAttribute('data-icue-theme-page')
    const meta = document.querySelector('meta[name="theme-color"]')
    const previousColor = meta?.getAttribute('content')
    root.setAttribute('data-icue-home-theme', theme)
    root.setAttribute('data-icue-page-theme', theme)
    root.setAttribute('data-icue-theme-page', 'home')
    meta?.setAttribute('content', theme === 'dark' ? '#0c0f14' : '#f5f8fc')
    return () => {
      if (root.getAttribute('data-icue-home-theme') === theme) restore(root, 'data-icue-home-theme', previousHome)
      if (root.getAttribute('data-icue-theme-page') !== 'home') return
      restore(root, 'data-icue-page-theme', previousTheme)
      restore(root, 'data-icue-theme-page', previousPage)
      if (meta) restore(meta, 'content', previousColor)
    }
  }, [applyToDocument, theme])
  return [theme, setHomeTheme]
}
