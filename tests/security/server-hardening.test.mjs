import test from 'node:test'
import assert from 'node:assert/strict'
import { handleGeminiArticleRequest } from '../../news-app/src/lib/geminiServer.js'
import { handleFluxImageRequest } from '../../news-app/src/lib/fluxServer.js'
import cleanup, { config as cleanupConfig } from '../../netlify/functions/article-media-cleanup.mjs'
import gemini, { config as geminiConfig } from '../../netlify/functions/gemini-article.mjs'
import { config as fluxConfig } from '../../netlify/functions/flux-image.mjs'

const env = { SUPABASE_URL: 'https://storage.example.invalid', SUPABASE_ANON_KEY: 'fixture-public-key', GEMINI_API_KEY: 'fixture-provider-key', CLOUDFLARE_ACCOUNT_ID: 'fixture-account', CLOUDFLARE_API_TOKEN: 'fixture-token' }
const request = body => ({ httpMethod: 'POST', headers: { authorization: 'Bearer fixture-session' }, body: JSON.stringify(body) })

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
    const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 'fixture-user' }))
    for (const body of ['null', '[]']) {
      const response = await handler({ ...request({}), body }, env)
      assert.equal(response.statusCode, 400)
      assert.equal(JSON.parse(response.body).code, 'invalid_payload')
    }
    assert.equal(fetch.mock.callCount(), 2)
  })
  test(`${name} includes a stalled provider body in the request deadline`, async t => {
    let calls = 0
    let signal
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
      calls++; signal = options.signal
      return calls === 1 ? Response.json({ id: 'fixture-user' }) : { ok: true, status: 200, json: () => new Promise(() => {}) }
    })
    const response = await handler(request(body), env, { timeoutMs: 10 })
    assert.equal(response.statusCode, 504)
    assert.equal(signal.aborted, true)
    assert.equal(calls, 2)
  })
}

test('paid AI endpoints have platform limits and reject oversized bodies without outbound requests', async t => {
  assert.equal(geminiConfig.rateLimit.windowLimit, 12)
  assert.equal(fluxConfig.rateLimit.windowLimit, 6)
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('unexpected external call') })
  const response = await gemini(new Request('https://icue.vn/.netlify/functions/gemini-article', { method: 'POST', body: 'x'.repeat(512 * 1024 + 1) }))
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
