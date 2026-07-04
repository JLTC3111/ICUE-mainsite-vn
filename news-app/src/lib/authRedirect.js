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

/** True when the current URL is a Supabase password-recovery callback. */
export function isPasswordRecoveryUrl() {
  const hash = window.location.hash || ''
  const search = window.location.search || ''
  return hash.includes('type=recovery') || search.includes('type=recovery')
}
