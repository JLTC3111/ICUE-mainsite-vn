import test from 'node:test'
import assert from 'node:assert/strict'
import { React, act, create, deferred, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'

async function fixture(t, action = 'confirm', token = 'a'.repeat(64)) {
  silenceRenderer(t)
  const requests = [], languages = []
  let response = deferred(), policy = 'strict-origin-when-cross-origin'
  const document = { querySelector: () => ({ getAttribute: () => policy, setAttribute: (_name, value) => { policy = value } }) }
  const { default: Consent } = await sourceModule('news-app/src/pages/NewsletterConsent.jsx', {
    globals: {
      document,
      fetch: async (url, options) => { requests.push({ url, options }); return response.promise },
    },
    imports: {
      'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'vi', changeLanguage: lang => languages.push(lang) } }) },
      'react-router-dom': {
        useLocation: () => ({ search: `?action=${action}&token=${token}&locale=en` }),
        Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children),
      },
      '../lib/supabaseConfig': { loadSupabaseConfig: async () => ({ url: 'https://news.example', anonKey: 'public-key' }) },
    },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(Consent)) })
  t.after(() => unmount(renderer))
  return {
    renderer, requests, languages,
    get policy() { return policy },
    click: () => renderer.root.findByType('button').props.onClick(),
    reply(value) { response.resolve(value) },
    retry() { response = deferred() },
  }
}

for (const action of ['confirm', 'unsubscribe']) {
  test(`newsletter ${action} requires an explicit action and protects the token referrer`, async t => {
    const f = await fixture(t, action)
    assert.equal(f.requests.length, 0)
    assert.equal(f.policy, 'no-referrer')
    assert.deepEqual(f.languages, ['en'])
    let pending
    await act(async () => { pending = f.click(); await Promise.resolve(); await f.click() })
    assert.equal(f.requests.length, 1)
    const request = f.requests[0]
    assert.equal(new URL(request.url).searchParams.get('action'), action)
    assert.equal(new URL(request.url).searchParams.get('token'), 'a'.repeat(64))
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.headers.Accept, 'application/json')
    assert.equal(request.options.referrerPolicy, 'no-referrer')
    await act(async () => { f.reply({ ok: true, status: 200, json: async () => ({ ok: true }) }); await pending })
    assert.equal(f.renderer.root.findAllByType('button').length, 0)
    const text = JSON.stringify(f.renderer.toJSON())
    assert.ok(text.includes(action === 'confirm' ? 'newsletter.confirmedTitle' : 'newsletter.unsubscribedTitle'))
  })
}

test('newsletter consent retains a retry button after server errors and rejects expired links', async t => {
  const f = await fixture(t)
  let pending
  await act(async () => { pending = f.click(); f.reply({ ok: false, status: 503 }); await pending })
  assert.equal(f.renderer.root.findByProps({ role: 'alert' }).children.join(''), 'newsletter.consentError')
  assert.equal(f.renderer.root.findByType('button').props.disabled, false)
  f.retry()
  await act(async () => { pending = f.click(); f.reply({ ok: false, status: 400 }); await pending })
  assert.equal(f.requests.length, 2)
  assert.equal(f.renderer.root.findAllByType('button').length, 0)
  assert.ok(JSON.stringify(f.renderer.toJSON()).includes('newsletter.invalid'))
})

test('newsletter consent does not request invalid action or malformed token links', async t => {
  const badAction = await fixture(t, 'other')
  const badToken = await fixture(t, 'confirm', 'invalid-token')
  for (const f of [badAction, badToken]) {
    assert.equal(f.requests.length, 0)
    assert.equal(f.renderer.root.findAllByType('button').length, 0)
    assert.ok(JSON.stringify(f.renderer.toJSON()).includes('newsletter.invalid'))
  }
})
