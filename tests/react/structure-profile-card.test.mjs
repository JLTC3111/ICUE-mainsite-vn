import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')

async function cardFixture(t, { reduced = false } = {}) {
  const dom = new JSDOM('<html><body><main></main></body></html>', { pretendToBeVisual: true })
  const { window } = dom
  const globals = new Map()
  for (const [key, value] of Object.entries({ window, document: window.document })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const motionQuery = Object.assign(new window.EventTarget(), { matches: reduced })
  window.matchMedia = () => motionQuery
  Object.defineProperties(window.HTMLElement.prototype, {
    offsetWidth: { configurable: true, get: () => 340 },
    offsetHeight: { configurable: true, get: () => 470 },
  })
  window.HTMLElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 340, height: 470 })
  let clock = 0
  let nextFrame = 1
  const frames = new Map()
  const requestAnimationFrame = callback => { const id = nextFrame++; frames.set(id, callback); return id }
  const cancelAnimationFrame = id => frames.delete(id)
  const { default: Card } = await sourceModule('structure-app/src/components/ProfileCard/ProfileCard.jsx', {
    globals: { window, requestAnimationFrame, cancelAnimationFrame, performance: { now: () => clock } },
  })
  const root = createRoot(window.document.querySelector('main'))
  let mounted = true
  const unmount = async () => {
    if (mounted) await act(async () => root.unmount())
    mounted = false
  }
  t.after(async () => {
    await unmount()
    window.close()
    for (const [key, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  return {
    window, motionQuery, frames, unmount,
    get card() { return window.document.querySelector('.profile-card') },
    render: props => act(async () => root.render(React.createElement(React.StrictMode, null,
      React.createElement(Card, { name: 'ICUE Staff', title: 'Researcher', avatarUrl: '/staff.png', ...props })))),
    pointer(type, data) {
      const event = Object.assign(new window.Event(type, { bubbles: true }), { pointerType: 'mouse', ...data })
      this.card.dispatchEvent(event)
    },
    settle() {
      for (let count = 0; frames.size && count < 1000; count++) {
        clock += 16
        const batch = [...frames.values()]
        frames.clear()
        for (const callback of batch) callback(clock)
      }
      assert.equal(frames.size, 0, 'the card stops requesting frames once it settles')
    },
  }
}

test('updated Structure profile card displays staff immediately and supports the requested settings and close action', async t => {
  const f = await cardFixture(t)
  let closes = 0
  await f.render({
    handle: 'icue-staff', status: 'ICUE', contactText: 'Đóng', onContactClick: () => closes++,
    holo: 0.8, glare: 0.5, tiltStrength: 12, parallax: 8, radius: 16,
    intro: true, theme: 'dark', iconUrl: '/pattern.png',
  })
  assert.equal(f.card.querySelector('h3').textContent, 'ICUE Staff')
  assert.equal(f.card.querySelector('.profile-card__title').textContent, 'Researcher')
  assert.equal(f.card.querySelector('.profile-card__photo').getAttribute('src'), '/staff.png')
  assert.equal(f.card.style.getPropertyValue('--pc-radius'), '16px')
  assert.equal(f.card.style.getPropertyValue('--pc-holo'), '0.8')
  assert.equal(f.card.style.getPropertyValue('--pc-glare'), '0.5')
  assert.equal(f.card.style.getPropertyValue('--pc-parallax'), '8px')
  assert.equal(f.card.style.getPropertyValue('--pc-rotate-x'), '-6.600deg', 'intro tilts an already visible card')
  assert.equal(f.card.style.opacity, '', 'opening a profile does not wait for a visibility animation')
  const action = f.card.querySelector('button')
  assert.equal(action.getAttribute('aria-label'), 'Đóng ICUE Staff')
  await act(async () => action.click())
  assert.equal(closes, 1)
  f.settle()
  f.pointer('pointerenter', { clientX: 340, clientY: 0 })
  f.settle()
  assert.equal(Number.parseFloat(f.card.style.getPropertyValue('--pc-rotate-x')), -12)
  assert.equal(Number.parseFloat(f.card.style.getPropertyValue('--pc-rotate-y')), -12)
  assert.equal(Number.parseFloat(f.card.style.getPropertyValue('--pc-shift-x')), 8)
  await f.render({ intro: false, enableTilt: false, holo: 0, glare: 0, theme: 'light', showUserInfo: false })
  assert.equal(f.card.querySelector('.profile-card__footer'), null)
  assert.equal(f.card.style.getPropertyValue('--pc-ink'), '#27272a')
  assert.equal(Number.parseFloat(f.card.style.getPropertyValue('--pc-rotate-x')), 0)
  assert.equal(Number.parseFloat(f.card.style.getPropertyValue('--pc-shift-x')), 0)
})

test('Structure profile card honors reduced motion and cancels animation when the preference changes', async t => {
  const f = await cardFixture(t, { reduced: true })
  await f.render({ intro: true })
  assert.equal(f.frames.size, 0)
  f.pointer('pointerenter', { clientX: 340, clientY: 0 })
  assert.equal(f.frames.size, 0, 'reduced-motion pointer updates do not schedule spring animation')
  assert.equal(Number.parseFloat(f.card.style.getPropertyValue('--pc-rotate-x')), 0)
  assert.equal(Number.parseFloat(f.card.style.getPropertyValue('--pc-shift-x')), 0)
  f.motionQuery.matches = false
  f.motionQuery.dispatchEvent(new f.window.Event('change'))
  f.pointer('pointermove', { clientX: 0, clientY: 470 })
  assert.ok(f.frames.size > 0)
  f.motionQuery.matches = true
  f.motionQuery.dispatchEvent(new f.window.Event('change'))
  assert.equal(f.frames.size, 0)
  assert.equal(Number.parseFloat(f.card.style.getPropertyValue('--pc-rotate-y')), 0)
  assert.equal(Number.parseFloat(f.card.style.getPropertyValue('--pc-shift-y')), 0)
})

test('Structure profile card keeps mobile orientation opt-in and ignores permission grants after closing', async t => {
  const f = await cardFixture(t)
  let requests = 0
  let grant
  f.window.DeviceOrientationEvent = { requestPermission: () => { requests++; return new Promise(resolve => { grant = resolve }) } }
  await f.render({ intro: false, enableMobileTilt: false })
  f.card.click()
  assert.equal(requests, 0)
  await f.render({ intro: false, enableMobileTilt: true })
  f.card.click()
  assert.equal(requests, 1)
  await f.unmount()
  grant('granted')
  await Promise.resolve()
  f.window.dispatchEvent(Object.assign(new f.window.Event('deviceorientation'), { gamma: 40, beta: 50 }))
  assert.equal(f.frames.size, 0, 'a late orientation permission grant cannot revive a closed card')
})
