/** Absolute URL for Supabase auth redirects (must match Supabase dashboard allowlist). */
export function getAuthRedirectUrl(path = 'login') {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  const segment = String(path).replace(/^\//, '')
  return `${window.location.origin}${normalized}${segment}`
}

/** True when the current URL is a Supabase password-recovery callback. */
export function isPasswordRecoveryUrl() {
  const hash = window.location.hash || ''
  const search = window.location.search || ''
  return hash.includes('type=recovery') || search.includes('type=recovery')
}
