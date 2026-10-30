import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { createPortal } = require('react-dom')

async function documentFixture(t, markup) {
  const dom = new JSDOM(markup, { pretendToBeVisual: true, url: 'https://vi.icue.vn/structure/' })
  const originals = new Map()
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const root = createRoot(dom.window.document.querySelector('main'))
  t.after(async () => {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  return { window: dom.window, document: dom.window.document, root }
}

test('People deep links select once and allow carousel navigation and later deep-link changes', async t => {
  silenceRenderer(t)
  let nav
  let language = 'en'
  const profiles = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]
  const { default: Carousel } = await sourceModule('people-app/src/components/ProfileCarousel.jsx', {
    globals: {
      window: new EventTarget(),
      sessionStorage: { getItem() { return null }, setItem() {} },
      Image: class {},
    },
    imports: {
      'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language } }) },
      './ProfilePanel': { default: () => null },
      './ProfilePhoto': { default: () => null },
      './ProfileNav': { default: props => { nav = props; return null } },
      '../hooks/useSwipe': { useSwipe: () => ({}) },
      '../lib/people': { localizePeople: (people, locale) => people.map(person => ({ ...person, name: `${person.name} ${locale}` })) },
    },
  })
  let renderer
  const render = async requestedProfileId => {
    const element = React.createElement(React.StrictMode, null, React.createElement(Carousel, { profiles, group: 'experts', requestedProfileId }))
    await act(async () => {
      if (renderer) renderer.update(element)
      else renderer = create(element)
    })
  }
  t.after(async () => { if (renderer) await unmount(renderer) })
  await render('b')
  assert.equal(nav.currentIndex, 1)
  await act(async () => nav.onNext())
  assert.equal(nav.currentIndex, 2)
  await act(async () => nav.onSelect(0))
  assert.equal(nav.currentIndex, 0)
  language = 'fr'
  await render('b')
  assert.equal(nav.currentIndex, 0, 'translating the same route must not reset the reader’s selection')
  await render('c')
  assert.equal(nav.currentIndex, 2, 'a different requested profile is still honored')
  await act(async () => nav.onPrev())
  assert.equal(nav.currentIndex, 1)
  await render('')
  await render('c')
  assert.equal(nav.currentIndex, 2, 'removing and reintroducing the deep link selects it again')
})

test('legacy entry-site cleanup retains locale, deep-link, theme, hash and router state', async t => {
  for (const [app, route] of [['people-app', 'people/experts'], ['structure-app', 'structure/'], ['ourwork-app', 'our-work/']]) {
    await t.test(app, async () => {
      const state = { retained: 'router state' }
      let replacements = 0
      const window = {
        location: new URL(`https://vi.icue.vn/${route}?lang=ja&site=en&profile=tran-quoc-toan&theme=dark#bio`),
        history: {
          state,
          replaceState(nextState, _, href) {
            replacements++
            this.state = nextState
            window.location = new URL(href, window.location)
          },
        },
      }
      const module = await sourceModule(`${app}/src/lib/siteOrigin.js`, { globals: { window } })
      module.cleanSiteParams()
      assert.equal(window.location.searchParams.get('lang'), 'ja')
      assert.equal(window.location.searchParams.has('site'), false)
      assert.equal(window.location.searchParams.get('profile'), 'tran-quoc-toan')
      assert.equal(window.location.searchParams.get('theme'), 'dark')
      assert.equal(window.location.hash, '#bio')
      assert.equal(window.history.state, state)
      assert.equal(replacements, 1)
      module.cleanSiteParams()
      assert.equal(replacements, 1, 'a locale-only URL needs no further rewriting')
    })
  }
})

test('inactive People profiles cannot add hidden links to the tab order', async t => {
  const f = await documentFixture(t, '<html><body><main></main></body></html>')
  const { default: Panel } = await sourceModule('people-app/src/components/ProfilePanel.jsx', {
    imports: {
      'react-i18next': { useTranslation: () => ({ t: key => key }) },
      '../contexts/InteractiveBackgroundContext': { useInteractiveBackgroundActive: () => false },
      './BorderGlow/BorderGlow': { default: ({ children }) => React.createElement('div', null, children) },
    },
  })
  const person = { name: 'Long Do', bio: 'Profile', links: [{ url: 'https://longd.tech/', label: 'Website' }] }
  const render = isActive => act(async () => f.root.render(React.createElement(Panel, { person, direction: 'right', isActive })))
  await render(false)
  assert.equal(f.document.querySelector('article').getAttribute('aria-hidden'), 'true')
  assert.equal(f.document.querySelector('article').hasAttribute('inert'), true)
  assert.equal(f.document.querySelector('a').tabIndex, -1)
  await render(true)
  assert.equal(f.document.querySelector('article').hasAttribute('inert'), false)
  assert.equal(f.document.querySelector('a').tabIndex, 0)
})

test('Structure profile modal contains focus and restores background state and invoking focus', async t => {
  const f = await documentFixture(t, '<html><body><button id="trigger">Open profile</button><div id="already-inert" inert></div><main></main></body></html>')
  f.document.body.style.overflow = 'clip'
  f.document.querySelector('#trigger').focus()
  const { default: Modal } = await sourceModule('structure-app/src/components/ProfileModal.jsx', {
    env: { BASE_URL: '/structure/' },
    globals: { window: f.window, document: f.document },
    imports: {
      'react-dom': { createPortal },
      'react-i18next': { useTranslation: () => ({ t: key => key }) },
      './ProfileCard/ProfileCard': { default: () => React.createElement('button', { 'data-card-action': true }, 'Contact') },
      './motion-primitives/AnimatedGroup': { AnimatedGroup: ({ children }) => React.createElement('div', null, children), animatedGroupCustomVariants2: {} },
    },
  })
  const calls = []
  function Host({ revision }) {
    const [open, setOpen] = React.useState(true)
    return React.createElement(Modal, { profile: open ? { id: 'test' } : null, onClose: () => { calls.push(revision); setOpen(false) } })
  }
  const render = revision => act(async () => f.root.render(React.createElement(React.StrictMode, null, React.createElement(Host, { revision }))))
  await render('first')
  const dialog = f.document.querySelector('[role="dialog"]')
  const close = dialog.querySelector('.profile-modal-close')
  const last = dialog.querySelector('[data-card-action]')
  assert.equal(f.document.activeElement, close)
  assert.equal(f.document.body.style.overflow, 'hidden')
  assert.equal(f.document.querySelector('main').hasAttribute('inert'), true)
  const key = async (value, options = {}) => {
    const event = new f.window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options })
    await act(async () => f.document.activeElement.dispatchEvent(event))
    return event
  }
  last.focus()
  assert.equal((await key('Tab')).defaultPrevented, true)
  assert.equal(f.document.activeElement, close)
  assert.equal((await key('Tab', { shiftKey: true })).defaultPrevented, true)
  assert.equal(f.document.activeElement, last)
  f.document.querySelector('#trigger').focus()
  assert.equal(dialog.contains(f.document.activeElement), true, 'even fallback browsers keep programmatic focus inside')
  last.focus()
  await render('latest')
  assert.equal(f.document.activeElement, last, 'an updated close callback must not restart focus management')
  const latePortal = f.document.createElement('button')
  await act(async () => {
    f.document.body.append(latePortal)
    await Promise.resolve()
  })
  assert.equal(latePortal.hasAttribute('inert'), true, 'deferred background portals also stay inert')
  assert.equal((await key('Escape')).defaultPrevented, true)
  assert.deepEqual(calls, ['latest'])
  assert.equal(f.document.querySelector('[role="dialog"]'), null)
  assert.equal(f.document.activeElement, f.document.querySelector('#trigger'))
  assert.equal(f.document.body.style.overflow, 'clip')
  assert.equal(f.document.querySelector('main').hasAttribute('inert'), false)
  assert.equal(latePortal.hasAttribute('inert'), false)
  assert.equal(f.document.querySelector('#already-inert').hasAttribute('inert'), true)
})
