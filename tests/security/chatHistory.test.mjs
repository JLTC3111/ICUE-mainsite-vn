import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import handler from '../../netlify/functions/chat-history.mjs'
const token = 'a'.repeat(64)
const payload = { version: 1, iv: 'A'.repeat(16), data: 'B'.repeat(32) }
const call = (method = 'GET', body, headers = {}) => handler(new Request('https://icue.vn/.netlify/functions/chat-history', {
  method, headers: { Authorization: `Bearer ${token}`, ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}))
function env(t) {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  process.env.SUPABASE_URL = 'https://database.example'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-credential'
  t.after(() => {
    for (const [name, value] of [['SUPABASE_URL', previous.url], ['SUPABASE_SERVICE_ROLE_KEY', previous.key]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value
    }
  })
}

test('history API rejects missing capability, cross-origin writes, plaintext and oversized data', async t => {
  env(t)
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Must not contact database') })
  assert.equal((await call('POST')).status, 405)
  assert.equal((await call('GET', undefined, { Authorization: 'Bearer guess' })).status, 401)
  assert.equal((await call('PUT', { revision: 0, payload }, { Origin: 'https://unrelated.example' })).status, 403)
  assert.equal((await call('PUT', { revision: 0, payload: { content: 'plaintext' } })).status, 400)
  assert.equal((await call('PUT', { revision: -1, payload })).status, 400)
  assert.equal((await call('PUT', { revision: 0, payload: { ...payload, iv: [payload.iv] } })).status, 400)
  assert.equal((await call('PUT', { revision: 0, payload: { ...payload, data: 'A'.repeat(1_502_000) } })).status, 413)
})

test('history API derives ownership from capability and guards writes with the exact revision', async t => {
  env(t)
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: new URL(url), init })
    return Response.json([{ revision: 8, payload }])
  })
  assert.equal((await call('PUT', { revision: 7, payload, id: 'someone-else' })).status, 200)
  const request = calls[0]
  assert.equal(request.url.searchParams.get('id'), `eq.${createHash('sha256').update(token).digest('hex')}`)
  assert.equal(request.url.searchParams.get('revision'), 'eq.7')
  assert.equal(request.init.method, 'PATCH')
  assert.equal(JSON.parse(request.init.body).revision, 8)
  assert.equal(request.init.headers.Authorization, 'Bearer server-only-test-credential')
  assert.equal(request.init.body.includes('someone-else'), false)
  assert.equal(request.init.body.includes(token), false)
})

test('history API reports conflicts/missing rows and never reveals database errors or credentials', async t => {
  env(t)
  let response = Response.json([])
  t.mock.method(globalThis, 'fetch', async () => response)
  assert.equal((await call('PUT', { revision: 4, payload })).status, 409)
  response = Response.json([])
  assert.equal((await call()).status, 404)
  response = Response.json({ code: '23505', secret: 'server-only-test-credential' }, { status: 409 })
  assert.equal((await call('PUT', { revision: 0, payload })).status, 409)
  response = Response.json({ details: 'secret internals' }, { status: 500 })
  const result = await call()
  assert.equal(result.status, 503)
  assert.deepEqual(await result.json(), { error: 'sync_unavailable' })
  response = Response.json([])
  assert.equal((await call('DELETE')).status, 200)
})
