import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, platform, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')

async function fixture(t, { themeAttribute = 'data-icue-page-theme' } = {}) {
  silenceRenderer(t)
  const dom = new JSDOM('<!doctype html><html><body><div class="icue-app"></div><button></button></body></html>', { pretendToBeVisual: true })
  t.after(() => dom.window.close())
  const f = platform()
  const document = dom.window.document
  const root = document.documentElement
  root.setAttribute(themeAttribute, 'light')
  const timers = new Map()
  let now = 1000, nextTimer = 0, samples = 0, color, sampledBackground
  f.window.setTimeout = (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id }
  f.window.clearTimeout = id => timers.delete(id)
  const { useMusicBarColor } = await sourceModule('shared/contact-sidebar/useMusicBarColor.js', {
    globals: { ...f, document, MutationObserver: dom.window.MutationObserver, performance: { now: () => now } },
    imports: { './backgroundSampling.js': {
      readBackgroundSampleRgb() {
        samples++
        return sampledBackground || (root.getAttribute(themeAttribute) === 'dark' ? [11, 15, 20] : [248, 250, 252])
      },
    } },
  })
  function Probe({ enabled = true }) {
    const ref = React.useRef(document.querySelector('button'))
    color = useMusicBarColor(ref, enabled, 'structure')
    return null
  }
  let renderer
  const render = enabled => React.createElement(React.StrictMode, null, React.createElement(Probe, { enabled }))
  await act(async () => { renderer = create(render(true)) })
  const tick = async (ms = 1000) => {
    await act(async () => {
      await Promise.resolve()
      const end = now + ms
      while (true) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0]
        if (!next || next[1].at > end) break
        now = next[1].at
        timers.delete(next[0])
        next[1].callback()
        await Promise.resolve()
      }
      now = end
    })
  }
  return { root, document, renderer, timers, tick, color: () => color, samples: () => samples,
    background: rgb => { sampledBackground = rgb },
    async update(enabled) { await act(async () => renderer.update(render(enabled))) },
    async theme(value) { await act(async () => root.setAttribute(themeAttribute, value)); await tick() },
  }
}

test('music SVG contrast reacts to shared page theme switches without scrolling or resizing', async t => {
  const f = await fixture(t)
  assert.equal(f.color(), '#0a1a3a')
  for (const app of ['structure', 'faqs', 'recruitment', 'community', 'contact', 'legal', 'archive']) {
    f.root.setAttribute('data-icue-theme-page', app)
    await f.theme('dark')
    assert.equal(f.color(), '#ffffff', `${app}: light to dark`)
    await f.theme('light')
    assert.equal(f.color(), '#0a1a3a', `${app}: dark to light`)
  }
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('legacy About and Our Work theme attributes also refresh music contrast', async t => {
  for (const themeAttribute of ['data-about-theme', 'data-theme']) {
    const f = await fixture(t, { themeAttribute })
    await f.theme('dark')
    assert.equal(f.color(), '#ffffff', themeAttribute)
    await f.theme('light')
    assert.equal(f.color(), '#0a1a3a')
    await unmount(f.renderer)
  }
})

test('music contrast resamples the final background after a CSS theme transition', async t => {
  const f = await fixture(t)
  f.background([248, 250, 252])
  await act(async () => f.root.setAttribute('data-icue-page-theme', 'dark'))
  f.background([11, 15, 20])
  const event = new f.document.defaultView.Event('transitionend', { bubbles: true })
  Object.defineProperty(event, 'propertyName', { value: 'background-color' })
  await act(async () => f.document.body.dispatchEvent(event))
  await f.tick()
  assert.equal(f.color(), '#ffffff')
  await unmount(f.renderer)
})

test('collapsed music controls stop sampling and resume with the current theme', async t => {
  const f = await fixture(t)
  await f.update(false)
  const count = f.samples()
  await f.theme('dark')
  assert.equal(f.samples(), count)
  await f.update(true)
  assert.equal(f.color(), '#ffffff')
  await unmount(f.renderer)
  const finalCount = f.samples()
  await f.theme('light')
  assert.equal(f.samples(), finalCount)
})

test('decorative card canvases do not hide a CSS background from music contrast sampling', async t => {
  const dom = new JSDOM('<html><body><canvas class="icue-bento__stars"></canvas><canvas class="star-border__light"></canvas><canvas class="background-shader"></canvas></body></html>')
  t.after(() => dom.window.close())
  const { window } = dom
  window.document.querySelectorAll('canvas').forEach(canvas => {
    canvas.style.cssText = 'display:block;visibility:visible;opacity:1'
    canvas.getBoundingClientRect = () => ({ width: 300, height: 200 })
  })
  const { getBackgroundCanvases } = await sourceModule('shared/contact-sidebar/backgroundSampling.js', { globals: {
    window, document: window.document, Element: window.Element, HTMLCanvasElement: window.HTMLCanvasElement,
    getComputedStyle: window.getComputedStyle.bind(window),
  } })
  assert.deepEqual(Array.from(getBackgroundCanvases(), canvas => canvas.className), ['background-shader'])
})
