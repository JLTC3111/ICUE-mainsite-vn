import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { createPortal } = require('react-dom')
const repo = fileURLToPath(new URL('../../', import.meta.url))

// Library files already contain React.createElement and their own React import.
// Load them without the JSX harness's injected React binding, sharing real React
// and the same DOM as the application under test.
function swiperLoader(globals) {
  const context = vm.createContext({ console, setTimeout, clearTimeout, ...globals })
  const modules = new Map()
  const reactModule = new vm.SyntheticModule([...Object.keys(React), 'default'], function () {
    for (const [name, value] of Object.entries(React)) this.setExport(name, value)
    this.setExport('default', React)
  }, { context })
  async function load(file) {
    if (!modules.has(file)) modules.set(file, (async () => new vm.SourceTextModule(await fs.readFile(file, 'utf8'), { context, identifier: file }))())
    return modules.get(file)
  }
  const resolve = (specifier, parent) => specifier === 'react'
    ? reactModule : load(path.resolve(path.dirname(parent.identifier), specifier))
  return async file => {
    const module = await load(path.join(repo, 'home-app/node_modules/swiper', file))
    if (module.status === 'unlinked') await module.link(resolve)
    if (module.status === 'linked') await module.evaluate()
    return module.namespace
  }
}

test('project lightbox uses real Swiper for long mouse drags, trackpad wheels and mobile touch gestures', async t => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://vi.icue.test/' })
  const { window } = dom, { document } = window
  const originals = new Map()
  for (const [name, value] of Object.entries({ window, document })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  let root, viewportWidth = 1100, time = 1000
  t.after(async () => {
    if (root) await act(async () => root.unmount())
    dom.window.close()
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  })
  window.matchMedia = () => ({ matches: true }) // Settle without browser transition rendering.
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
  window.HTMLDialogElement.prototype.close = function () { this.open = false }
  for (const name of ['clientWidth', 'offsetWidth']) Object.defineProperty(window.HTMLElement.prototype, name, {
    configurable: true, get() { return parseFloat(this.style.width) || viewportWidth },
  })
  for (const name of ['clientHeight', 'offsetHeight']) Object.defineProperty(window.HTMLElement.prototype, name, { configurable: true, get() { return 600 } })
  Object.defineProperty(window.HTMLElement.prototype, 'offsetLeft', { configurable: true, get() {
    return this.classList.contains('swiper-slide') ? [...this.parentElement.children].indexOf(this) * (viewportWidth + 24) : 0
  } })
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, right: this.offsetWidth, bottom: 600, width: this.offsetWidth, height: 600 }
  }
  // JSDOM does not resolve CSS transforms into the matrix that browsers expose.
  window.WebKitCSSMatrix = class {
    constructor(transform = '') {
      const values = transform.match(/translate3d\(([^)]+)\)/)?.[1].split(',').map(parseFloat) || [0, 0]
      this.m41 = values[0]; this.m42 = values[1]
    }
  }
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [time])) }
    static now() { return time }
  }
  window.Date = ClockDate
  const globals = {
    window, document, HTMLElement: window.HTMLElement, HTMLSlotElement: window.HTMLSlotElement,
    Element: window.Element, navigator: window.navigator, MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window), Date: ClockDate,
    requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  }
  const library = swiperLoader(globals)
  const { Swiper, SwiperSlide } = await library('swiper-react.mjs')
  const { default: A11y } = await library('modules/a11y.mjs')
  const { default: Mousewheel } = await library('modules/mousewheel.mjs')
  const icon = () => React.createElement('svg')
  const { default: ProjectLightbox } = await sourceModule('home-app/src/components/ProjectLightbox.jsx', { globals, imports: {
    'react-dom': { createPortal }, 'swiper/modules': { A11y, Mousewheel }, 'swiper/react': { Swiper, SwiperSlide },
    'swiper/css': {}, 'swiper/css/a11y': {}, 'lucide-react': { ChevronLeft: icon, ChevronRight: icon, X: icon },
  } })
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(React.createElement(ProjectLightbox, {
    images: [1, 2, 3].map(id => ({ src: `/original-${id}.jpg`, width: 960, height: 720 })), initialIndex: 0,
    title: 'Gallery', labels: { closeImage: 'Close', previousImage: 'Previous', nextImage: 'Next' }, onClose() {},
  })))
  const swiper = document.querySelector('.project-lightbox__swiper').swiper
  const count = () => document.querySelector('.project-lightbox__count').textContent.replace(/\s+/g, ' ').trim()
  const currentImage = () => document.querySelector('.swiper-slide-active img')
  const pointer = async (type, x, pointerType = 'mouse') => {
    const event = new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: 200 })
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } })
    await act(async () => currentImage().dispatchEvent(event))
  }
  const touch = async (type, x) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true })
    const point = { identifier: 7, pageX: x, pageY: 200, clientX: x, clientY: 200 }
    Object.defineProperties(event, {
      targetTouches: { value: type === 'touchend' ? [] : [point] }, changedTouches: { value: [point] },
    })
    await act(async () => currentImage().dispatchEvent(event))
  }
  assert.equal(swiper.width, 1100)
  assert.equal(count(), '1 / 3')
  await pointer('pointerdown', 800)
  time += 20; await pointer('pointermove', 775)
  time += 20; await pointer('pointermove', 600)
  time += 400; await pointer('pointerup', 600)
  assert.equal(count(), '2 / 3', 'a deliberate mouse drag advances even when held longer than a flick')

  const pinch = new window.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100, ctrlKey: true })
  await act(async () => currentImage().dispatchEvent(pinch))
  assert.equal(pinch.defaultPrevented, false, 'pinch-to-zoom is left to the browser')
  assert.equal(count(), '2 / 3')
  time += 1000
  const wheel = new window.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 100 })
  await act(async () => currentImage().dispatchEvent(wheel))
  assert.equal(count(), '3 / 3', 'horizontal trackpad input reaches the real Mousewheel module')
  assert.equal(wheel.defaultPrevented, true, 'handled swipes cannot scroll the background page')
  time += 1000
  const mousewheel = new window.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100 })
  await act(async () => currentImage().dispatchEvent(mousewheel))
  assert.equal(count(), '2 / 3', 'a conventional mouse wheel can navigate in the opposite direction')
  time += 1000
  const shiftWheel = new window.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100, shiftKey: true })
  await act(async () => currentImage().dispatchEvent(shiftWheel))
  assert.equal(count(), '3 / 3', 'Shift-wheel remains a supported horizontal swipe')

  viewportWidth = 375
  await act(async () => swiper.update())
  assert.equal(swiper.width, 375)
  time += 1000
  await pointer('pointerdown', 300, 'touch')
  await touch('touchstart', 300)
  time += 20; await touch('touchmove', 275)
  time += 20; await touch('touchmove', 100)
  time += 400; await touch('touchend', 100)
  assert.equal(count(), '1 / 3', 'mobile touch events swipe and rewind without a navigation button')
})
