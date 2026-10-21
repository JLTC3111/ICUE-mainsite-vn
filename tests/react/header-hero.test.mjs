import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const rect = (top, height, width = 1200) => ({ top, height, width, left: 0, right: width, bottom: top + height })

async function fixture(t, { mountedHero = true, resizeObserver = true } = {}) {
  silenceRenderer(t)
  const dom = new JSDOM('<html><body><header></header><main id="content"></main></body></html>')
  const { window } = dom, { document } = window
  const header = document.querySelector('header')
  const hero = document.createElement('section')
  hero.className = 'home-hero'
  let headerRect = rect(16, 52), heroRect = rect(0, 900), overHero, renderer, enabled = true
  header.getBoundingClientRect = () => headerRect
  hero.getBoundingClientRect = () => heroRect
  if (mountedHero) document.querySelector('main').appendChild(hero)
  const frames = new Map(), observers = []
  let nextFrame = 0
  window.requestAnimationFrame = callback => { const id = ++nextFrame; frames.set(id, callback); return id }
  window.cancelAnimationFrame = id => frames.delete(id)
  const viewport = new window.EventTarget()
  Object.defineProperty(window, 'visualViewport', { value: viewport })
  class GeometryObserver {
    observed = new Set()
    constructor(callback) { this.callback = callback; observers.push(this) }
    observe(node) { this.observed.add(node) }
    unobserve(node) { this.observed.delete(node) }
    disconnect() { this.observed.clear() }
  }
  const { default: useHeaderOverHero } = await sourceModule('home-app/src/hooks/useHeaderOverHero.js', {
    globals: { window, document, MutationObserver: window.MutationObserver, ResizeObserver: resizeObserver ? GeometryObserver : undefined },
  })
  function Probe() {
    const ref = React.useRef(header)
    overHero = useHeaderOverHero(ref, enabled)
    return null
  }
  const render = () => React.createElement(React.StrictMode, null, React.createElement(Probe))
  await act(async () => { renderer = create(render()) })
  let mounted = true
  const destroy = async () => { if (mounted) { mounted = false; await unmount(renderer) } }
  t.after(async () => { await destroy(); window.close() })
  return {
    window, document, hero, frames, observers, viewport, destroy,
    overHero: () => overHero,
    headerRect: value => { headerRect = value },
    heroRect: value => { heroRect = value },
    async flush() {
      await act(async () => {
        await Promise.resolve()
        const pending = [...frames.values()]
        frames.clear()
        pending.forEach(callback => callback())
      })
    },
    async enable(value) { enabled = value; await act(async () => renderer.update(render())) },
  }
}

test('header blends over the hero and restores the page palette at the header boundary in either scroll direction', async t => {
  const f = await fixture(t)
  assert.equal(f.overHero(), true)
  f.heroRect(rect(-800, 900))
  f.window.dispatchEvent(new f.window.Event('scroll'))
  await f.flush()
  assert.equal(f.overHero(), true, 'hero still covers the header center')
  f.heroRect(rect(-880, 900))
  f.window.dispatchEvent(new f.window.Event('scroll'))
  f.window.dispatchEvent(new f.window.Event('scroll'))
  assert.equal(f.frames.size, 1, 'scroll measurements share one frame')
  await f.flush()
  assert.equal(f.overHero(), false)
  f.heroRect(rect(0, 900))
  f.window.dispatchEvent(new f.window.Event('scroll'))
  await f.flush()
  assert.equal(f.overHero(), true)
  assert.equal(f.frames.size, 0, 'no animation loop runs while the page is idle')
})

test('hero tracking handles lazy mounting, mobile geometry, and route cleanup', async t => {
  const f = await fixture(t, { mountedHero: false })
  assert.equal(f.overHero(), false)
  f.document.querySelector('main').appendChild(f.hero)
  await f.flush()
  assert.equal(f.overHero(), true)
  f.heroRect(rect(-800, 900))
  f.headerRect(rect(100, 56, 360))
  f.viewport.dispatchEvent(new f.window.Event('resize'))
  await f.flush()
  assert.equal(f.overHero(), false, 'mobile header uses its actual position')
  f.headerRect(rect(16, 52, 360))
  f.observers.at(-1).callback()
  await f.flush()
  assert.equal(f.overHero(), true)
  f.window.dispatchEvent(new f.window.Event('scroll'))
  await f.enable(false)
  assert.equal(f.overHero(), false)
  assert.equal(f.frames.size, 0)
  assert.ok(f.observers.every(observer => observer.observed.size === 0))
  f.document.querySelector('main').replaceChildren()
  f.window.dispatchEvent(new f.window.Event('resize'))
  await f.flush()
  assert.equal(f.frames.size, 0)
  assert.equal(f.overHero(), false)
})

test('scroll and resize still update the header when ResizeObserver is unavailable', async t => {
  const f = await fixture(t, { resizeObserver: false })
  assert.equal(f.overHero(), true)
  f.heroRect(rect(-900, 900))
  f.window.dispatchEvent(new f.window.Event('resize'))
  await f.flush()
  assert.equal(f.overHero(), false)
  await f.destroy()
  f.window.dispatchEvent(new f.window.Event('scroll'))
  assert.equal(f.frames.size, 0)
})
