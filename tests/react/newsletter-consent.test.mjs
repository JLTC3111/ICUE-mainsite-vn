import test from 'node:test'
import assert from 'node:assert/strict'
import { React, act, create, deferred, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'

async function fixture(t, action = 'confirm', token = 'a'.repeat(64)) {
  silenceRenderer(t)
  const requests = [], languages = []
  let response = deferred(), policy = 'strict-origin-when-cross-origin'
  let language = 'vi', search = `?action=${action}&token=${token}&locale=en`
  const changeLanguage = lang => { languages.push(lang); language = lang; return Promise.resolve() }
  const document = { querySelector: () => ({ getAttribute: () => policy, setAttribute: (_name, value) => { policy = value } }) }
  const { default: Consent } = await sourceModule('news-app/src/pages/NewsletterConsent.jsx', {
    globals: {
      document,
      fetch: async (url, options) => { requests.push({ url, options }); return response.promise },
    },
    imports: {
      // React-i18next 17 returns a new i18n wrapper on language changes.
      // Returning a fresh wrapper models that dependency boundary.
      'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: language, changeLanguage } }) },
      'react-router-dom': {
        useLocation: () => ({ search }),
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
    get language() { return language },
    get policy() { return policy },
    click: () => renderer.root.findByType('button').props.onClick(),
    reply(value) { response.resolve(value) },
    retry() { response = deferred() },
    async selectLanguage(next) {
      await act(async () => { await changeLanguage(next); renderer.update(React.createElement(Consent)) })
    },
    async navigate(next) {
      search = next
      await act(async () => { renderer.update(React.createElement(Consent)) })
    },
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

test('the email locale does not override language selections after newsletter confirmation', async t => {
  const f = await fixture(t)
  let pending
  await act(async () => {
    pending = f.click()
    f.reply({ ok: true, status: 200, json: async () => ({ ok: true }) })
    await pending
  })
  for (const language of ['vi', 'de', 'fr', 'ja', 'ko', 'en']) {
    const before = f.languages.length
    await f.selectLanguage(language)
    assert.equal(f.language, language, `the selector keeps ${language} despite locale=en on the email URL`)
    assert.deepEqual(f.languages.slice(before), [language], 'the page does not request the email locale again')
    assert.equal(f.renderer.root.findAllByType('button').length, 0, 'changing language keeps the confirmed result')
    assert.ok(JSON.stringify(f.renderer.toJSON()).includes('newsletter.confirmedTitle'))
  }
  assert.equal(f.requests.length, 1, 'language changes do not repeat the consent write')
})

test('language selection before confirmation survives the request and a new email link applies its own hint once', async t => {
  const f = await fixture(t)
  await f.selectLanguage('fr')
  let pending
  await act(async () => { pending = f.click(); await Promise.resolve() })
  assert.equal(f.language, 'fr', 'request rerenders respect the selected language')
  await act(async () => { f.reply({ ok: true, status: 200, json: async () => ({ ok: true }) }); await pending })
  assert.equal(f.language, 'fr')
  await f.navigate(`?action=confirm&token=${'b'.repeat(64)}&locale=ko`)
  assert.equal(f.language, 'ko', 'a different email link can supply a fresh initial locale')
  assert.equal(f.requests.length, 1, 'opening the next email still requires explicit consent')
  await f.selectLanguage('ja')
  assert.equal(f.language, 'ja', 'the new email locale is also consumed only once')
})
