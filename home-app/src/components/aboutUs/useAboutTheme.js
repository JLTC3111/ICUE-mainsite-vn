import { useEffect, useState } from 'react'

const STORAGE_KEY = 'aboutUs_theme'
const ROOT_ATTRIBUTE = 'data-about-theme'

/**
 * The About page's own light/dark switch.
 *
 * It is deliberately not a site-wide theme. Nothing else on icue.vn has a dark
 * variant, and `data-about-theme` is only ever set while this page is mounted —
 * the cleanup below takes it off again, so the nav and footer never find
 * themselves styled for a page the reader has already left.
 *
 * `window.AboutUsThemeManager` is the same contract the background video used
 * to publish, for the same reason: MainSiteNav renders the toggle in the site
 * chrome, which is mounted above this page and cannot reach its state any other
 * way. The nav reads `isDark()` / `canToggle()`, calls `setTheme()`, and
 * re-reads on `icue:aboutUsTheme` and `icue:aboutUsThemeManagerReady`. Its
 * presence is also what tells the nav to show a theme toggle at all rather than
 * the video toggle the legacy About page still wants — see MainSiteNav.
 */

function readStoredTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'dark' || raw === 'light' ? raw : null
  } catch {
    return null
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
}

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** A stored choice wins; otherwise follow the OS. */
export function resolveInitialTheme() {
  return readStoredTheme() || systemTheme()
}

/**
 * Write the attribute, then tell everyone.
 *
 * The order is the point. `data-about-theme` on <html> is the single source of
 * truth — the manager's `isDark()` reads it, and the nav calls that when the
 * event arrives. Leaving the write to the render effect would fire the event
 * while the attribute still said `light`, so the toggle in the chrome would
 * flip the page but not its own `aria-pressed`.
 */
function commitTheme(next) {
  const normalized = next === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute(ROOT_ATTRIBUTE, normalized)
  window.dispatchEvent(
    new CustomEvent('icue:aboutUsTheme', { detail: { theme: normalized } }),
  )
  return normalized
}

export default function useAboutTheme() {
  const [theme, setThemeState] = useState(resolveInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute(ROOT_ATTRIBUTE, theme)
  }, [theme])

  useEffect(() => {
    const setTheme = (next) => {
      const normalized = commitTheme(next)
      writeStoredTheme(normalized)
      setThemeState(normalized)
    }

    const manager = {
      getTheme: () => document.documentElement.getAttribute(ROOT_ATTRIBUTE) || 'light',
      isDark: () => document.documentElement.getAttribute(ROOT_ATTRIBUTE) === 'dark',
      setTheme,
      setDark: (dark) => setTheme(dark ? 'dark' : 'light'),
      toggle: () => setTheme(manager.isDark() ? 'light' : 'dark'),
      canToggle: () => true,
    }

    window.AboutUsThemeManager = manager
    window.dispatchEvent(new CustomEvent('icue:aboutUsThemeManagerReady'))

    // Only track the OS while the reader has not expressed a preference of
    // their own; once they have, flipping the laptop to night mode must not
    // undo it.
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = (event) => {
      if (readStoredTheme()) return
      setThemeState(commitTheme(event.matches ? 'dark' : 'light'))
    }
    query.addEventListener('change', onSystemChange)

    return () => {
      query.removeEventListener('change', onSystemChange)
      document.documentElement.removeAttribute(ROOT_ATTRIBUTE)
      if (window.AboutUsThemeManager === manager) {
        delete window.AboutUsThemeManager
      }
      window.dispatchEvent(new CustomEvent('icue:aboutUsThemeManagerReady'))
    }
  }, [])

  return theme
}
