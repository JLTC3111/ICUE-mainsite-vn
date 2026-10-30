import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')

async function fixture(t) {
  const dom = new JSDOM('<html lang="vi"><body><main></main></body></html>', { pretendToBeVisual: true })
  const { window } = dom
  const { document } = window
  const originals = new Map()
  for (const [key, value] of Object.entries({ window, document })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  Object.defineProperty(document, 'hidden', { configurable: true, writable: true, value: false })
  const motion = Object.assign(new window.EventTarget(), { matches: false })
  window.matchMedia = () => motion
  const intervals = new Map()
  const intersections = new Set()
  let clock = 0
  let id = 0
  class IntersectionObserver {
    constructor(callback) { this.callback = callback }
    observe(target) { this.target = target; intersections.add(this) }
    disconnect() { intersections.delete(this) }
  }
  const globals = {
    window, document, IntersectionObserver,
    performance: { now: () => clock },
    setInterval(callback, delay) { intervals.set(++id, { callback, delay }); return id },
    clearInterval(id) { intervals.delete(id) },
  }
  const { default: Loader } = await sourceModule('shared/ui/LatticeLoader.jsx', { globals })
  const { RecoveryNotice } = await sourceModule('shared/resilience/RecoveryBoundary.jsx', { globals })
  const root = createRoot(document.querySelector('main'))
  let mounted = true
  const unmount = async () => {
    if (mounted) await act(async () => root.unmount())
    mounted = false
  }
  t.after(async () => {
    await unmount()
    dom.window.close()
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  let props = {}
  const render = async patch => {
    props = { ...props, ...patch }
    await act(async () => root.render(React.createElement(React.StrictMode, null,
      React.createElement('button', { type: 'button' }, React.createElement(Loader, props)))))
  }
  return {
    window, document, motion, intervals, intersections, render, unmount,
    get loader() { return document.querySelector('.lattice-loader') },
    get timer() { return document.querySelector('.lattice-loader__timer') },
    async tick(now) {
      clock = now
      await act(async () => { for (const { callback } of [...intervals.values()]) callback() })
    },
    now(value) { clock = value },
    async visibility(hidden) {
      document.hidden = hidden
      await act(async () => document.dispatchEvent(new window.Event('visibilitychange')))
    },
    async intersect(isIntersecting) {
      await act(async () => {
        for (const observer of intersections) observer.callback([{ target: observer.target, isIntersecting }])
      })
    },
    notice: props => act(async () => root.render(React.createElement(RecoveryNotice, props))),
  }
}

test('Lattice Loader uses the localized label in buttons while the visual stopwatch stays outside announcements', async t => {
  const f = await fixture(t)
  await f.render({ label: 'Đang tải…', compact: true, inline: true })
  assert.equal(f.document.querySelector('button > span'), f.loader, 'the loader is valid phrasing content')
  assert.equal(f.loader.getAttribute('role'), 'status')
  assert.equal(f.loader.querySelector('.lattice-loader__label').textContent, 'Đang tải…')
  assert.equal(f.loader.querySelector('.lattice-loader__grid').getAttribute('aria-hidden'), 'true')
  assert.equal(f.timer.getAttribute('aria-hidden'), 'true')
  assert.equal(f.loader.style.getPropertyValue('--ll-color'), 'currentColor')
  assert.equal(f.loader.style.getPropertyValue('--ll-cell'), '4px')
  assert.equal(f.loader.querySelectorAll('.lattice-loader__run .lattice-loader__cell').length, 9)
  await f.tick(1250)
  assert.equal(f.timer.textContent, '1.2s')
  await f.render({ label: 'Loading…' })
  await f.tick(3500)
  assert.equal(f.timer.textContent, '3.5s', 'changing locale must not restart an ongoing wait')
  assert.equal(f.loader.querySelector('.lattice-loader__label').textContent, 'Loading…')
  await f.render({ announce: false, showTimer: false })
  assert.equal(f.loader.hasAttribute('role'), false)
  assert.equal(f.timer, null)
  assert.equal(f.intervals.size, 0, 'an inline loader without a stopwatch requires no JS interval')
})

test('loader defaults follow the page language and locale helper accepts regional language codes', async t => {
  const f = await fixture(t)
  const { loadingLabelForLocale } = await sourceModule('shared/ui/LatticeLoader.jsx')
  for (const [locale, label] of [
    ['vi-VN', 'Đang tải…'], ['en-GB', 'Loading…'], ['de', 'Wird geladen…'],
    ['fr-FR', 'Chargement…'], ['ko_KR', '불러오는 중…'], ['ja-JP', '読み込み中…'],
    ['unsupported', 'Loading…'],
  ]) {
    f.document.documentElement.lang = locale
    await f.render({ showTimer: false })
    assert.equal(f.loader.querySelector('.lattice-loader__label').textContent, label)
    assert.equal(loadingLabelForLocale(locale), label)
  }
})

test('hidden and offscreen loaders pause work and catch up to real elapsed time when shown', async t => {
  const f = await fixture(t)
  await f.render({ label: 'Loading' })
  assert.equal(f.intervals.size, 1, 'Strict Mode leaves one timer')
  await f.tick(1200)
  await f.visibility(true)
  assert.equal(f.intervals.size, 0)
  assert.equal(f.loader.hasAttribute('data-paused'), true)
  f.now(9000)
  await f.visibility(false)
  assert.equal(f.timer.textContent, '9.0s', 'hidden time is measured instead of counting scheduled ticks')
  assert.equal(f.intervals.size, 1)
  await f.intersect(false)
  assert.equal(f.intervals.size, 0)
  f.now(12300)
  await f.intersect(true)
  assert.equal(f.timer.textContent, '12.3s')
  assert.equal(f.loader.hasAttribute('data-paused'), false)
  f.motion.matches = true
  await act(async () => f.motion.dispatchEvent(new f.window.Event('change')))
  assert.equal([...f.intervals.values()][0].delay, 1000, 'reduced motion limits stopwatch refreshes')
  await f.unmount()
  assert.equal(f.intervals.size, 0)
  assert.equal(f.intersections.size, 0)
})

test('completion freezes the stopwatch, an explicit new operation resets it, and controlled elapsed values are respected', async t => {
  const f = await fixture(t)
  await f.render({ label: 'Translating', doneLabel: 'Translated', errorLabel: 'Translation failed' })
  await f.tick(4830)
  await f.render({ status: 'done' })
  assert.equal(f.timer.textContent, '4.8s')
  assert.equal(f.intervals.size, 0)
  assert.equal(f.loader.querySelector('.lattice-loader__label').textContent, 'Translated')
  await f.tick(18000)
  assert.equal(f.timer.textContent, '4.8s')
  await f.render({ status: 'working' })
  assert.equal(f.timer.textContent, '0.0s')
  await f.tick(19150)
  assert.equal(f.timer.textContent, '1.1s')
  await f.render({ status: 'error' })
  assert.equal(f.loader.getAttribute('data-status'), 'error')
  assert.equal(f.loader.querySelector('.lattice-loader__label').textContent, 'Translation failed')
  await f.render({ status: 'done', elapsed: 72.4, grid: 4 })
  assert.equal(f.timer.textContent, '1m 12.4s')
  assert.equal(f.intervals.size, 0)
  assert.equal(f.loader.querySelectorAll('.lattice-loader__run .lattice-loader__cell').length, 16)
})

test('shared route recovery uses the loader for waits and keeps retry/reload actions for errors', async t => {
  const f = await fixture(t)
  await f.notice({ loading: true, compact: true, onRetry() {}, allowReload: true })
  assert.equal(f.loader.querySelector('.lattice-loader__label').textContent, 'Đang tải…')
  assert.equal(f.document.querySelectorAll('[role="status"]').length, 1)
  assert.equal(f.document.querySelector('button'), null)
  let retries = 0
  await f.notice({ onRetry() { retries++ }, allowReload: true })
  assert.equal(f.loader, null)
  assert.equal(f.document.querySelector('.icue-recovery').getAttribute('role'), 'alert')
  assert.equal(f.document.querySelectorAll('button').length, 2)
  await act(async () => f.document.querySelector('button').click())
  assert.equal(retries, 1)
  assert.equal(f.intervals.size, 0)
})
