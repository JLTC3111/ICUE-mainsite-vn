import test from 'node:test'
import assert from 'node:assert/strict'
import { React, act, create, platform, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

async function fixture(t, { reduced = false, observers = true, canvasAvailable = true } = {}) {
  silenceRenderer(t)
  const f = platform()
  const frames = new Map()
  const resizes = new Set()
  const visibility = new Set()
  const strokes = []
  const gradients = []
  let path = []
  let id = 0
  let time = 0
  function gradient(kind, coordinates) {
    assert.ok(coordinates.every(Number.isFinite), 'Gradient coordinates stay finite at square corners')
    const result = { kind, coordinates, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]) } }
    gradients.push(result)
    return result
  }
  const ctx = {
    setTransform() {}, clearRect() {}, fillRect() {}, fill() {},
    beginPath() { path = [] },
    moveTo(x, y) { path.push(x, y) },
    lineTo(x, y) { path.push(x, y) },
    stroke() {
      assert.ok(path.every(Number.isFinite), 'Drawing coordinates stay finite')
      strokes.push({ points: [...path], color: this.strokeStyle })
    },
    arc(...args) { assert.ok(args.every(Number.isFinite)) },
    roundRect(...args) { assert.ok(args.every(Number.isFinite)) },
    createRadialGradient(...args) { return gradient('radial', args) },
    createLinearGradient(...args) { return gradient('linear', args) },
  }
  const canvas = { getContext: () => canvasAvailable ? ctx : null }
  const root = Object.assign(new EventTarget(), {
    offsetWidth: 300, offsetHeight: 180,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 300, height: 180 }),
    matches: () => true,
  })
  const media = Object.assign(new EventTarget(), { matches: reduced })
  f.window.matchMedia = () => media
  f.window.devicePixelRatio = 3
  f.document.createElement = () => ({ getContext: () => ({ fillStyle: '#000000' }) })
  class Resize {
    constructor(callback) { this.callback = callback }
    observe() { resizes.add(this) }
    disconnect() { resizes.delete(this) }
  }
  class Visible {
    constructor(callback) { this.callback = callback }
    observe() { visibility.add(this) }
    disconnect() { visibility.delete(this) }
  }
  const { default: Border } = await sourceModule('home-app/src/components/reactbits/StarBorder.jsx', {
    globals: {
      ...f, performance: { now: () => time },
      requestAnimationFrame: callback => { frames.set(++id, callback); return id },
      cancelAnimationFrame: key => frames.delete(key),
      ResizeObserver: observers ? Resize : undefined,
      IntersectionObserver: observers ? Visible : undefined,
    },
  })
  const render = theme => React.createElement(React.StrictMode, null,
    React.createElement(Border, { as: 'div', theme, radius: 0 }, React.createElement('article', null, 'Award content')))
  let renderer
  await act(async () => { renderer = create(render('light'), { createNodeMock: element => element.type === 'canvas' ? canvas : root }) })
  return {
    ...f, ctx, canvas, root, renderer, frames, resizes, visibility, strokes, gradients,
    flush(count = 1) {
      for (let index = 0; index < count && frames.size; index++) {
        const pending = [...frames.values()]
        frames.clear()
        time += 16
        pending.forEach(callback => callback(time))
      }
    },
    async theme(theme) { await act(async () => renderer.update(render(theme))) },
    motion(reduced) {
      media.matches = reduced
      const event = new Event('change')
      event.matches = reduced
      media.dispatchEvent(event)
    },
  }
}

test('canvas trails render with square corners and follow a live light/dark change', async t => {
  const f = await fixture(t)
  assert.equal(f.renderer.root.findByType('article').children[0], 'Award content')
  assert.equal(f.renderer.root.findByType('div').props.style['--star-border-radius'], '0px')
  assert.equal(f.renderer.root.findByType('canvas').props['aria-hidden'], 'true')
  assert.equal(f.canvas.width, (300 + 96) * 2, 'Canvas resolution is capped at 2x')
  f.flush(80)
  assert.ok(f.strokes.length > 0)
  assert.equal(f.ctx.globalCompositeOperation, 'source-over')
  assert.ok(f.strokes.some(stroke => typeof stroke.color === 'string' && stroke.color.startsWith('rgba(24, 24, 27,')))
  await f.theme('dark')
  f.flush(2)
  assert.equal(f.ctx.globalCompositeOperation, 'lighter')
  assert.ok(f.strokes.some(stroke => typeof stroke.color === 'string' && stroke.color.startsWith('rgba(255, 255, 255,')))
  assert.equal(f.resizes.size, 1, 'Changing theme does not stack observers')
  await unmount(f.renderer)
})

test('offscreen and hidden cards pause, resize safely, resume, and release animation work on unmount', async t => {
  const f = await fixture(t)
  f.flush(2)
  for (const observer of f.visibility) observer.callback([{ isIntersecting: false }])
  assert.equal(f.frames.size, 0)
  for (const observer of f.visibility) observer.callback([{ isIntersecting: true }])
  assert.equal(f.frames.size, 1)
  f.document.hidden = true
  f.document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(f.frames.size, 0)
  f.document.hidden = false
  f.document.dispatchEvent(new Event('visibilitychange'))
  f.root.offsetWidth = 360
  for (const observer of f.resizes) observer.callback()
  assert.equal(f.canvas.width, (360 + 96) * 2)
  assert.equal(f.frames.size, 1)
  await unmount(f.renderer)
  assert.equal(f.frames.size, 0)
  assert.equal(f.resizes.size, 0)
  assert.equal(f.visibility.size, 0)
  f.window.dispatchEvent(new Event('resize'))
  assert.equal(f.frames.size, 0)
})

test('reduced motion settles to a static border, including hover and click, and can be changed live', async t => {
  const f = await fixture(t, { reduced: true })
  f.flush(200)
  assert.equal(f.frames.size, 0)
  const enter = new Event('pointerenter')
  Object.assign(enter, { clientX: 10, clientY: 5 })
  f.root.dispatchEvent(enter)
  f.flush(200)
  assert.equal(f.frames.size, 0, 'Hover does not create an endless RAF loop under reduced motion')
  const click = new Event('click')
  click.detail = 0
  f.root.dispatchEvent(click)
  assert.equal(f.frames.size, 0)
  f.motion(false)
  f.flush(10)
  assert.equal(f.frames.size, 1)
  f.motion(true)
  f.flush(200)
  assert.equal(f.frames.size, 0)
  await unmount(f.renderer)
})

test('missing observers or a missing canvas context leave the card content usable', async t => {
  const f = await fixture(t, { observers: false })
  f.flush(5)
  f.root.offsetWidth = 420
  f.window.dispatchEvent(new Event('resize'))
  assert.equal(f.canvas.width, (420 + 96) * 2)
  await unmount(f.renderer)
  const staticCard = await fixture(t, { canvasAvailable: false })
  assert.equal(staticCard.frames.size, 0)
  assert.equal(staticCard.renderer.root.findByType('article').children[0], 'Award content')
  await unmount(staticCard.renderer)
})
