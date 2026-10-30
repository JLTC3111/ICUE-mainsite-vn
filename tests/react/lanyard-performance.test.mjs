import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js'
import * as THREE from '../../structure-app/node_modules/three/build/three.module.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')

/** Real Three geometry, matrices, raycasting and physics. Only GPU/DOM drawing
 * boundaries are replaced; these checks do not claim visual or GPU validation. */
async function fixture(t, props = {}, { graphics = true, observers = true, strict = false } = {}) {
  const dom = new JSDOM('<html><body><main></main></body></html>', { pretendToBeVisual: true })
  const { window } = dom, { document } = window
  const originals = new Map()
  for (const [key, value] of Object.entries({ window, document })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  Object.defineProperties(window, { innerWidth: { configurable: true, writable: true, value: 1280 }, devicePixelRatio: { configurable: true, value: 3 } })
  Object.defineProperty(document, 'hidden', { configurable: true, writable: true, value: false })
  Object.defineProperties(window.HTMLElement.prototype, {
    clientWidth: { configurable: true, get: () => 480 },
    clientHeight: { configurable: true, get: () => 665 },
  })
  const contexts = new Map()
  window.HTMLCanvasElement.prototype.getContext = function (kind) {
    if (kind !== '2d') return null
    if (!contexts.has(this)) contexts.set(this, {
      fillStyle: '#000000', draws: [], fillRect() {}, save() {}, restore() {}, translate() {}, rotate() {},
      drawImage(...args) { this.draws.push(args) },
      createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData() {},
    })
    return contexts.get(this)
  }
  const frames = new Map(), resizes = new Set(), intersections = new Set(), images = [], renderers = []
  let id = 0, now = 0, mounts = 0, environmentDisposals = 0
  const raf = callback => { frames.set(++id, callback); return id }
  const cancel = id => frames.delete(id)
  const media = Object.assign(new window.EventTarget(), { matches: false })
  window.matchMedia = () => media
  window.requestAnimationFrame = raf
  window.cancelAnimationFrame = cancel
  class Resize {
    constructor(callback) { this.callback = callback }
    observe() { resizes.add(this) }
    disconnect() { resizes.delete(this) }
  }
  class Intersection {
    constructor(callback) { this.callback = callback }
    observe() { intersections.add(this) }
    disconnect() { intersections.delete(this) }
  }
  class Image {
    constructor() { images.push(this); this.width = 768; this.height = 1100 }
    set src(value) { this.url = value }
    get src() { return this.url }
  }
  class Renderer {
    constructor() {
      mounts++
      if (!graphics) throw new Error('No WebGL')
      this.domElement = document.createElement('canvas')
      const captures = new Set()
      this.domElement.setPointerCapture = id => captures.add(id)
      this.domElement.hasPointerCapture = id => captures.has(id)
      this.domElement.releasePointerCapture = id => captures.delete(id)
      this.captures = captures
      this.domElement.getBoundingClientRect = () => ({ left: 0, top: 0, width: 480, height: 665 })
      this.capabilities = { getMaxAnisotropy: () => 16 }
      this.renders = 0
      this.disposals = 0
      renderers.push(this)
    }
    setClearColor() {}
    setPixelRatio(value) { this.dpr = value }
    setSize(width, height) { this.width = width; this.height = height }
    render(scene, camera) {
      this.scene = scene; this.camera = camera; this.renders++
      scene.updateMatrixWorld()
    }
    dispose() { this.disposals++ }
  }
  class PMREM {
    fromScene() { return { texture: new THREE.Texture(), dispose() { environmentDisposals++ } } }
    dispose() {}
  }
  const source = await sourceModule('structure-app/src/components/reactbits/Lanyard/Lanyard.jsx', {
    globals: { window, document, Image, performance: { now: () => now }, requestAnimationFrame: raf, cancelAnimationFrame: cancel,
      ResizeObserver: observers ? Resize : undefined, IntersectionObserver: observers ? Intersection : undefined },
    imports: { three: { ...THREE, WebGLRenderer: Renderer, PMREMGenerator: PMREM } },
  })
  const geometry = await sourceModule('structure-app/src/components/reactbits/Lanyard/lanyardScene.js', { imports: { three: THREE } })
  const root = createRoot(document.querySelector('main'))
  let currentProps = { intro: false, breeze: 0, ...props }, destroyed = false
  const update = async patch => {
    currentProps = { ...currentProps, ...patch }
    const content = React.createElement(source.default, currentProps)
    await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content))
  }
  const destroy = async () => { if (!destroyed) { destroyed = true; await act(async () => root.unmount()) } }
  t.after(async () => {
    await destroy()
    dom.window.close()
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  await update({})
  const renderer = renderers.at(-1)
  const flush = async (count = 1) => {
    await act(async () => {
      for (let i = 0; i < count && frames.size; i++) {
        const pending = [...frames.values()]; frames.clear(); now += 1000 / 60
        for (const callback of pending) callback(now)
      }
    })
  }
  const event = async (type, properties = {}, target = renderer.domElement) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true })
    Object.assign(event, { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, ...properties })
    await act(async () => target.dispatchEvent(event))
    return event
  }
  const card = () => renderer.scene.children.find(child => child.isGroup && child.children.length === 4)
  const point = () => {
    const point = card().position.clone().project(renderer.camera)
    return { clientX: (point.x + 1) * 240, clientY: (1 - point.y) * 332.5 }
  }
  return { source: geometry, window, document, renderer, renderers, frames, resizes, intersections, media, images, contexts,
    update, destroy, flush, event, card, point, mounts: () => mounts, environmentDisposals: () => environmentDisposals }
}

test('current Lanyard builds front/back geometry and a reusable 72-sample woven strap', async t => {
  const f = await fixture(t)
  for (const orientation of ['portrait', 'landscape']) {
    const layout = f.source.cardLayout(orientation, 0.3)
    const { body, face } = f.source.buildCardGeometry(layout)
    const uv = face.getAttribute('uv').array
    assert.ok(uv.every(value => Number.isFinite(value) && value >= 0 && value <= 1))
    body.computeBoundingBox()
    assert.ok(Math.abs((body.boundingBox.max.x - body.boundingBox.min.x) - layout.width) < 0.001)
    body.dispose(); face.dispose()
  }
  const strap = f.renderer.scene.children.find(child => child.geometry?.getAttribute('position')?.count === 72 * 4)
  assert.ok(strap)
  const positions = strap.geometry.getAttribute('position').array
  const indices = strap.geometry.index.array
  await f.flush(10)
  assert.equal(strap.geometry.getAttribute('position').array, positions)
  assert.equal(strap.geometry.index.array, indices)
  assert.ok(positions.every(Number.isFinite))
  assert.equal(indices.length, 71 * 3 * 6)
  assert.equal(f.renderer.dpr, 2)
  assert.equal(f.renderer.width, 480)
})

test('the new physics settles at rest and wakes for profile clicks, drags and cancellation', async t => {
  let clicks = 0
  const f = await fixture(t, { onCardClick: () => clicks++ })
  await f.flush(1200)
  assert.equal(f.frames.size, 0, 'zero-breeze employee badges stop rendering when settled')
  assert.ok(f.card().position.toArray().every(Number.isFinite))
  assert.ok(Math.abs(f.card().quaternion.length() - 1) < 1e-6)
  const point = f.point()
  const down = await f.event('pointerdown', point)
  assert.equal(down.defaultPrevented, true, 'real raycasting found the card')
  assert.equal(f.renderer.captures.size, 1)
  assert.ok(f.frames.size > 0)
  await f.event('pointerup', point)
  assert.equal(clicks, 1)
  assert.equal(f.renderer.captures.size, 0)
  await f.event('pointerdown', point)
  await f.event('pointermove', { ...point, clientX: point.clientX + 30 })
  await f.event('pointermove', point)
  await f.event('pointerup', point)
  assert.equal(clicks, 1, 'returning to the start after dragging does not open the profile')
  await f.event('pointerdown', point)
  await f.event('pointercancel', point)
  await f.event('pointerup', point)
  assert.equal(clicks, 1)
  await f.event('pointerdown', { ...point, pointerId: 1 })
  await f.event('pointerup', { ...point, pointerId: 2 })
  assert.equal(f.renderer.captures.size, 1, 'another pointer cannot release the active drag')
  await f.update({ interactive: false })
  assert.equal(f.renderer.captures.size, 0)
})

test('Lanyard preserves upstream click-to-flip when no profile action is provided', async t => {
  const f = await fixture(t)
  await f.flush(1200)
  const point = f.point()
  await f.event('pointerdown', point)
  await f.event('pointerup', point)
  await f.flush(240)
  const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(f.card().quaternion)
  assert.ok(facing.z < -0.8, 'the back is now facing the viewer')
  await f.destroy()
  assert.equal(f.frames.size, 0)
})

test('hidden/offscreen badges cancel work immediately and retain their scene on resume', async t => {
  const f = await fixture(t, { breeze: 0.3 })
  await f.flush(2)
  assert.ok(f.frames.size > 0)
  f.document.hidden = true
  await f.event('visibilitychange', {}, f.document)
  assert.equal(f.frames.size, 0)
  const renders = f.renderer.renders
  await f.event('resize', {}, f.window)
  assert.equal(f.renderer.renders, renders, 'resizing does not draw a hidden scene')
  for (const observer of f.intersections) observer.callback([{ isIntersecting: false }])
  f.document.hidden = false
  await f.event('visibilitychange', {}, f.document)
  assert.equal(f.frames.size, 0)
  for (const observer of f.intersections) observer.callback([{ isIntersecting: true }])
  assert.ok(f.frames.size > 0)
  await f.flush(2)
  assert.equal(f.mounts(), 1, 'resume reuses the renderer')
  f.media.matches = true
  await f.event('change', {}, f.media)
  await f.flush(1)
  assert.equal(f.frames.size, 0, 'live reduced motion displays one still frame')
  f.media.matches = false
  await f.event('change', {}, f.media)
  assert.ok(f.frames.size > 0)
})

test('employee image changes keep the renderer, reject stale loads, and bound the image cache', async t => {
  const f = await fixture(t, { frontImage: 'first' })
  const first = f.images.find(image => image.url === 'first')
  await f.update({ frontImage: 'second' })
  const second = f.images.find(image => image.url === 'second')
  await act(async () => second.onload())
  const frontMap = f.card().children[1].material.map
  const faceCanvas = frontMap.image
  assert.equal(f.contexts.get(faceCanvas).draws.at(-1)[0], second)
  await act(async () => first.onload())
  assert.equal(f.contexts.get(faceCanvas).draws.at(-1)[0], second, 'an older image cannot replace the selected employee')
  await f.update({ frontImage: 'third' })
  const third = f.images.find(image => image.url === 'third')
  await act(async () => third.onload())
  assert.equal(f.contexts.get(faceCanvas).draws.at(-1)[0], third)
  await f.update({ frontImage: 'first' })
  assert.equal(f.images.filter(image => image.url === 'first').length, 2, 'retired employee URLs leave the cache')
  assert.equal(f.mounts(), 1)
  assert.equal(f.card().children[1].material.map, frontMap, 'face textures update in place')
})

test('front, back and strap image inputs update independently without rebuilding the lanyard', async t => {
  const f = await fixture(t, { frontImage: 'portrait', backImage: 'card-back', strapImage: 'woven-band' })
  const front = f.images.find(image => image.url === 'portrait')
  const back = f.images.find(image => image.url === 'card-back')
  const strapImage = f.images.find(image => image.url === 'woven-band')
  await act(async () => { front.onload(); back.onload(); strapImage.onload() })
  const frontMap = f.card().children[1].material.map
  const backMap = f.card().children[2].material.map
  const strap = f.renderer.scene.children.find(child => child.geometry?.getAttribute('position')?.count === 72 * 4)
  const strapMap = strap.material.map
  const paintedImage = map => f.contexts.get(map.image).draws.at(-1)[0]
  assert.equal(paintedImage(frontMap), front)
  assert.equal(paintedImage(backMap), back)
  assert.equal(paintedImage(strapMap), strapImage)

  await f.update({ frontImage: 'next-portrait' })
  const next = f.images.find(image => image.url === 'next-portrait')
  await act(async () => next.onload())
  assert.equal(paintedImage(frontMap), next)
  assert.equal(paintedImage(backMap), back, 'selecting a staff member preserves the supplied reverse artwork')
  assert.equal(paintedImage(strapMap), strapImage, 'selecting a staff member preserves the supplied band artwork')
  assert.equal(f.card().children[1].material.map, frontMap)
  assert.equal(f.card().children[2].material.map, backMap)
  assert.equal(strap.material.map, strapMap)
  assert.equal(f.mounts(), 1)
})

test('unmount releases geometry, textures, observers and a captured drag under Strict Mode', async t => {
  const f = await fixture(t, {}, { strict: true })
  assert.equal(f.mounts(), 2)
  assert.equal(f.renderers[0].disposals, 1)
  await f.flush(1200)
  await f.event('pointerdown', f.point())
  const resources = new Set()
  f.renderer.scene.traverse(object => {
    if (object.geometry) resources.add(object.geometry)
    if (object.material) {
      resources.add(object.material)
      for (const value of Object.values(object.material)) if (value?.isTexture) resources.add(value)
    }
  })
  const disposed = new Set()
  for (const resource of resources) resource.addEventListener('dispose', () => disposed.add(resource))
  await f.destroy()
  assert.equal(disposed.size, resources.size)
  assert.equal(f.renderer.disposals, 1)
  assert.equal(f.renderer.captures.size, 0)
  assert.equal(f.environmentDisposals(), 2)
  assert.equal(f.frames.size, 0)
  assert.equal(f.resizes.size, 0)
  assert.equal(f.intersections.size, 0)
  assert.equal(f.document.querySelector('canvas'), null)
})

test('missing graphics and context loss show the existing employee badge fallback', async t => {
  const f = await fixture(t, { fallback: React.createElement('span', null, 'Employee badge') }, { graphics: false })
  assert.equal(f.document.querySelector('main').textContent, 'Employee badge')
  assert.equal(f.document.querySelector('canvas'), null)
  assert.equal(f.frames.size, 0)
})

test('context loss cleans the renderer and missing observers still allow interaction and resizing', async t => {
  const f = await fixture(t, { fallback: React.createElement('span', null, 'Employee badge') }, { observers: false })
  await f.flush(1200)
  f.window.innerWidth = 700
  await f.event('resize', {}, f.window)
  assert.equal(f.renderer.dpr, 1.5)
  assert.equal(f.resizes.size, 0)
  assert.equal(f.intersections.size, 0)
  const contextLost = await f.event('webglcontextlost')
  assert.equal(contextLost.defaultPrevented, true)
  assert.equal(f.document.querySelector('main').textContent, 'Employee badge')
  assert.equal(f.renderer.disposals, 1)
  assert.equal(f.frames.size, 0)
  assert.equal(f.document.querySelector('canvas'), null)
})
