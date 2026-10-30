import test from 'node:test'
import assert from 'node:assert/strict'
import { handleGeminiArticleRequest } from '../../news-app/src/lib/geminiServer.js'
import { handleFluxImageRequest } from '../../news-app/src/lib/fluxServer.js'
import cleanup, { config as cleanupConfig } from '../../netlify/functions/article-media-cleanup.mjs'
import gemini, { config as geminiConfig } from '../../netlify/functions/gemini-article.mjs'
import { config as fluxConfig } from '../../netlify/functions/flux-image.mjs'

const env = { SUPABASE_URL: 'https://storage.example.invalid', SUPABASE_ANON_KEY: 'fixture-public-key', GEMINI_API_KEY: 'fixture-provider-key', CLOUDFLARE_ACCOUNT_ID: 'fixture-account', CLOUDFLARE_API_TOKEN: 'fixture-token' }
const request = body => ({ httpMethod: 'POST', headers: { authorization: 'Bearer fixture-session' }, body: JSON.stringify(body) })
const userId = '00000000-0000-4000-8000-000000000111'
function staffAuthResponse(url, role = 'author') {
  const endpoint = new URL(url)
  if (endpoint.pathname === '/auth/v1/user') return Response.json({ id: userId })
  if (endpoint.pathname === '/rest/v1/profiles') return Response.json([{ id: userId, role }])
  return null
}

for (const [name, handler, body] of [
  ['Gemini', handleGeminiArticleRequest, { messages: [{ role: 'user', content: 'Hello' }] }],
  ['FLUX', handleFluxImageRequest, { prompt: 'An image' }],
]) {
  test(`${name} times out hung auth without calling a paid provider, and aborts the upstream request`, async t => {
    let signal
    let calls = 0
    t.mock.method(globalThis, 'fetch', async (_url, options) => { calls++; signal = options.signal; return new Promise(() => {}) })
    const response = await handler(request(body), env, { timeoutMs: 10 })
    assert.equal(response.statusCode, 504)
    assert.equal(JSON.parse(response.body).code, 'request_timeout')
    assert.equal(signal.aborted, true)
    assert.equal(calls, 1)
  })
  test(`${name} rejects invalid JSON payload types before provider calls`, async t => {
    const fetch = t.mock.method(globalThis, 'fetch', async url => staffAuthResponse(url))
    for (const body of ['null', '[]']) {
      const response = await handler({ ...request({}), body }, env)
      assert.equal(response.statusCode, 400)
      assert.equal(JSON.parse(response.body).code, 'invalid_payload')
    }
    assert.equal(fetch.mock.callCount(), 4)
  })
  test(`${name} includes a stalled provider body in the request deadline`, async t => {
    let calls = 0
    let signal
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      calls++; signal = options.signal
      return staffAuthResponse(url) || { ok: true, status: 200, json: () => new Promise(() => {}) }
    })
    const response = await handler(request(body), env, { timeoutMs: 10 })
    assert.equal(response.statusCode, 504)
    assert.equal(signal.aborted, true)
    assert.equal(calls, 3)
  })

  test(`${name} denies customers and missing/unknown roles despite spoofed Auth metadata`, async t => {
    let profileRole = 'customer'
    const calls = []
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      const endpoint = new URL(url)
      calls.push(endpoint.pathname)
      assert.equal(options.headers.Authorization, 'Bearer fixture-session')
      assert.equal(options.headers.apikey, env.SUPABASE_ANON_KEY)
      if (endpoint.pathname === '/auth/v1/user') return Response.json({ id: userId, user_metadata: { role: 'admin' }, app_metadata: { role: 'admin' } })
      assert.equal(endpoint.pathname, '/rest/v1/profiles', 'denied users never reach a paid provider')
      assert.equal(endpoint.searchParams.get('id'), `eq.${userId}`)
      assert.equal(endpoint.searchParams.get('select'), 'id,role')
      return Response.json(profileRole ? [{ id: userId, role: profileRole }] : [])
    })
    for (profileRole of ['customer', 'unknown', null]) {
      const result = await handler(request({ ...body, user_id: 'forged-owner', role: 'admin' }), env)
      assert.equal(result.statusCode, 403)
      assert.equal(JSON.parse(result.body).code, 'forbidden')
    }
    assert.equal(calls.length, 6)
  })

  test(`${name} authorizes current author/admin database roles before the provider call`, async t => {
    let profileRole = 'author'
    let providerCalls = 0
    t.mock.method(globalThis, 'fetch', async url => {
      const auth = staffAuthResponse(url, profileRole)
      if (auth) return auth
      providerCalls++
      return name === 'FLUX'
        ? Response.json({ success: true, result: { image: 'fixture-image' } })
        : Response.json({ candidates: [{ content: { parts: [{ text: 'Fixture reply' }] } }] })
    })
    for (profileRole of ['author', 'admin']) assert.equal((await handler(request(body), env)).statusCode, 200)
    profileRole = 'customer'
    assert.equal((await handler(request(body), env)).statusCode, 403, 'a revoked role is checked again with the same JWT')
    assert.equal(providerCalls, 2)
  })

  test(`${name} fails closed when the role check fails or stalls`, async t => {
    let stalled = false
    let roleSignal
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      const endpoint = new URL(url)
      if (endpoint.pathname === '/auth/v1/user') return Response.json({ id: userId })
      assert.equal(endpoint.pathname, '/rest/v1/profiles', 'a role lookup failure never reaches the provider')
      roleSignal = options.signal
      return stalled ? { ok: true, status: 200, json: () => new Promise(() => {}) }
        : new Response('database error details must stay private', { status: 500 })
    })
    const unavailable = await handler(request(body), env)
    assert.equal(unavailable.statusCode, 503)
    assert.equal(JSON.parse(unavailable.body).code, 'authorization_unavailable')
    assert.doesNotMatch(unavailable.body, /database error details/)
    stalled = true
    const expired = await handler(request(body), env, { timeoutMs: 10 })
    assert.equal(expired.statusCode, 504)
    assert.equal(roleSignal.aborted, true)
  })
}

test('paid AI endpoints have platform limits and reject oversized bodies without outbound requests', async t => {
  assert.equal(geminiConfig.rateLimit.windowLimit, 12)
  assert.equal(fluxConfig.rateLimit.windowLimit, 6)
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('unexpected external call') })
  const response = await gemini(new Request('https://vi.icue.vn/.netlify/functions/gemini-article', { method: 'POST', body: 'x'.repeat(512 * 1024 + 1) }))
  assert.equal(response.status, 413)
  assert.equal(fetch.mock.callCount(), 0)
})

function cleanupEnv(t) {
  for (const [key, value] of Object.entries({ SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-only-key' })) {
    const old = process.env[key]; process.env[key] = value
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old })
  }
}

test('scheduled cleanup retries through the Storage API, includes covers and ignores external URLs', async t => {
  cleanupEnv(t)
  assert.equal(cleanupConfig.schedule, '*/15 * * * *')
  const own = '00000000-0000-4000-8000-000000000001/covers/cover.jpg'
  const external = '00000000-0000-4000-8000-000000000001/covers/external.jpg'
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    assert.ok(options.signal)
    if (url.endsWith('pending_article_storage_cleanup')) return Response.json([
      { path: own, source_url: `${env.SUPABASE_URL}/storage/v1/object/public/article-media/${own}` },
      { path: external, source_url: `https://another-project.example.invalid/storage/v1/object/public/article-media/${external}` },
    ])
    return Response.json([])
  })
  await cleanup()
  assert.equal(calls[1].options.method, 'DELETE')
  assert.deepEqual(JSON.parse(calls[1].options.body), { prefixes: [own] })
  assert.deepEqual(JSON.parse(calls[2].options.body), { p_paths: [own, external] })
})

test('failed scheduled removal stays pending instead of acknowledging lost files', async t => {
  cleanupEnv(t)
  let calls = 0
  const path = '00000000-0000-4000-8000-000000000001/media/old.jpg'
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return calls === 1 ? Response.json([{ path, source_url: `${env.SUPABASE_URL}/storage/v1/object/public/article-media/${path}` }]) : new Response('', { status: 503 })
  })
  await assert.rejects(cleanup(), /removal failed/)
  assert.equal(calls, 2)
})
