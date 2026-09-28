let passwordRecoveryPending = false

/** Absolute URL for Supabase auth redirects (must match Supabase dashboard allowlist). */
export function getAuthRedirectUrl(path = 'login') {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  const segment = String(path).replace(/^\//, '')
  const origin = canonicalOrigin()
  return `${origin}${normalized}${segment}`
}

/** Prefer stable icue.vn origins over www/http variants for Supabase allowlist. */
function canonicalOrigin() {
  if (typeof window === 'undefined') return 'https://icue.vn'
  const host = window.location.hostname.toLowerCase()
  if (host === 'icue.vn' || host === 'www.icue.vn') return 'https://icue.vn'
  if (host === 'en.icue.vn' || host.endsWith('.en.icue.vn')) return 'https://en.icue.vn'
  return window.location.origin
}

/** Capture before the SDK consumes the hash and before the lazy login mounts. */
export function capturePasswordRecoveryUrl() {
  passwordRecoveryPending = isPasswordRecoveryUrl()
}

/** Clear the captured intent when recovery completes or the modal is closed. */
export function clearPasswordRecoveryUrl() {
  passwordRecoveryPending = false
}

/** True for a recovery callback, including one already consumed by the SDK. */
export function isPasswordRecoveryUrl() {
  if (passwordRecoveryPending) return true
  if (typeof window === 'undefined') return false
  const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''))
  const search = new URLSearchParams(window.location.search || '')
  return hash.get('type') === 'recovery' || search.get('type') === 'recovery'
}
