import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  capturePasswordRecoveryUrl, clearPasswordRecoveryUrl, isPasswordRecoveryUrl,
} from '../../news-app/src/lib/authRedirect.js'

const require = createRequire(new URL('../../news-app/package.json', import.meta.url))
const { createClient } = require('@supabase/supabase-js')

function browser(t, href) {
  const values = {
    window: { location: new URL(href), addEventListener() {}, removeEventListener() {} },
    document: { visibilityState: 'hidden' },
    BroadcastChannel: undefined,
  }
  for (const [key, value] of Object.entries(values)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    })
  }
  clearPasswordRecoveryUrl()
  t.after(clearPasswordRecoveryUrl)
}

test('a delayed login still recognizes recovery after the real SDK consumes the callback', async t => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'reset@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const accessToken = [{ alg: 'HS256', typ: 'JWT' }, { sub: user.id, exp: expiresAt, role: 'authenticated' }]
    .map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.test-signature'
  const hash = new URLSearchParams({ access_token: accessToken, refresh_token: 'test-refresh', expires_in: '3600', expires_at: String(expiresAt), token_type: 'bearer', type: 'recovery' })
  browser(t, `https://icue.vn/newsroom/login#${hash}`)
  capturePasswordRecoveryUrl()
  const client = createClient('https://auth.example.invalid', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: true },
    global: { fetch: async (url, options) => {
      assert.equal(new URL(url).pathname, '/auth/v1/user')
      assert.equal(options.method, 'GET')
      return new Response(JSON.stringify(user), { headers: { 'Content-Type': 'application/json' } })
    } },
  })
  t.after(() => client.auth.stopAutoRefresh())
  const { error } = await client.auth.initialize()
  assert.equal(error, null)
  assert.equal(window.location.hash, '', 'the SDK has removed the recovery marker')
  assert.ok((await client.auth.getSession()).data.session)
  assert.equal(isPasswordRecoveryUrl(), true, 'the lazy modal must still show the new-password form')
  clearPasswordRecoveryUrl()
  assert.equal(isPasswordRecoveryUrl(), false, 'completing or closing recovery restores ordinary login')
})

test('recovery detection matches exact parameters and ignores unrelated URLs', t => {
  browser(t, 'https://icue.vn/newsroom/login?return_type=recovery#type=recovery-other')
  assert.equal(isPasswordRecoveryUrl(), false)
  window.location.search = '?type=recovery'
  assert.equal(isPasswordRecoveryUrl(), true)
  window.location.search = ''
  window.location.hash = '#type=signup'
  assert.equal(isPasswordRecoveryUrl(), false)
})
