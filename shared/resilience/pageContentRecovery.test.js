import test from 'node:test'
import assert from 'node:assert/strict'
import { React, act, create, platform, sourceModule, silenceRenderer, unmount } from './testHarness.js'

for (const app of ['faq-app', 'recruitment-app']) {
  test(`${app} boots with denied session storage and keeps the language and fragment`, async () => {
    const f = platform()
    f.window.location.search = '?lang=ja&site=en&test=1'
    f.window.location.pathname = '/fixture'
    f.window.location.hash = '#section'
    let nextUrl
    f.window.history.replaceState = (_state, _unused, url) => { nextUrl = url }
    const mod = await sourceModule(`${app}/src/lib/siteOrigin.js`, {
      globals: { ...f, sessionStorage: { getItem() { throw new Error('Denied') }, setItem() { throw new Error('Denied') } } },
    })
    assert.equal(mod.detectEntrySite(), 'en')
    mod.cleanSiteParams()
    assert.equal(nextUrl, '/fixture?lang=ja&test=1#section')
  })
}

async function reveal(t, { observer = true } = {}) {
  silenceRenderer(t)
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const f = platform()
  let callback, disconnects = 0, visible
  const mod = await sourceModule('shared/resilience/useRevealOnce.js', { globals: {
    ...f,
    ...(observer ? { IntersectionObserver: class {
      constructor(cb) { callback = cb }
      observe() {}
      disconnect() { disconnects++ }
    } } : {}),
  } })
  function Fixture() {
    const ref = React.useRef({})
    visible = mod.useRevealOnce(ref)
    return null
  }
  let renderer
  await act(async () => { renderer = create(React.createElement(Fixture)) })
  return { ...f, renderer, visible: () => visible, callback: () => callback, disconnects: () => disconnects }
}

test('content becomes visible when a viewport observer never fires', async t => {
  const f = await reveal(t)
  assert.equal(f.visible(), false)
  await act(async () => t.mock.timers.tick(2000))
  assert.equal(f.visible(), true)
  assert.ok(f.disconnects() > 0)
  await unmount(f.renderer)
})

test('restored content becomes visible even offline and observers clean up', async t => {
  const f = await reveal(t)
  f.navigator.onLine = false
  await act(async () => f.window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true })))
  assert.equal(f.visible(), true)
  await unmount(f.renderer)
})

test('content stays readable when IntersectionObserver is unavailable', async t => {
  const f = await reveal(t, { observer: false })
  assert.equal(f.visible(), true)
  await unmount(f.renderer)
})

test('an expanded FAQ answer survives phone rotation into the desktop layout', async t => {
  silenceRenderer(t)
  const f = platform()
  const media = Object.assign(new EventTarget(), { matches: true })
  f.window.matchMedia = () => media
  const mod = await sourceModule('faq-app/src/components/FaqAccordion.jsx', { globals: f, imports: {
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '../data/categoryIcons': { CATEGORY_ICONS: {} },
  } })
  let renderer
  await act(async () => { renderer = create(React.createElement(mod.default, { categories: [{ key: 'test', label: 'Category', entries: [{ q: 'Question', a: 'Answer' }] }] })) })
  await act(async () => renderer.root.findByType('button').props.onClick())
  await act(async () => renderer.root.findAllByType('button')[1].props.onClick())
  assert.equal(renderer.root.findAllByProps({ className: 'fq-answer__body' }).length, 1)
  await act(async () => { media.matches = false; media.dispatchEvent(Object.assign(new Event('change'), { matches: false })) })
  assert.equal(renderer.root.findAllByProps({ className: 'fq-answer__body' }).length, 1)
  await unmount(renderer)
})
