import test from 'node:test'
import assert from 'node:assert/strict'
import { React, act, create, deferred, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'

async function fixture(t) {
  silenceRenderer(t)
  const requests = []
  let config = { url: 'https://news.example', anonKey: 'public-key' }
  let response = deferred()
  let resets = 0
  const form = { reportValidity: () => true, reset: () => { resets++ }, email: ' reader@example.com ', website: '' }
  const { default: Subscribe } = await sourceModule('news-app/src/components/NewsletterSubscribe.jsx', {
    globals: {
      FormData: class { constructor(form) { this.form = form } get(key) { return this.form[key] } },
      fetch: async (url, options) => { requests.push({ url, options }); return response.promise },
    },
    imports: {
      'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'en-US' } }) },
      '../lib/supabaseConfig': { loadSupabaseConfig: async () => config },
    },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(Subscribe)) })
  t.after(() => unmount(renderer))
  return {
    renderer, requests, form,
    get resets() { return resets },
    submit: () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {}, currentTarget: form }),
    reply(value) { response.resolve(value) },
    retry() { response = deferred() },
    noConfig() { config = null },
  }
}

test('newsletter waits for confirmation delivery, blocks duplicate submits, and sends public credentials only', async t => {
  const f = await fixture(t)
  let pending
  await act(async () => { pending = f.submit(); await Promise.resolve(); await f.submit() })
  assert.equal(f.requests.length, 1)
  assert.equal(f.renderer.root.findByType('button').props.disabled, true)
  assert.equal(f.renderer.root.findByProps({ name: 'email' }).props.type, 'email')
  assert.equal(f.renderer.root.findByProps({ name: 'email' }).props.required, true)
  assert.equal(f.resets, 0)
  const request = f.requests[0]
  assert.equal(request.url, 'https://news.example/functions/v1/newsletter')
  assert.equal(request.options.headers.apikey, 'public-key')
  assert.deepEqual(JSON.parse(request.options.body), { email: 'reader@example.com', locale: 'en', website: '' })
  await act(async () => { f.reply({ ok: true, status: 200, json: async () => ({ ok: true }) }); await pending })
  assert.equal(f.resets, 1)
  assert.equal(f.renderer.root.findByType('button').props.disabled, false)
  assert.equal(f.renderer.root.findByProps({ role: 'status' }).children.join(''), 'newsletter.success')
})

test('newsletter keeps the address and allows retry after rate limits or delivery errors', async t => {
  const f = await fixture(t)
  let pending
  await act(async () => { pending = f.submit(); f.reply({ ok: false, status: 429 }); await pending })
  assert.equal(f.resets, 0)
  assert.equal(f.renderer.root.findByProps({ role: 'alert' }).children.join(''), 'newsletter.rateLimited')
  f.retry()
  await act(async () => { pending = f.submit(); f.reply({ ok: false, status: 503 }); await pending })
  assert.equal(f.requests.length, 2)
  assert.equal(f.resets, 0)
  assert.equal(f.renderer.root.findByProps({ role: 'alert' }).children.join(''), 'newsletter.error')
  assert.equal(f.renderer.root.findByType('button').props.disabled, false)
})

test('newsletter does not make an unconfigured or invalid request', async t => {
  const f = await fixture(t)
  f.form.reportValidity = () => false
  await act(async () => { await f.submit() })
  assert.equal(f.requests.length, 0)
  f.form.reportValidity = () => true
  f.noConfig()
  await act(async () => { await f.submit() })
  assert.equal(f.requests.length, 0)
  assert.equal(f.renderer.root.findByProps({ role: 'alert' }).children.join(''), 'newsletter.error')
})
