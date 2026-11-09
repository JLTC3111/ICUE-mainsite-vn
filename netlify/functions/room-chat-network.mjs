import { isIP } from 'node:net'

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const reply = (body, status = 200) => Response.json(body, { status, headers })
const unknown = () => ({ vpn_status: 'unknown', proxy_status: 'unknown', provider: null })

// Keyless proxycheck queries have a free, provider-enforced quota. Deliberately
// accept no paid API key, subscription, credits, or user-supplied endpoint.
export function createNetworkHandler({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map(), requests = new Map()
  let exhaustedUntil = 0
  return async (request, context = {}) => {
    if (request.method !== 'POST') return reply({ error: 'POST required.' }, 405)
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') || '')?.[1]
    if (!token) return reply({ error: 'Sign in to continue.' }, 401)
    const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
    const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
    const service = env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key || !service) return reply({ error: 'Network security service unavailable.' }, 503)
    const signal = AbortSignal.timeout(10_000)
    try {
      const auth = { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      const userResponse = await fetchImpl(`${url}/auth/v1/user`, { headers: auth, signal })
      if (!userResponse.ok) return reply({ error: 'Sign in to continue.' }, 401)
      const user = await userResponse.json()
      if (!user?.id || user.is_anonymous || !user.email_confirmed_at) return reply({ error: 'A verified account is required.' }, 403)
      // Bootstrap enforces the current database profile and active Auth account.
      const account = await fetchImpl(`${url}/rest/v1/rpc/room_chat_bootstrap`, { method: 'POST', headers: auth, body: '{}', signal })
      if (!account.ok) return reply({ error: 'Chatroom access unavailable.' }, 403)
      await account.arrayBuffer()
      if ((requests.get(user.id) || 0) > now() - 60_000) return reply({ recorded: false, ...unknown(), firewall_status: 'unknown' })
      if (requests.size >= 2000) requests.clear()
      requests.set(user.id, now())
      // Only Netlify's server context is trusted. Never use a browser body,
      // X-Forwarded-For, Client-IP, or other client-controlled header here.
      const ip = typeof context.ip === 'string' && isIP(context.ip) ? context.ip : null
      let assessment = unknown()
      if (ip && env.ROOM_CHAT_DISABLE_FREE_VPN_LOOKUP !== 'true') {
        const stored = cache.get(ip)
        if (stored && stored.expires > now()) assessment = stored.value
        else if (now() >= exhaustedUntil) {
          try {
            const response = await fetchImpl(`https://proxycheck.io/v3/${encodeURIComponent(ip)}?ver=24-June-2026&tag=0`, { signal: AbortSignal.timeout(2500), redirect: 'error' })
            if (response.status === 429 || response.status === 403) exhaustedUntil = Math.floor(now() / 86_400_000 + 1) * 86_400_000
            if (response.ok) {
              const data = await response.json(), detection = data?.[ip]?.detections
              if (['ok', 'warning'].includes(data?.status) && detection) {
                const status = value => value === true ? 'detected' : value === false ? 'not_detected' : 'unknown'
                assessment = { vpn_status: status(detection.vpn), proxy_status: status(detection.proxy), provider: 'proxycheck.io (free)' }
              }
            }
          } catch { /* Missing intelligence remains unknown, never a clean verdict. */ }
          if (cache.size >= 1000) cache.clear()
          cache.set(ip, { value: assessment, expires: now() + 6 * 60 * 60 * 1000 })
        }
      }
      const saved = await fetchImpl(`${url}/rest/v1/rpc/room_chat_network_record`, {
        method: 'POST', signal,
        headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_user_id: user.id, p_ip: ip, p_source: ip ? 'netlify_context' : 'unavailable', p_vpn_status: assessment.vpn_status, p_proxy_status: assessment.proxy_status, p_provider: assessment.provider }),
      })
      if (!saved.ok) { requests.delete(user.id); return reply({ error: 'Network log could not be saved.' }, 503) }
      await saved.arrayBuffer()
      return reply({ recorded: true, ...assessment, firewall_status: 'unknown' })
    } catch { return reply({ error: 'Network security service unavailable.' }, 503) }
  }
}

export default createNetworkHandler()
