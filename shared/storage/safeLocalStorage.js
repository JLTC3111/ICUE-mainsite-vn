/**
 * Storage access can throw in private browsing, sandboxed frames, or when a
 * visitor blocks site data. Keep optional preferences from taking down React.
 */
export function readLocalStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeLocalStorage(key, value) {
  try {
    if (!globalThis.localStorage) return false
    globalThis.localStorage.setItem(key, String(value))
    return true
  } catch {
    return false
  }
}
