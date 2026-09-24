const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  return { url, key }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'method not allowed' }) }
  }

  const { url, key } = supabaseConfig()
  if (!url || !key) {
    return {
      statusCode: 503,
      headers: HEADERS,
      body: JSON.stringify({ error: 'auth not configured', code: 'config_missing' }),
    }
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'invalid json', code: 'bad_request' }) }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'invalid payload', code: 'bad_request' }) }
  }

  const email = String(payload.email || '').trim().toLowerCase()
  const redirectTo = String(payload.redirectTo || 'https://icue.vn/newsroom/login')

  if (!EMAIL_RE.test(email)) {
    return {
      statusCode: 422,
      headers: HEADERS,
      body: JSON.stringify({ error: 'invalid email', code: 'email_address_invalid' }),
    }
  }

  try {
    const endpoint = new URL(`${url.replace(/\/$/, '')}/auth/v1/recover`)
    // GoTrue reads redirect_to from the query, not from a JSON body. Its
    // configured redirect allowlist remains authoritative.
    endpoint.searchParams.set('redirect_to', redirectTo)
    const res = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const text = await res.text()
    let body = {}
    try { body = text ? JSON.parse(text) : {} } catch { body = { msg: text } }

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: HEADERS,
        body: JSON.stringify({
          error: body.msg || body.error_description || body.error || 'reset failed',
          code: body.error_code || body.code || `http_${res.status}`,
        }),
      }
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: true }),
    }
  } catch (err) {
    return {
      statusCode: 502,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message || 'network error', code: 'network_error' }),
    }
  }
}
