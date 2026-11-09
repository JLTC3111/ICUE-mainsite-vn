import test from 'node:test'
import assert from 'node:assert/strict'
import { createNetworkHandler } from '../../netlify/functions/room-chat-network.mjs'

const env = { SUPABASE_URL: 'https://db.invalid', SUPABASE_ANON_KEY: 'public', SUPABASE_SERVICE_ROLE_KEY: 'private' }
const request = () => new Request('https://icue.invalid/.netlify/functions/room-chat-network', { method: 'POST', headers: { Authorization: 'Bearer user', 'X-Forwarded-For': '8.8.8.8' }, body: JSON.stringify({ ip: '8.8.8.8', user_id: 'forged' }) })
function fixture({ lookupStatus = 200, detection = { vpn: true, proxy: false }, denied = false, disable = false } = {}) {
  const calls = []
  const handler = createNetworkHandler({ env: { ...env, ...(disable ? { ROOM_CHAT_DISABLE_FREE_VPN_LOOKUP: 'true' } : {}) }, now: () => 1800000000000, fetchImpl: async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'verified-user', email_confirmed_at: '2026-01-01' })
    if (url.endsWith('room_chat_bootstrap')) return Response.json({}, { status: denied ? 403 : 200 })
    if (url.startsWith('https://proxycheck.io')) return Response.json({ status: 'ok', '1.1.1.1': { detections: detection } }, { status: lookupStatus })
    return Response.json(null)
  } })
  return { handler, calls }
}
test('network observation trusts platform IP, verifies Auth and current database access, hides service credentials', async () => {
  const f = fixture(), response = await f.handler(request(), { ip: '1.1.1.1' })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  const body = await response.json()
  assert.equal(body.vpn_status, 'detected'); assert.equal(body.proxy_status, 'not_detected'); assert.equal(body.firewall_status, 'unknown')
  assert.ok(!JSON.stringify(body).includes('private'))
  const record = f.calls.find(c => c.url.endsWith('network_record'))
  assert.equal(JSON.parse(record.options.body).p_user_id, 'verified-user')
  assert.equal(JSON.parse(record.options.body).p_ip, '1.1.1.1')
  const lookup = f.calls.find(c => c.url.includes('proxycheck.io'))
  assert.ok(!lookup.url.includes('key=')); assert.ok(!lookup.url.includes('8.8.8.8'))
})
test('quota failures, absent flags, and missing trusted IP remain unknown', async () => {
  for (const options of [{ lookupStatus: 429 }, { detection: {} }, { disable: true }]) {
    const f = fixture(options), body = await (await f.handler(request(), { ip: '1.1.1.1' })).json()
    assert.equal(body.vpn_status, 'unknown'); assert.equal(body.proxy_status, 'unknown')
  }
  const f = fixture(), body = await (await f.handler(request(), {})).json()
  assert.equal(body.vpn_status, 'unknown')
  assert.ok(!f.calls.some(c => c.url.includes('proxycheck.io')))
  assert.equal(JSON.parse(f.calls.at(-1).options.body).p_ip, null)
})
test('unauthorized requests cannot reach provider or logs; repeated calls are throttled', async () => {
  const f = fixture({ denied: true })
  assert.equal((await f.handler(request(), { ip: '1.1.1.1' })).status, 403)
  assert.equal(f.calls.length, 2)
  const noAuth = new Request('https://icue.invalid', { method: 'POST' })
  assert.equal((await f.handler(noAuth, {})).status, 401)
  const ok = fixture()
  await ok.handler(request(), { ip: '1.1.1.1' })
  assert.equal((await (await ok.handler(request(), { ip: '1.1.1.1' })).json()).recorded, false)
  assert.equal(ok.calls.filter(c => c.url.endsWith('network_record')).length, 1)
})
