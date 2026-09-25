import { createHash } from 'node:crypto'

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers })

// Declarative limits apply at Netlify's edge, across function instances.
export const config = { rateLimit: { windowLimit: 90, windowSize: 60, aggregateBy: ['ip', 'domain'] } }

/** Only ciphertext is accepted. A hash of the browser's derived bearer token
 * locates the vault; callers cannot choose a different owner's row ID. */
export default async function handler(request) {
  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) return reply(405, { error: 'method_not_allowed' })
  const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization') || '')?.[1]
  if (!token) return reply(401, { error: 'unauthorized' })
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return reply(403, { error: 'origin_mismatch' })
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return reply(503, { error: 'sync_unavailable' })
  const id = createHash('sha256').update(token).digest('hex')
  const endpoint = new URL(`${url.replace(/\/$/, '')}/rest/v1/chat_history_vaults`)
  endpoint.searchParams.set('id', `eq.${id}`)
  endpoint.searchParams.set('select', 'revision,payload')
  let payload
  if (request.method === 'PUT') {
    if (Number(request.headers.get('content-length')) > 1_501_000) return reply(413, { error: 'too_large' })
    const text = await request.text()
    if (text.length > 1_501_000) return reply(413, { error: 'too_large' })
    try { payload = JSON.parse(text) } catch { return reply(400, { error: 'invalid_payload' }) }
    if (!Number.isSafeInteger(payload?.revision) || payload.revision < 0 || payload.revision >= Number.MAX_SAFE_INTEGER
      || payload.payload?.version !== 1 || typeof payload.payload.iv !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(payload.payload.iv)
      || typeof payload.payload.data !== 'string' || !/^[A-Za-z0-9_-]{24,1500000}$/.test(payload.payload.data)) return reply(400, { error: 'invalid_payload' })
  }
  let method = request.method
  let body
  if (method === 'PUT') {
    method = payload.revision === 0 ? 'POST' : 'PATCH'
    body = { revision: payload.revision + 1, payload: { version: 1, iv: payload.payload.iv, data: payload.payload.data }, updated_at: new Date().toISOString() }
    if (method === 'POST') { endpoint.searchParams.delete('id'); body.id = id }
    else endpoint.searchParams.set('revision', `eq.${payload.revision}`)
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(endpoint, {
      method, signal: controller.signal,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const rows = await response.json()
    if (response.status === 409) return reply(409, { error: 'conflict' })
    if (!response.ok || !Array.isArray(rows)) return reply(503, { error: 'sync_unavailable' })
    if (request.method === 'DELETE') return reply(200, { revision: 0 })
    if (!rows.length) return reply(request.method === 'GET' ? 404 : 409, { error: 'not_found_or_conflict' })
    return reply(200, rows[0])
  } catch {
    return reply(503, { error: 'sync_unavailable' })
  } finally { clearTimeout(timer) }
}
