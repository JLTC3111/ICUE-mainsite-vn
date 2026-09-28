import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { marketApiPlugin } from '../../news-app/vite-market-api-plugin.js'

const require = createRequire(import.meta.url)
const { handler } = require('../../netlify/functions/auth-forgot-password.js')

function configureAuth(t, values = {}) {
  for (const [name, value] of Object.entries({ SUPABASE_URL: 'https://auth.example.invalid/', SUPABASE_ANON_KEY: 'test-public-key', VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', ...values })) {
    const old = process.env[name]
    process.env[name] = value
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old })
  }
}

test('password reset works with the bundled public config when Functions env is empty', async t => {
  configureAuth(t, { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' })
  const config = JSON.parse(readFileSync(new URL('../../news-app/public/supabase-config.json', import.meta.url)))
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).origin, new URL(config.url).origin)
    assert.equal(options.headers.apikey, config.anonKey)
    assert.equal(new URL(url).searchParams.get('redirect_to'), 'https://icue.vn/newsroom/login')
    return new Response('{}', { status: 200 })
  })
  const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ email: 'editor@example.invalid' }) })
  assert.equal(response.statusCode, 200)
  assert.equal(fetch.mock.callCount(), 1)
})

test('explicit Vite environment credentials take precedence over bundled config', async t => {
  configureAuth(t, {
    SUPABASE_URL: '', SUPABASE_ANON_KEY: '',
    VITE_SUPABASE_URL: 'https://preview.example.invalid', VITE_SUPABASE_ANON_KEY: 'preview-public-key',
  })
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).origin, 'https://preview.example.invalid')
    assert.equal(options.headers.apikey, 'preview-public-key')
    return new Response('{}', { status: 200 })
  })
  const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ email: 'editor@example.invalid' }) })
  assert.equal(response.statusCode, 200)
})

test('production password reset passes the exact callback as a query parameter', async t => {
  configureAuth(t)
  const redirectTo = 'https://icue.vn/newsroom/login?lang=vi&from=vi'
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: new URL(url), body: JSON.parse(options.body) })
    return new Response('{}', { status: 200 })
  })
  const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ email: 'Editor@Example.invalid', redirectTo }) })
  assert.equal(response.statusCode, 200)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url.pathname, '/auth/v1/recover')
  assert.equal(calls[0].url.searchParams.get('redirect_to'), redirectTo)
  assert.deepEqual(calls[0].body, { email: 'editor@example.invalid' })
})

test('the development proxy uses the same callback query contract', async t => {
  configureAuth(t)
  const redirectTo = 'http://localhost:5173/newsroom/login?lang=en'
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).searchParams.get('redirect_to'), redirectTo)
    assert.deepEqual(JSON.parse(options.body), { email: 'editor@example.invalid' })
    return new Response('{}', { status: 200 })
  })
  let middleware
  marketApiPlugin().configureServer({ middlewares: { use: fn => { middleware = fn } } })
  const req = Object.assign(new EventEmitter(), { url: '/newsroom/api/auth-forgot-password', method: 'POST', headers: {} })
  await new Promise((resolve, reject) => {
    const res = { statusCode: 200, setHeader() {}, end(body) { try { assert.equal(this.statusCode, 200); assert.equal(JSON.parse(body).ok, true); resolve() } catch (error) { reject(error) } } }
    middleware(req, res, () => reject(new Error('auth route was not handled')))
    req.emit('data', JSON.stringify({ email: 'editor@example.invalid', redirectTo }))
    req.emit('end')
  })
})

test('auth errors stay machine-readable and malformed input never sends mail', async t => {
  configureAuth(t)
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error_code: 'over_email_send_rate_limit', msg: 'rate limited' }), { status: 429 }))
  for (const body of ['null', '[]', '{']) {
    const response = await handler({ httpMethod: 'POST', body })
    assert.equal(response.statusCode, 400)
    assert.equal(response.headers['Content-Type'], 'application/json')
  }
  assert.equal(fetch.mock.callCount(), 0)
  const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ email: 'editor@example.invalid' }) })
  assert.equal(response.statusCode, 429)
  assert.equal(response.headers['Content-Type'], 'application/json')
  assert.equal(response.headers['Cache-Control'], 'no-store')
  assert.equal(JSON.parse(response.body).code, 'over_email_send_rate_limit')
})
