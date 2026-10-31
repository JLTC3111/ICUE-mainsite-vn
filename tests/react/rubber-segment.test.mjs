import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')

async function fixture(t) {
  const dom = new JSDOM('<html><body><main></main></body></html>', { pretendToBeVisual: true, url: 'https://icue.test/' })
  const { window } = dom, { document } = window
  const originals = new Map()
  for (const [name, value] of Object.entries({ window, document })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  const media = Object.assign(new window.EventTarget(), { matches: false })
  window.matchMedia = () => media
  const frames = new Map()
  let now = 0, id = 0
  const raf = callback => { frames.set(++id, callback); return id }
  const cancel = id => frames.delete(id)
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    const siblings = [...(this.parentElement?.children || [])].filter(node => ['BUTTON', 'A'].includes(node.tagName))
    const index = siblings.indexOf(this)
    const left = index < 0 ? 0 : index * 100 + 3
    return { left, right: left + (index < 0 ? 306 : 100), top: 0, width: index < 0 ? 306 : 100, height: 38 }
  }
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 306 } })
  const globals = { window, document, performance: { now: () => now }, requestAnimationFrame: raf, cancelAnimationFrame: cancel }
  const { default: Segment } = await sourceModule('shared/ui/RubberSegment.jsx', { globals })
  const root = createRoot(document.querySelector('main'))
  t.after(async () => {
    await act(async () => root.unmount())
    assert.equal(frames.size, 0, 'all thumb animation work is released')
    dom.window.close()
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  })
  const render = props => act(async () => root.render(React.createElement(Segment, props)))
  const flush = async (count = 50) => act(async () => {
    for (let i = 0; i < count && frames.size; i++) {
      const callbacks = [...frames.values()]; frames.clear(); now += 16
      for (const callback of callbacks) callback(now)
    }
  })
  const pointer = async (target, type, values = {}) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true })
    for (const [name, value] of Object.entries({ pointerId: 1, button: 0, isPrimary: true, clientX: 50, clientY: 0, ...values })) Object.defineProperty(event, name, { value })
    await act(async () => target.dispatchEvent(event))
    return event
  }
  return { window, document, root, Segment, globals, media, frames, render, flush, pointer }
}

test('RubberSegment keeps controlled selection, native click and keyboard semantics, and skips disabled choices', async t => {
  const f = await fixture(t)
  const choices = [{ value: 'day', label: 'Day', id: 'day-tab', ariaControls: 'day-panel' }, { value: 'week', label: 'Week', disabled: true }, { value: 'year', label: 'Year' }]
  const calls = []
  let update
  function Host() {
    const [value, setValue] = React.useState('day')
    update = setValue
    return React.createElement(f.Segment, { items: choices, value, role: 'tablist', 'aria-label': 'Period', onChange: next => { calls.push(next); setValue(next) } })
  }
  await act(async () => f.root.render(React.createElement(Host)))
  const buttons = () => [...f.document.querySelectorAll('button')]
  assert.equal(buttons()[0].getAttribute('aria-controls'), 'day-panel')
  assert.equal(buttons()[1].disabled, true)
  buttons()[0].focus()
  await act(async () => buttons()[0].dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
  assert.deepEqual(calls, ['year'])
  assert.equal(f.document.activeElement, buttons()[2])
  assert.equal(buttons()[2].getAttribute('aria-selected'), 'true')
  assert.equal(buttons()[0].tabIndex, -1)
  await f.flush()
  assert.equal(f.document.querySelector('.rubber-segment').style.getPropertyValue('--rs-left'), '200px')
  await act(async () => update('day')); await f.flush()
  assert.equal(buttons()[0].getAttribute('aria-selected'), 'true', 'external route/state changes control the selection')
  await act(async () => buttons()[2].click())
  assert.deepEqual(calls, ['year', 'year'], 'native activation invokes exactly one callback')
})

test('RubberSegment drags once, rejects cancelled gestures, and leaves vertical scrolling native', async t => {
  const f = await fixture(t)
  const calls = []
  await f.render({ items: ['Day', 'Week', 'Year'], defaultValue: 'Day', glide: 0, onChange: value => calls.push(value) })
  const first = f.document.querySelector('button'), track = f.document.querySelector('.rubber-segment')
  await f.pointer(first, 'pointerdown')
  const vertical = await f.pointer(track, 'pointermove', { clientY: 40, clientX: 52 })
  assert.equal(vertical.defaultPrevented, false)
  await f.pointer(track, 'pointerup', { clientY: 40, clientX: 52 })
  assert.deepEqual(calls, [])
  await f.pointer(first, 'pointerdown')
  assert.equal((await f.pointer(track, 'pointermove', { clientX: 250 })).defaultPrevented, true)
  await f.pointer(track, 'pointercancel', { clientX: 250 })
  assert.deepEqual(calls, [])
  await f.flush()
  await f.pointer(first, 'pointerdown')
  await f.pointer(track, 'pointermove', { clientX: 250 })
  await f.pointer(track, 'pointerup', { clientX: 250 })
  await act(async () => first.click())
  assert.deepEqual(calls, ['Year'], 'dragging and its compatibility click do not switch twice')
  assert.equal(track.hasAttribute('data-held'), false)
})

test('RubberSegment settles immediately for live reduced motion and releases hidden-page work', async t => {
  const f = await fixture(t)
  await f.render({ items: ['Day', 'Week', 'Year'], defaultValue: 'Day' })
  await act(async () => f.document.querySelectorAll('button')[2].click())
  assert.ok(f.frames.size > 0)
  f.media.matches = true
  await act(async () => f.media.dispatchEvent(new f.window.Event('change')))
  assert.equal(f.frames.size, 0)
  await act(async () => f.document.querySelectorAll('button')[0].click())
  assert.equal(f.frames.size, 0)
  assert.equal(f.document.querySelector('.rubber-segment').style.getPropertyValue('--rs-left'), '0px')
})

test('hover never moves the selected thumb or previews a selection across navigation and toggle roles', async t => {
  const f = await fixture(t)
  const calls = []
  for (const [role, value] of [['navigation', 'one'], ['navigation', null], ['group', 'one'], ['tablist', 'one'], ['radiogroup', 'one']]) {
    await f.render({ role, value, items: [
      { value: 'one', label: 'One', href: role === 'navigation' ? '#one' : undefined },
      { value: 'two', label: 'Two', href: role === 'navigation' ? '#two' : undefined },
    ], onChange: next => calls.push(next) })
    await f.flush()
    const track = f.document.querySelector('.rubber-segment')
    const controls = [...track.querySelectorAll('a, button')]
    const before = track.style.cssText
    const selection = controls.map(control => [control.getAttribute('aria-current'), control.getAttribute('aria-pressed'), control.getAttribute('aria-selected'), control.getAttribute('aria-checked')])
    await f.pointer(controls[1], 'pointerover', { pointerType: 'mouse', relatedTarget: null })
    await f.flush()
    assert.equal(track.hasAttribute('data-preview'), false, `${role}: hovering must not imitate an active selection`)
    assert.equal(track.style.cssText, before, `${role}: the thumb stays on the selected destination`)
    assert.deepEqual(controls.map(control => [control.getAttribute('aria-current'), control.getAttribute('aria-pressed'), control.getAttribute('aria-selected'), control.getAttribute('aria-checked')]), selection)
    await f.pointer(controls[1], 'pointerout', { pointerType: 'mouse', relatedTarget: f.document.body })
    await f.flush()
    assert.equal(track.style.cssText, before, `${role}: leaving does not animate an unrequested selection`)
  }
  assert.deepEqual(calls, [], 'hover cannot invoke navigation, filter, or toggle callbacks')
})

test('RubberSegment navigation preserves anchors, modified clicks and disabled destinations', async t => {
  const f = await fixture(t)
  const calls = []
  await f.render({ role: 'navigation', 'aria-label': 'Sections', value: 'one', items: [
    { value: 'one', label: 'One', href: '#one' }, { value: 'two', label: 'Two', href: '#two' }, { value: 'three', label: 'Three', href: '#three', disabled: true },
  ], onChange: value => calls.push(value) })
  const links = f.document.querySelectorAll('a')
  assert.equal(links[0].getAttribute('aria-current'), 'page')
  assert.equal(links[1].getAttribute('href'), '#two')
  assert.equal(links[1].tabIndex, 0)
  assert.equal(links[2].hasAttribute('href'), false)
  await act(async () => links[1].dispatchEvent(new f.window.MouseEvent('click', { bubbles: true, ctrlKey: true, button: 0 })))
  assert.deepEqual(calls, [])
  await act(async () => links[1].click())
  assert.deepEqual(calls, ['two'])
})

test('People section segments keep router navigation and the customized HR action', async t => {
  const f = await fixture(t)
  const Empty = () => null, paths = []
  const { default: Shell } = await sourceModule('people-app/src/components/PageShell.jsx', {
    globals: f.globals, env: { BASE_URL: '/people/' }, imports: {
      'react-router-dom': { useLocation: () => ({ pathname: '/experts' }), useNavigate: () => path => paths.push(path) },
      'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'en' } }) },
      '@icue/contact-sidebar/DeferredContactSidebar': { default: Empty },
      '../../../shared/ui/usePageTheme.js': { default: () => ({ isDark: true }) },
      './Header': { default: Empty }, './Footer': { default: Empty }, './InteractiveBackground/InteractiveBackground': { default: Empty },
      './ShimmerButton/ShimmerButton': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    },
  })
  await act(async () => f.root.render(React.createElement(Shell, { pageKey: 'experts', showHrLink: true, showBackgroundToggle: true, backgroundEnabled: true })))
  const links = f.document.querySelectorAll('.rubber-segment a')
  assert.equal(links[0].getAttribute('href'), '/people/experts')
  assert.equal(links[0].getAttribute('aria-current'), 'page')
  const track = f.document.querySelector('.rubber-segment')
  const selectedPosition = track.style.cssText
  await f.pointer(links[1], 'pointerover', { pointerType: 'mouse', relatedTarget: null })
  await f.flush()
  assert.deepEqual(paths, [], 'hovering Staff does not navigate away from Experts')
  assert.equal(track.style.cssText, selectedPosition, 'Experts stays highlighted until Staff is activated')
  await act(async () => links[1].dispatchEvent(new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })))
  assert.deepEqual(paths, ['/core-team'])
  assert.equal(f.document.querySelector('.page-shell__hr-link').getAttribute('href'), 'https://hr.icue.vn')
  assert.equal(f.document.querySelector('.page-shell__hr-label').className, 'page-shell__hr-label shimmer')
})
