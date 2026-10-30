import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { createPortal } = require('react-dom')

async function fixture(t, mode = 'panel', { alreadyOpen = false, reducedMotion = true } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div><main><a id="background" href="/background">Page content</a></main></body></html>', {
    pretendToBeVisual: true, url: 'https://vi.icue.test/',
  })
  const { window } = dom, { document } = window
  const originals = new Map()
  for (const [name, value] of Object.entries({ window, document })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  const frames = new Map()
  let nextFrame = 0
  window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame }
  window.cancelAnimationFrame = id => frames.delete(id)
  const timers = new Map()
  let now = 0, nextTimer = 0
  window.setTimeout = (callback, delay = 0) => {
    timers.set(++nextTimer, { callback, at: now + delay })
    return nextTimer
  }
  window.clearTimeout = id => timers.delete(id)
  const motionListeners = new Set()
  const motionQuery = {
    get matches() { return reducedMotion },
    addEventListener: (_, callback) => motionListeners.add(callback),
    removeEventListener: (_, callback) => motionListeners.delete(callback),
  }
  window.matchMedia = query => query.includes('prefers-reduced-motion') ? motionQuery : { matches: false }
  document.body.style.overflow = 'clip'
  if (alreadyOpen) document.body.classList.add('nav-drawer-open')
  const globals = {
    window, document,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
  }
  const { default: DrawerMenuPanel } = await sourceModule('shared/drawer-menu/DrawerMenuPanel.jsx', { globals, imports: {
    'react-dom': { createPortal },
    './useDrawerResize': { default() {} },
    './useLineSidebarProximity': { useLineSidebarProximity: () => ({
      navRef: React.useRef(null), handlePointerMove() {}, handlePointerLeave() {},
    }) },
  } })
  const changes = []
  function Host({ revision }) {
    const [open, setOpen] = React.useState(false)
    const [peopleOpen, setPeopleOpen] = React.useState(false)
    const [languageOpen, setLanguageOpen] = React.useState(false)
    const close = event => { event.preventDefault(); setOpen(false) }
    const links = [
      { key: 'home', href: '/?lang=fr', label: revision === 'latest' ? 'Accueil mis à jour' : 'Accueil', index: 1, isCurrent: true, onClick: close },
      { key: 'structure', href: '/structure/?lang=fr', label: 'Organisation & Structure', index: 2, onClick: close },
    ]
    const people = {
      label: 'Notre équipe', index: 3, open: peopleOpen, onToggle: () => setPeopleOpen(value => !value),
      items: [
        { key: 'experts', href: '/people/experts?lang=fr', label: 'Nos experts', onClick: close },
        { key: 'team', href: '/people/core-team?lang=fr', label: 'Équipe principale', onClick: close },
      ],
    }
    const panel = React.createElement(DrawerMenuPanel, {
      links, people, open, onOpenChange: value => { changes.push(revision); setOpen(value) },
      showToggle: mode !== 'main', showClose: mode === 'panel', morphToggle: mode === 'work',
      portal: mode !== 'main', drawerId: 'drawerMenu', menuToggleId: 'menuToggle',
      menuLabel: 'Menu', closeLabel: 'Close menu',
    })
    const language = React.createElement(React.Fragment, null,
      React.createElement('button', { id: 'language', onClick: () => setLanguageOpen(value => !value) }, 'Language'),
      languageOpen ? React.createElement('button', { id: 'french' }, 'Français') : null,
    )
    if (mode === 'main') return React.createElement('div', { className: 'main-site-nav' },
      React.createElement('nav', { className: 'main-site-nav__bar' },
        React.createElement('button', { id: 'menuToggle', onClick: () => setOpen(value => !value) }, 'Menu'), language,
      ), panel,
    )
    if (mode === 'work') return React.createElement('header', null,
      React.createElement('a', { id: 'brand', href: '/' }, 'ICUE'), language, panel,
    )
    return panel
  }
  const root = createRoot(document.getElementById('app'))
  let mounted = true
  const render = async revision => act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Host, { revision }))))
  const unmount = async () => { if (mounted) { mounted = false; await act(async () => root.unmount()) } }
  t.after(async () => {
    await unmount()
    window.close()
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  })
  const flush = async () => act(async () => {
    for (let i = 0; i < 20 && frames.size; i++) {
      const pending = [...frames.values()]; frames.clear()
      for (const callback of pending) callback(i * 16)
    }
  })
  const flushFrame = async () => act(async () => {
    const pending = [...frames.values()]; frames.clear()
    for (const callback of pending) callback(window.performance.now())
  })
  const advance = async milliseconds => act(async () => {
    const end = now + milliseconds
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
      if (!next) break
      const [id, timer] = next
      now = timer.at
      timers.delete(id)
      timer.callback()
    }
    now = end
  })
  const setReducedMotion = async value => act(async () => {
    reducedMotion = value
    motionListeners.forEach(callback => callback(motionQuery))
  })
  const click = async (element, settle = true) => {
    await act(async () => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })))
    if (settle) await flush()
  }
  const key = async (value, options = {}) => {
    const event = new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options })
    await act(async () => document.activeElement.dispatchEvent(event))
    return event
  }
  await render('first')
  return {
    document, window, root, changes, render, unmount, click, key, flush, flushFrame, advance, setReducedMotion,
    pendingFrames: () => frames.size,
    pendingTimers: () => timers.size,
    drawer: () => document.getElementById('drawerMenu'),
    trigger: () => mode === 'main' ? document.getElementById('menuToggle') : document.querySelector('.nav-drawer__toggle'),
    open: async () => click(mode === 'main' ? document.getElementById('menuToggle') : document.querySelector('.nav-drawer__toggle')),
  }
}

test('shared drawer contains focus, skips collapsed People links, and restores its trigger and original scrolling', async t => {
  const f = await fixture(t)
  const drawer = f.drawer()
  assert.equal(drawer.hasAttribute('aria-hidden'), false, 'inert hides the closed drawer without hiding its focused descendant during close')
  assert.equal(drawer.hasAttribute('inert'), true)
  await f.open()
  const close = drawer.querySelector('.nav-drawer__close')
  const people = drawer.querySelector('.nav-drawer__submenu-toggle')
  assert.equal(f.document.activeElement, close)
  assert.equal(f.document.body.style.overflow, 'hidden')
  assert.equal(drawer.querySelector('[aria-current="page"]').getAttribute('href'), '/?lang=fr')
  await f.key('Tab', { shiftKey: true })
  assert.equal(f.document.activeElement, people, 'collapsed sub-links are absent from keyboard navigation')
  await f.key('Tab')
  assert.equal(f.document.activeElement, close)
  f.document.getElementById('background').focus()
  assert.equal(f.document.activeElement, close, 'programmatic focus cannot escape behind the full-screen panel')
  people.focus()
  await f.render('latest')
  assert.equal(f.document.activeElement, people, 'updated content and callbacks do not restart autofocus')
  assert.equal((await f.key('Escape')).defaultPrevented, true)
  assert.deepEqual(f.changes, ['first', 'latest'], 'Escape uses the latest controlled callback')
  assert.equal(f.document.activeElement, f.trigger())
  assert.equal(f.document.body.style.overflow, 'clip')
  assert.equal(f.document.body.classList.contains('nav-drawer-open'), false)
  assert.equal(drawer.hasAttribute('inert'), true)
})

test('main-site drawer keeps its external header close and language controls within the foreground', async t => {
  const f = await fixture(t, 'main')
  await f.open()
  const firstLink = f.drawer().querySelector('a')
  assert.equal(f.document.activeElement, firstLink)
  assert.equal(f.document.body.style.overflow, 'clip', 'the main-site parent retains ownership of its scroll lock')
  const language = f.document.getElementById('language')
  await f.click(language)
  assert.equal(f.drawer().hasAttribute('inert'), false)
  const french = f.document.getElementById('french')
  french.focus()
  assert.equal(f.document.activeElement, french)
  await f.key('Tab')
  assert.equal(f.document.activeElement, firstLink)
  await f.key('Escape')
  assert.equal(f.document.activeElement, f.trigger())
  assert.equal(f.document.body.style.overflow, 'clip')
})

test('Our Work morphing header toggle stays reachable across a portalled drawer without visiting background links', async t => {
  const f = await fixture(t, 'work', { alreadyOpen: true })
  await f.open()
  assert.equal(f.drawer().parentElement, f.document.body)
  const firstLink = f.drawer().querySelector('a')
  f.trigger().focus()
  await f.key('Tab')
  assert.equal(f.document.activeElement, firstLink)
  const people = f.drawer().querySelector('.nav-drawer__submenu-toggle')
  people.focus()
  await f.key('Tab')
  assert.equal(f.document.activeElement, f.document.getElementById('brand'))
  await f.key('Tab', { shiftKey: true })
  assert.equal(f.document.activeElement, people)
  await f.click(people)
  assert.equal(people.getAttribute('aria-expanded'), 'true')
  const experts = f.drawer().querySelector('a[href="/people/experts?lang=fr"]')
  people.focus()
  await f.key('Tab')
  assert.equal(f.document.activeElement, experts)
  await f.click(experts)
  assert.equal(f.drawer().hasAttribute('inert'), true)
  assert.equal(f.document.activeElement, f.trigger())
  assert.equal(f.document.body.style.overflow, 'clip')
  assert.equal(f.document.body.classList.contains('nav-drawer-open'), true, 'a pre-existing drawer state class is preserved')
})

test('closing before autofocus or unmounting removes pending focus work and document guards', async t => {
  const f = await fixture(t)
  await f.click(f.trigger(), false)
  await f.click(f.drawer().querySelector('.nav-drawer__close'), false)
  await f.flush()
  assert.equal(f.document.activeElement, f.trigger(), 'a queued opening frame cannot focus a closed drawer')
  await f.open()
  await f.unmount()
  await f.flush()
  const background = f.document.getElementById('background')
  background.focus()
  assert.equal(f.document.activeElement, background)
  assert.equal(f.document.body.style.overflow, 'clip')
})

test('focus return waits for the fading toggle and never steals focus after another action, reopen, or unmount', async t => {
  const f = await fixture(t)
  const trigger = f.trigger()
  await f.open()
  trigger.style.visibility = 'hidden'
  await f.key('Escape')
  await f.flushFrame()
  assert.notEqual(f.document.activeElement, trigger, 'the closed-state CSS can still hide the fading toggle')
  trigger.style.visibility = 'visible'
  await f.flush()
  assert.equal(f.document.activeElement, trigger, 'focus returns after the browser makes the toggle visible')

  await f.open()
  trigger.style.visibility = 'hidden'
  await f.key('Escape')
  const background = f.document.getElementById('background')
  background.focus()
  trigger.style.visibility = 'visible'
  await f.flush()
  assert.equal(f.document.activeElement, background, 'a later reader or route focus choice takes precedence')

  await f.open()
  trigger.style.visibility = 'hidden'
  await f.key('Escape')
  let restorationCalls = 0
  const focus = trigger.focus.bind(trigger)
  trigger.focus = options => { restorationCalls++; focus(options) }
  trigger.style.visibility = 'visible'
  await f.click(trigger)
  assert.equal(f.document.activeElement, f.drawer().querySelector('.nav-drawer__close'))
  assert.equal(restorationCalls, 0, 'reopening cancels a pending return to the toggle')

  trigger.style.visibility = 'hidden'
  await f.key('Escape')
  assert.ok(f.pendingFrames() > 0)
  await f.unmount()
  assert.equal(f.pendingFrames(), 0, 'unmount removes delayed focus work')
  background.focus()
  await f.flush()
  assert.equal(f.document.activeElement, background)
})

test('focus return survives a full toggle transition and a late browser blur, then stops watching', async t => {
  const f = await fixture(t)
  const trigger = f.trigger()
  const transition = propertyName => {
    const event = new f.window.Event('transitionend', { bubbles: true })
    Object.defineProperty(event, 'propertyName', { value: propertyName })
    trigger.dispatchEvent(event)
  }
  await f.open()
  trigger.style.visibility = 'hidden'
  await f.key('Escape')
  await f.flush()
  assert.notEqual(f.document.activeElement, trigger, 'the toggle can remain hidden beyond both paint frames')

  trigger.style.visibility = 'visible'
  transition('opacity')
  assert.equal(f.document.activeElement, trigger, 'the completed fade restores focus')
  trigger.blur()
  transition('visibility')
  assert.equal(f.document.activeElement, trigger, 'a later visibility update can repair a browser blur after apparent success')

  trigger.blur()
  await f.advance(450)
  assert.equal(f.document.activeElement, trigger, 'the bounded fallback repairs late blur even without another transition event')
  trigger.blur()
  transition('opacity')
  assert.equal(f.document.activeElement, f.document.body, 'restoration stops after the transition deadline')
})

test('the closing drawer retains its foreground and scroll lock until exit, cancels a stale exit on reopen, and honours reduced motion', async t => {
  const f = await fixture(t, 'work', { reducedMotion: false })
  const drawer = f.drawer()
  await f.open()
  await f.key('Escape')
  assert.equal(drawer.classList.contains('is-closing'), true)
  assert.equal(drawer.hasAttribute('inert'), false, 'keyboard focus stays in the foreground during the closing animation')
  assert.equal(f.document.body.style.overflow, 'hidden')
  assert.equal(f.document.body.classList.contains('nav-drawer-open'), true, 'the morphing header remains above the closing panel')
  await f.advance(400)
  assert.equal(drawer.classList.contains('is-closing'), true, 'the panel remains present while its X finishes fading')
  await f.click(f.trigger())
  await f.advance(1000)
  assert.equal(drawer.classList.contains('is-open'), true, 'a previous exit cannot hide a reopened menu')
  assert.equal(f.document.body.style.overflow, 'hidden')

  await f.key('Escape')
  const endTransition = async target => act(async () => {
    const event = new f.window.Event('transitionend', { bubbles: true })
    Object.defineProperty(event, 'propertyName', { value: 'transform' })
    target.dispatchEvent(event)
  })
  await endTransition(f.trigger().querySelector('svg'))
  assert.equal(drawer.classList.contains('is-closing'), true, 'the X finishing its spin cannot end the panel exit')
  await endTransition(drawer)
  assert.equal(drawer.classList.contains('is-closing'), false)
  assert.equal(drawer.hasAttribute('inert'), true)
  assert.equal(f.document.activeElement, f.trigger())
  assert.equal(f.document.body.style.overflow, 'clip')
  assert.equal(f.document.body.classList.contains('nav-drawer-open'), false)

  await f.open()
  await f.key('Escape')
  await f.advance(1000)
  assert.equal(drawer.hasAttribute('inert'), true, 'a dropped transition event cannot leave the menu blocking the page')

  await f.open()
  await f.key('Escape')
  await f.setReducedMotion(true)
  assert.equal(drawer.classList.contains('is-closing'), false, 'switching to reduced motion finishes an in-progress close immediately')
  assert.equal(drawer.hasAttribute('inert'), true)
  assert.equal(f.document.body.style.overflow, 'clip')
  await f.advance(1000)
  assert.equal(f.pendingTimers(), 0)

  await f.setReducedMotion(false)
  await f.open()
  await f.key('Escape')
  await f.unmount()
  assert.equal(f.pendingTimers(), 0, 'unmount cancels the pending exit and focus timers')
  assert.equal(f.document.body.style.overflow, 'clip')
})
