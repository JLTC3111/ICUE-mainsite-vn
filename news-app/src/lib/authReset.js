/** Map Supabase auth errors to i18n keys under login.* */
export function authErrorKey(error) {
  if (!error) return 'login.resetError'

  const msg = String(error.message || '').toLowerCase()
  const code = String(error.code || '').toLowerCase()

  if (
    msg.includes('rate limit')
    || code.includes('rate_limit')
    || code === 'over_email_send_rate_limit'
  ) {
    return 'login.resetRateLimit'
  }

  if (msg.includes('invalid') && msg.includes('email')) {
    return 'login.resetInvalidEmail'
  }

  if (msg.includes('redirect') || code.includes('redirect')) {
    return 'login.resetRedirect'
  }

  if (
    msg.includes('fetch failed')
    || msg.includes('network')
    || msg.includes('failed to fetch')
    || code === 'network_error'
  ) {
    return 'login.resetNetwork'
  }

  if (msg.includes('session') || code === 'session_not_found') {
    return 'login.updatePasswordError'
  }

  return 'login.resetError'
}

/** Server-side password reset (Netlify function / dev proxy). */
export async function sendPasswordResetEmail(email, redirectTo) {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/auth-forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirectTo }),
    })

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return { error: { message: 'proxy unavailable', code: `http_${res.status}` } }
    }

    const body = await res.json()
    if (res.ok) return { error: null }

    return {
      error: {
        message: body.error || 'reset failed',
        code: body.code || `http_${res.status}`,
      },
    }
  } catch {
    return { error: { message: 'network error', code: 'network_error' } }
  }
}
