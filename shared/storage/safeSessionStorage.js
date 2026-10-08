// Session hints are optional; blocked storage must never prevent app startup.
export function readSessionStorage(key) {
  try {
    return globalThis.sessionStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeSessionStorage(key, value) {
  try {
    if (!globalThis.sessionStorage) return false
    globalThis.sessionStorage.setItem(key, String(value))
    return true
  } catch {
    return false
  }
}
