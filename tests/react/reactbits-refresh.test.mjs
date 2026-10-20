import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')

async function bentoFixture(t, options = {}) {
  silenceRenderer(t)
  const dom = new JSDOM('<html><body><div id="root"><article class="icue-bento-card"><button>Download</button></article><article class="icue-bento-card"></article></div></body></html>', { pretendToBeVisual: true })
  t.after(() => dom.window.close())
  const { window } = dom, { document } = window
  const root = document.getElementById('root'), cards = [...root.children]
  root.getBoundingClientRect = () => ({ left: 0, top: 0, right: 640, bottom: 200, width: 640, height: 200 })
  cards.forEach((card, index) => { card.getBoundingClientRect = () => ({ left: index * 320, top: 0, right: index * 320 + 300, bottom: 180, width: 300, height: 180 }) })
  const media = Object.assign(new EventTarget(), { matches: false })
  const coarse = Object.assign(new EventTarget(), { matches: false })
  window.matchMedia = query => query.includes('reduced') ? media : coarse
  const frames = new Map(), observers = new Set()
  let id = 0, now = 0
  class Observer { constructor(callback) { this.callback = callback } observe() { observers.add(this) } disconnect() { observers.delete(this) } }
  const { default: useBentoEffects } = await sourceModule('shared/ui/useBentoEffects.js', { globals: {
    window, document, performance: { now: () => now },
    requestAnimationFrame: callback => { frames.set(++id, callback); return id }, cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: Observer, ResizeObserver: undefined, MutationObserver: window.MutationObserver,
  } })
  function Probe({ options }) { const ref = React.useRef(root); useBentoEffects(ref, options); return null }
  let renderer
  const render = options => React.createElement(React.StrictMode, null, React.createElement(Probe, { options }))
  await act(async () => { renderer = create(render(options)) })
  return { root, cards, renderer, frames, media, observers, window, document,
    flush(count = 1) { for (let i = 0; i < count && frames.size; i++) { const queue = [...frames.values()]; frames.clear(); now += 16; queue.forEach(callback => callback(now)) } },
    event(type, target = root, properties = {}) { const event = new window.Event(type, { bubbles: true }); Object.assign(event, { clientX: 100, clientY: 80, pointerType: 'mouse', button: 0, ...properties }); target.dispatchEvent(event) },
  }
}

test('Magic Bento lights card edges independently of the spotlight and sends a click wave to neighbours', async t => {
  const f = await bentoFixture(t, { enableSpotlight: false, enableBorderGlow: true, clickEffect: true })
  f.event('pointermove')
  f.flush(80)
  assert.equal(f.cards[0].style.getPropertyValue('--glow-intensity'), '1.000')
  assert.equal(f.cards[0].style.getPropertyValue('--mb-hot'), '0.000')
  f.event('click', f.cards[0], { detail: 1 })
  f.flush(8)
  assert.ok(Number(f.cards[1].style.getPropertyValue('--mb-wave-alpha')) > 0)
  assert.ok(parseFloat(f.cards[1].style.getPropertyValue('--mb-wave-radius')) > 0)
  f.event('pointerleave')
  f.flush(200)
  assert.equal(f.frames.size, 0, 'the animation loop settles after leaving')
  await unmount(f.renderer)
  assert.equal(f.observers.size, 0)
})

test('Magic Bento preserves form interactions, pauses offscreen, and responds to live reduced motion', async t => {
  const f = await bentoFixture(t)
  f.event('pointerdown', f.cards[0].querySelector('button'))
  f.flush(20)
  assert.equal(f.cards[0].style.getPropertyValue('--mb-press'), '1')
  f.event('pointermove')
  f.flush(20)
  assert.ok(Number(f.cards[0].style.getPropertyValue('--mb-hot')) > 0)
  for (const observer of f.observers) observer.callback([{ isIntersecting: false }])
  assert.equal(f.frames.size, 0)
  for (const observer of f.observers) observer.callback([{ isIntersecting: true }])
  f.media.matches = true
  f.media.dispatchEvent(new Event('change'))
  assert.equal(f.frames.size, 0)
  assert.equal(f.cards[0].style.getPropertyValue('--mb-hot'), '0')
  f.media.matches = false
  f.media.dispatchEvent(new Event('change'))
  f.flush(20)
  assert.ok(Number(f.cards[0].style.getPropertyValue('--mb-hot')) > 0)
  await unmount(f.renderer)
  assert.equal(f.frames.size, 0)
  f.event('pointermove')
  assert.equal(f.frames.size, 0)
})

test('CountUp formats grouping in the selected locale and keeps the settled value on locale changes', async t => {
  silenceRenderer(t)
  let starts = 0, ends = 0, runs = 0
  const node = { textContent: '' }
  const { default: CountUp } = await sourceModule('ourwork-app/src/components/reactbits/CountUp.jsx', { imports: {
    'motion/react': {
      useReducedMotion: () => false,
      useMotionValue: initial => React.useMemo(() => { const listeners = new Set(); return { value: initial, get() { return this.value }, set(value) { this.value = value; for (const listener of listeners) listener(value) }, on(_event, listener) { listeners.add(listener); return () => listeners.delete(listener) } } }, []),
      animate(value, target, options) { runs++; value.set(target); options.onComplete(); return { stop() {} } },
    },
  } })
  const render = locale => React.createElement(CountUp, { to: 1234.56, locale, separator: '_', suffix: '+', decimals: 1, onStart: () => starts++, onEnd: () => ends++ })
  let renderer
  await act(async () => { renderer = create(render('de-DE'), { createNodeMock: () => node }) })
  await act(async () => new Promise(resolve => setTimeout(resolve, 5)))
  assert.equal(node.textContent, '1_234,6+')
  assert.equal(starts, 1); assert.equal(ends, 1)
  await act(async () => renderer.update(render('en-US')))
  assert.equal(node.textContent, '1_234.6+')
  assert.equal(runs, 1, 'language changes do not replay an already settled count')
  await unmount(renderer)
})

test('AnimatedContent supports current blur, tilt, stagger and wipe options without leaking animation props', async t => {
  silenceRenderer(t)
  let reverted = 0, start = 0, complete = 0, timeline, from, to
  const root = { children: [{}, {}] }
  const gsap = { registerPlugin() {}, set() {}, to() {},
    context(callback) { callback(); return { revert() { reverted++ } } },
    timeline(options) { timeline = { options, fromTo(_targets, first, last) { from = first; to = last }, play() { options.onStart(); options.onComplete() } }; return timeline },
  }
  const { default: AnimatedContent } = await sourceModule('home-app/src/components/reactbits/AnimatedContent.jsx', {
    globals: { document: { getElementById: () => null } }, imports: {
      gsap: { gsap }, 'gsap/ScrollTrigger': { ScrollTrigger: {} }, 'motion/react': { useReducedMotion: () => false },
    },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(AnimatedContent, { trigger: 'mount', blur: 6, tilt: 4, stagger: 0.1, wipe: 'up', onStart: () => start++, onComplete: () => complete++ }, 'Content'), { createNodeMock: () => root }) })
  assert.equal(from.filter, 'blur(6px)')
  assert.equal(from.rotationX, 4)
  assert.equal(from['--ac-wipe'], 0)
  assert.equal(to['--ac-wipe'], 1)
  assert.equal(to.stagger.each, 0.1)
  assert.equal(start, 1); assert.equal(complete, 1)
  const props = renderer.root.findByType('div').props
  assert.equal(props.blur, undefined); assert.equal(props.trigger, undefined)
  await unmount(renderer)
  assert.equal(reverted, 1)
})

test('changing the OS motion preference during a count stops animation and reveals its final value', async t => {
  silenceRenderer(t)
  const media = Object.assign(new EventTarget(), { matches: false })
  const node = { textContent: '' }
  let stopped = 0, started = 0
  const { default: CountUp } = await sourceModule('ourwork-app/src/components/reactbits/CountUp.jsx', {
    globals: { window: { matchMedia: () => media } }, imports: { 'motion/react': {
      useMotionValue: initial => React.useMemo(() => { const listeners = new Set(); return {
        value: initial, get() { return this.value }, set(value) { this.value = value; listeners.forEach(listener => listener(value)) },
        on(_event, listener) { listeners.add(listener); return () => listeners.delete(listener) },
      } }, []),
      animate() { started++; return { stop() { stopped++ } } },
    } },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(CountUp, { to: 240, suffix: '+' }), { createNodeMock: () => node }) })
  await act(async () => new Promise(resolve => setTimeout(resolve, 5)))
  assert.equal(started, 1)
  assert.equal(node.textContent, '0+')
  await act(async () => { media.matches = true; media.dispatchEvent(new Event('change')) })
  assert.equal(node.textContent, '240+')
  assert.equal(stopped, 1)
  await unmount(renderer)
})
