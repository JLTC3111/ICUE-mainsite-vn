import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const implementations = [
  ['VI', 'home-app/src', 'vi'],
]
const KEY = 'icue_home_beams'

/** Run the actual page, hero, network and shared preference
 * module. Replace content/drawing boundaries, not the preference or lifecycle. */
async function fixture(t, source, language, { saved, denied = false } = {}) {
  silenceRenderer(t)
  const dom = new JSDOM('<html><body></body></html>', { url: 'https://icue.test/', pretendToBeVisual: true })
  const { window } = dom, { document } = window
  const storage = new Map(saved ? [[KEY, saved]] : [])
  Object.defineProperty(window, 'localStorage', { get() {
    if (denied) throw new Error('Storage blocked')
    return { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  } })
  const media = new Map(), frames = new Map(), observers = new Set()
  let frameId = 0, now = 0
  window.matchMedia = query => {
    if (!media.has(query)) media.set(query, Object.assign(new window.EventTarget(), { matches: false }))
    return media.get(query)
  }
  const requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId }
  const cancelAnimationFrame = id => frames.delete(id)
  class Observer {
    observe() { observers.add(this) }
    disconnect() { observers.delete(this) }
  }
  const globals = { window, document, requestAnimationFrame, cancelAnimationFrame, ResizeObserver: Observer }
  const preference = await sourceModule(`${source}/hooks/useHomeBeamsEnabled.js`, { globals })
  let videoEnabled = false
  const imports = {
    '../hooks/useHomeBeamsEnabled.js': { ...preference },
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language, resolvedLanguage: language } }) },
    'lucide-react': { Cpu: props => React.createElement('svg', props) },
    '../lib/debugLog': { debugLog() {} },
    '../data/homeContent': {
      buildHero: () => ({ title: 'Home', subtitle: 'Research', actions: [], bannerHref: '/news', bannerLabel: 'News' }),
      buildHomeSections: () => [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
      CARD_COUNTS: [1, 1, 1], SECTION_COUNT: 3,
    },
    '../hooks/useHomeBackgroundVideo': { useHomeBackgroundVideo() {} },
    '../hooks/useHomeBackgroundVideoEnabled': { useHomeBackgroundVideoEnabled: () => videoEnabled },
    '../hooks/useRainText': { useRainText() {} },
    './HeroVideoTitle': { default: ({ text }) => React.createElement('h1', null, text) },
    './magicui/RainbowButton': { default: 'a' },
    './HomeHeroGridScan': { default: ({ active }) => videoEnabled ? null : React.createElement('div', { className: 'home-hero__grid-scan', 'data-gridscan-animated': String(active) }) },
    '../components/HomeSection': { default: ({ beamRef, cardBeamRefs }) => React.createElement('section', { ref: beamRef }, cardBeamRefs.map((ref, index) => React.createElement('article', { key: index, ref }))) },
    '../components/ErrorBoundary': { default: ({ children }) => React.createElement(React.Fragment, null, children) },
    'motion/react': {
      motion: { div: 'div', linearGradient: props => React.createElement('linearGradient', props, props.children) },
      useReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    },
  }
  const { default: Page } = await sourceModule(`${source}/pages/HomePage.jsx`, { globals, imports })
  const { default: Toggle } = await sourceModule(`${source}/components/HomeBeamsToggle.jsx`, { globals, imports })
  const render = () => React.createElement(React.StrictMode, null,
    React.createElement('div', { className: 'pill-site-header' }, React.createElement(Toggle)), React.createElement(Page))
  let renderer, destroyed = false, nodeId = 0
  const mount = async () => { await act(async () => { renderer = create(render(), { createNodeMock: () => ({
    scrollWidth: 800, scrollHeight: 1800,
    getBoundingClientRect() { return { left: 0, top: nodeId++ * 50, width: 800, height: 1800 } },
  }) }) }) }
  const destroy = async () => { if (!destroyed) { destroyed = true; await unmount(renderer) } }
  t.after(async () => { await destroy(); dom.window.close() })
  await mount()
  const button = () => renderer.root.findByType('button')
  const beams = () => renderer.root.findAllByType('linearGradient')
  const heroFrames = () => renderer.root.findAll(node => node.type === 'div' && /home-hero__(warp|grid-scan)/.test(node.props.className || ''))
  const backgrounds = () => heroFrames().filter(node => node.props['data-gridscan-animated'] === 'true' || node.findAllByProps({ className: 'warp-background__beam' }).length > 0)
  const frameSides = () => renderer.root.findAll(node => node.type === 'div' && String(node.props.className).startsWith('warp-background__side '))
  const flush = async (count = 6) => {
    for (let i = 0; i < count && frames.size; i++) {
      const pending = [...frames.values()]; frames.clear(); now += 1000 / 60
      await act(async () => pending.forEach(callback => callback(now)))
    }
  }
  return { window, storage, frames, observers, renderer, preference, button, beams, backgrounds, heroFrames, frameSides, flush, destroy,
    async toggle() { await act(async () => button().props.onClick()) },
    async video(enabled) { videoEnabled = enabled; await act(async () => renderer.update(render())) },
    async remount() { await unmount(renderer); await mount() },
    async media(query, matches) {
      const state = window.matchMedia(query); state.matches = matches
      const event = new window.Event('change'); event.matches = matches
      await act(async () => state.dispatchEvent(event))
    },
    async crossTab(value, key = KEY) {
      if (value == null) storage.delete(KEY); else storage.set(KEY, value)
      await act(async () => window.dispatchEvent(new window.StorageEvent('storage', { key, newValue: value })))
    },
  }
}

for (const [name, source, language] of implementations) {

  test(`${name}: new visits keep the frame with animated beams off and no scheduled visual work`, async t => {
    const f = await fixture(t, source, language)
    assert.equal(f.button().props['aria-pressed'], false)
    assert.equal(f.preference.readHomeBeamsEnabled(), false)
    assert.equal(f.beams().length, 0)
    assert.equal(f.backgrounds().length, 0)
    assert.equal(f.heroFrames().length, 1, 'the quiet static frame remains visible')
    if (name === 'VI') assert.equal(f.frameSides().length, 4)
    assert.equal(f.frames.size, 0)
    assert.equal(f.observers.size, 0)
    await f.toggle()
    await f.flush()
    assert.equal(f.button().props['aria-pressed'], true)
    assert.ok(f.beams().length > 0)
    assert.equal(f.backgrounds().length, 1, 'the same CPU control enables the moving background beams')
    await f.video(true)
    assert.equal(f.backgrounds().length, 0, 'video remains independent of the effect switch')
    assert.ok(f.beams().length > 0)
    await f.video(false)
    assert.equal(f.backgrounds().length, 1)
  })
  test(`${name}: quieter beams can be switched off with their observers and animation work`, async t => {
    const f = await fixture(t, source, language, { saved: 'on' })
    await f.flush()
    assert.equal(f.beams().length, 6)
    assert.equal(f.button().props['aria-pressed'], true)
    assert.equal(f.button().props['aria-label'], name === 'VI' ? 'Tắt hiệu ứng nền và tia sáng' : 'Turn off background and beam effects')
    assert.equal(f.backgrounds().length, 1)
    const active = f.renderer.root.findAllByType('path').filter(path => String(path.props.stroke).startsWith('url('))
    assert.ok(active.every(path => Number(path.props.strokeWidth) === 1.25 && path.props.strokeOpacity === 0.4))
    assert.equal(f.beams()[0].props.transition.duration, 7)
    assert.ok(f.observers.size > 0)
    await f.toggle()
    assert.equal(f.button().props['aria-pressed'], false)
    assert.equal(f.storage.get(KEY), 'off')
    assert.equal(f.beams().length, 0)
    assert.equal(f.backgrounds().length, 0, 'turning the CPU off removes only the animated beams')
    assert.equal(f.heroFrames().length, 1)
    if (name === 'VI') assert.equal(f.frameSides().length, 4)
    assert.equal(f.observers.size, 0)
    assert.equal(f.frames.size, 0)
    await f.remount()
    assert.equal(f.beams().length, 0, 'returning to Home keeps the saved choice')
    assert.equal(f.backgrounds().length, 0)
    assert.equal(f.frames.size, 0)
  })

  test(`${name}: saved-off loads quietly and rapid toggle cleanup cancels the second warmup frame`, async t => {
    const f = await fixture(t, source, language, { saved: 'off' })
    assert.equal(f.button().props['aria-pressed'], false)
    assert.equal(f.beams().length, 0)
    assert.equal(f.frames.size, 0)
    await f.toggle()
    await f.flush(1)
    assert.equal(f.frames.size, 1, 'the second warmup frame has been scheduled')
    await f.toggle()
    assert.equal(f.frames.size, 0)
    assert.equal(f.observers.size, 0)
    await f.toggle()
    await f.flush()
    assert.equal(f.beams().length, 6)
    assert.equal(f.storage.get(KEY), 'on')
    const fresh = await sourceModule(`${source}/hooks/useHomeBeamsEnabled.js`, { globals: { window: f.window } })
    assert.equal(fresh.readHomeBeamsEnabled(), true, 'a fresh module reads the stored choice')
    await f.destroy()
    assert.equal(f.frames.size, 0)
    assert.equal(f.observers.size, 0)
  })

  test(`${name}: blocked storage still synchronizes the button and beam network for the visit`, async t => {
    const f = await fixture(t, source, language, { denied: true })
    assert.equal(f.button().props['aria-pressed'], false)
    await f.toggle()
    await f.flush()
    assert.equal(f.button().props['aria-pressed'], true)
    assert.equal(f.beams().length, 6)
    await f.toggle()
    assert.equal(f.preference.readHomeBeamsEnabled(), false)
    assert.equal(f.button().props['aria-pressed'], false)
    assert.equal(f.beams().length, 0)
    assert.equal(f.observers.size, 0)
    await f.remount()
    assert.equal(f.beams().length, 0)
    await f.toggle()
    await f.flush()
    assert.equal(f.button().props['aria-pressed'], true)
    assert.equal(f.beams().length, 6)
  })

  test(`${name}: cross-tab choices, reduced motion and phone layouts stay consistent`, async t => {
    const f = await fixture(t, source, language, { saved: 'on' })
    await f.flush()
    await f.crossTab('off')
    assert.equal(f.button().props['aria-pressed'], false)
    assert.equal(f.beams().length, 0)
    assert.equal(f.backgrounds().length, 0)
    await f.crossTab(null, null)
    await f.flush()
    assert.equal(f.beams().length, 0, 'clearing the preference returns to the quiet default')
    await f.crossTab('on')
    await f.flush()
    assert.equal(f.beams().length, 6)
    await f.media('(max-width: 768px)', true)
    await f.flush()
    assert.equal(f.beams().length, 2, 'phones retain their sparse beam tier')
    await f.media('(prefers-reduced-motion: reduce)', true)
    assert.equal(f.beams().length, 0)
    assert.equal(f.backgrounds().length, 0)
    assert.equal(f.heroFrames().length, 1)
    if (name === 'VI') assert.equal(f.frameSides().length, 4)
    assert.equal(f.observers.size, 0)
    assert.equal(f.button().props.disabled, true)
    assert.equal(f.button().props['aria-pressed'], false)
    await f.media('(prefers-reduced-motion: reduce)', false)
    await f.flush()
    assert.equal(f.beams().length, 2)
    assert.equal(f.backgrounds().length, 1)
    assert.equal(f.button().props.disabled, false)
    await f.toggle()
    await f.media('(prefers-reduced-motion: reduce)', true)
    await f.media('(prefers-reduced-motion: reduce)', false)
    assert.equal(f.beams().length, 0, 'OS changes preserve the visitor’s off preference')
    assert.equal(f.backgrounds().length, 0)
  })
}
