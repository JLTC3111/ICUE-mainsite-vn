import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const box = (left = 0, top = 0, width = 1200, height = 900) => ({
  left, top, width, height, right: left + width, bottom: top + height,
})

async function fixture(t) {
  const dom = new JSDOM(`<html data-icue-home-theme="light"><body style="background:#f5f8fc">
    <header class="pill-site-header" style="background:rgba(255,255,255,.95)"><div id="camera"><button></button></div></header>
    <main id="content"><section class="home-hero">
      <div class="home-hero__media"><video class="video-bg"></video></div>
      <div class="home-hero__content">Hero</div>
    </section><section class="home-section">
      <div class="home-section__bg" style="background:#f5f8fc;pointer-events:none"></div>
      <div class="home-section__inner">Section<article style="background:#171e29">Card</article></div>
    </section><div class="about-container"><div class="about-waves-bg"></div><p>About</p></div></main>
    <footer style="background:#eaf1f8">Footer</footer>
    <aside class="contact-sidebar"><button class="music" style="background:transparent"></button></aside>
  </body></html>`, { pretendToBeVisual: true })
  t.after(() => dom.window.close())
  const { window } = dom, { document } = window
  window.innerWidth = 1200
  window.innerHeight = 900
  const music = document.querySelector('.music')
  const camera = document.querySelector('#camera')
  const header = document.querySelector('header')
  const video = document.querySelector('video')
  music.getBoundingClientRect = () => box(1125, 300, 50, 50)
  camera.getBoundingClientRect = () => box(950, 20, 36, 36)
  camera.querySelector('button').getBoundingClientRect = camera.getBoundingClientRect
  video.style.cssText = 'display:block;visibility:visible;opacity:1'
  video.getBoundingClientRect = () => box()
  let target = document.querySelector('.home-section__inner'), reads = 0, styles = 0
  const computedColors = new Map()
  document.elementFromPoint = () => target
  window.HTMLCanvasElement.prototype.getContext = () => { reads++; throw new Error('No pixel readback allowed') }
  const globals = {
    window, document, Element: window.Element, HTMLCanvasElement: window.HTMLCanvasElement,
    HTMLVideoElement: window.HTMLVideoElement, MutationObserver: window.MutationObserver,
    getComputedStyle(node, pseudo) {
      styles++
      if (pseudo) return { backgroundColor: 'transparent', backgroundImage: 'none' }
      const style = window.getComputedStyle(node)
      return computedColors.has(node)
        ? { backgroundColor: computedColors.get(node), backgroundImage: 'none' }
        : style
    },
  }
  const sampler = await sourceModule('shared/contact-sidebar/backgroundSampling.js', { globals })
  return { window, document, globals, music, camera, header, video, sampler, computedColors,
    target(selector) { target = document.querySelector(selector) },
    sample(el = music) { return sampler.readBackgroundSampleRgb(el) },
    reads: () => reads, styles: () => styles,
  }
}


test('Home collapse controls use a solid light surface only over exposed video and stay stable while sampling themselves', async t => {
  silenceRenderer(t)
  const f = await fixture(t)
  const controls = f.document.createElement('div')
  controls.className = 'floating-collapse-controls'
  controls.innerHTML = '<button style="background:#f8fafc"></button><button style="background:#f8fafc"></button>'
  f.document.querySelector('aside').prepend(controls)
  let controlRect = box(1100, 300, 90, 44)
  controls.getBoundingClientRect = () => controlRect
  f.target('.home-hero__content')
  let now = 1000, nextTimer = 0, toggles = 0
  const timers = new Map()
  f.window.setTimeout = (callback, delay) => {
    const id = ++nextTimer
    timers.set(id, { callback, at: now + delay })
    return id
  }
  f.window.clearTimeout = id => timers.delete(id)
  const globals = { ...f.globals, performance: { now: () => now } }
  const { useBackgroundAppearance } = await sourceModule('shared/contact-sidebar/useMusicBarColor.js', { globals })
  const { default: Controls } = await sourceModule('shared/ui/FloatingCollapseControls.jsx', { globals })
  const collapse = { collapsed: false, automatic: false, toggle() { toggles++ }, toggleAutomatic() {} }
  function Probe() {
    const ref = React.useRef(controls)
    const appearance = useBackgroundAppearance(ref)
    return React.createElement(Controls, {
      controlsRef: ref, iconColor: appearance.color, overVideo: appearance.overVideo, collapse,
      controlsId: 'rail', expandLabel: 'Expand', collapseLabel: 'Collapse',
      copy: { keepExpanded: 'Keep expanded', autoCollapse: 'Auto collapse', automatic: 'Auto' },
    })
  }
  let renderer
  await act(async () => {
    renderer = create(React.createElement(React.StrictMode, null, React.createElement(Probe)), {
      createNodeMock: node => node.type === 'button' ? controls.querySelector('button') : controls,
    })
  })
  const tick = async () => {
    await act(async () => {
      await Promise.resolve()
      now += 150
      for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback() }
    })
  }
  const surface = () => renderer.root.findByProps({ className: 'floating-collapse-controls' }).props.style
  const scroll = async () => { f.window.dispatchEvent(new f.window.Event('scroll')); await tick() }
  assert.equal(surface()['--floating-control-surface'], '#f8fafc')
  assert.equal(surface()['--floating-control-ink'], '#18334d')
  await scroll()
  assert.equal(surface()['--floating-control-surface'], '#f8fafc', 'a light button never masks its video backdrop from the sampler')
  f.document.documentElement.setAttribute('data-icue-home-theme', 'dark')
  await tick()
  assert.equal(surface()['--floating-control-surface'], '#f8fafc', 'video gets the same solid fill in either theme')
  await act(async () => renderer.root.findByProps({ className: 'floating-collapse__toggle' }).props.onClick())
  assert.equal(toggles, 1)
  f.target('.home-section__inner')
  await scroll()
  assert.equal(surface()['--floating-control-surface'], undefined)
  assert.equal(surface()['--floating-control-sampled-ink'], '#0a1a3a')
  f.target('article')
  await scroll()
  assert.equal(surface()['--floating-control-surface'], undefined, 'an opaque dark card is not mistaken for video')
  assert.equal(surface()['--floating-control-sampled-ink'], '#ffffff')
  f.document.documentElement.setAttribute('data-home-bg-video', 'off')
  const warp = f.document.createElement('div')
  warp.className = 'home-hero__warp'
  warp.style.cssText = 'display:block;visibility:visible;opacity:1'
  warp.setAttribute('data-warp-background', '#f8fafc')
  warp.getBoundingClientRect = () => box()
  f.document.querySelector('.home-hero__media').appendChild(warp)
  f.target('.home-hero__content')
  await tick()
  assert.equal(surface()['--floating-control-surface'], undefined, 'switching video off removes the surface over the warp')
  assert.equal(surface()['--floating-control-sampled-ink'], '#0a1a3a')
  warp.remove()
  const canvas = f.document.createElement('canvas')
  canvas.style.cssText = 'display:block;visibility:visible;opacity:1'
  canvas.getBoundingClientRect = () => box()
  f.document.querySelector('.home-hero__media').appendChild(canvas)
  await tick()
  assert.equal(surface()['--floating-control-surface'], undefined, 'a dark canvas also stays transparent')
  assert.equal(surface()['--floating-control-sampled-ink'], '#ffffff')
  f.document.documentElement.setAttribute('data-home-bg-video', 'on')
  await tick()
  assert.equal(surface()['--floating-control-surface'], '#f8fafc', 'video detection updates even when the sampled icon color stays white')
  controlRect = box(1100, 950, 44, 44)
  f.target('body')
  const transition = new f.window.Event('transitionend', { bubbles: true })
  Object.defineProperty(transition, 'propertyName', { value: 'grid-template-rows' })
  controls.dispatchEvent(transition)
  await tick()
  assert.equal(surface()['--floating-control-surface'], undefined, 'collapse layout changes recheck the final control position')
  assert.equal(f.reads(), 0)
  assert.equal(f.document.querySelector('aside').style.visibility, '')
  assert.equal(controls.style.pointerEvents, '')
  await unmount(renderer)
  assert.equal(timers.size, 0)
})

test('lazy gallery photo sampling keeps image contrast and falls back to the current CSS theme when readback is blocked', async t => {
  const f = await fixture(t)
  const gallery = f.document.createElement('section')
  gallery.style.background = '#f5f8fc'
  gallery.innerHTML = '<div class="swiper-slide"><img src="/photo.jpg"></div><button></button>'
  f.document.querySelector('main').appendChild(gallery)
  const image = gallery.querySelector('img')
  const arrow = gallery.querySelector('button')
  image.getBoundingClientRect = () => box(100, 100, 400, 200)
  arrow.getBoundingClientRect = () => box(115, 125, 40, 40)
  arrow.style.pointerEvents = 'auto'
  Object.defineProperties(image, {
    complete: { value: true }, naturalWidth: { value: 400 }, naturalHeight: { value: 200 },
  })
  f.document.elementFromPoint = () => image
  let contexts = 0, reads = 0, blocked = false
  f.window.HTMLCanvasElement.prototype.getContext = function () {
    contexts++
    return {
      drawImage(bitmap) { assert.equal(bitmap, image) },
      getImageData() {
        reads++
        if (blocked) throw new Error('Privacy protection blocks image readback')
        return { data: [20, 40, 80, 255, 60, 80, 120, 255, 255, 0, 0, 0] }
      },
    }
  }
  const { readElementBackdropRgb } = await sourceModule('shared/contact-sidebar/imageBackdropSampling.js', {
    globals: { ...f.globals, HTMLImageElement: f.window.HTMLImageElement },
  })
  assert.equal(contexts, 0, 'loading a gallery sampler does not allocate a canvas')
  assert.deepEqual(Array.from(readElementBackdropRgb(arrow)), [40, 60, 100])
  assert.equal(reads, 1)
  blocked = true
  assert.deepEqual(Array.from(readElementBackdropRgb(arrow)), [245, 248, 252])
  gallery.style.background = '#0c0f14'
  assert.deepEqual(Array.from(readElementBackdropRgb(arrow)), [12, 15, 20])
  image.remove()
  f.document.elementFromPoint = () => gallery
  const before = contexts
  assert.deepEqual(Array.from(readElementBackdropRgb(arrow)), [12, 15, 20])
  assert.equal(contexts, before, 'CSS-only surfaces never request a canvas context')
  assert.equal(arrow.style.pointerEvents, 'auto')
  assert.equal(f.document.querySelector('aside').style.visibility, '')
})

test('Home section and card surfaces take priority over background media in either palette', async t => {
  const f = await fixture(t)
  assert.deepEqual(Array.from(f.sample()), [245, 248, 252])
  f.target('article')
  assert.deepEqual(Array.from(f.sample()), [23, 30, 41], 'dark card over a light section')
  f.document.querySelector('article').style.background = '#ffffff'
  f.document.querySelector('.home-section__bg').style.background = '#0c0f14'
  f.document.documentElement.setAttribute('data-icue-home-theme', 'dark')
  assert.deepEqual(Array.from(f.sample()), [255, 255, 255], 'light card over a dark section')
  f.target('.home-section__inner')
  assert.deepEqual(Array.from(f.sample()), [12, 15, 20])
  f.target('footer')
  assert.deepEqual(Array.from(f.sample()), [234, 241, 248])
  assert.equal(f.reads(), 0)
  assert.equal(f.document.querySelector('aside').style.visibility, '')
  assert.equal(f.music.style.pointerEvents, '')
})

test('hero video keeps its media contrast while partially scrolled media cannot override light content', async t => {
  const f = await fixture(t)
  f.target('.home-hero__content')
  assert.equal(f.sample(), null, 'live hero uses the existing light-ink fallback')
  f.video.getBoundingClientRect = () => box(0, -650)
  f.target('body')
  assert.deepEqual(Array.from(f.sample()), [245, 248, 252], 'video is outside the icon position')
  const canvas = f.document.createElement('canvas')
  canvas.style.cssText = 'display:block;visibility:visible;opacity:1'
  canvas.getBoundingClientRect = () => box()
  f.document.querySelector('.home-hero__media').appendChild(canvas)
  f.target('.home-hero__content')
  assert.equal(f.sample(), null)
  assert.equal(f.reads(), 0)
})

test('camera contrast follows its own header capsule above video and warp backgrounds', async t => {
  const f = await fixture(t)
  f.target('.home-hero__content')
  assert.deepEqual(Array.from(f.sample(f.camera)), [255, 255, 255])
  f.header.style.background = 'rgba(10,14,20,.97)'
  const warp = f.document.createElement('div')
  warp.className = 'home-hero__warp'
  warp.style.cssText = 'display:block;visibility:visible;opacity:1'
  warp.setAttribute('data-warp-background', '#f8fafc')
  warp.getBoundingClientRect = () => box()
  f.document.querySelector('.home-hero__media').appendChild(warp)
  f.document.documentElement.setAttribute('data-home-bg-video', 'off')
  assert.deepEqual(Array.from(f.sample(f.camera)), [10, 14, 20])
  assert.deepEqual(Array.from(f.sample()), [248, 250, 252], 'transparent music control follows the warp')
  assert.equal(f.reads(), 0)
})

test('warp contrast uses the painted theme instead of a light CSS variable fallback', async t => {
  const f = await fixture(t)
  const { pickBarColor } = await sourceModule('shared/contact-sidebar/useMusicBarColor.js', { globals: f.globals })
  f.document.documentElement.setAttribute('data-home-bg-video', 'off')
  f.target('.home-hero__content')
  const warp = f.document.createElement('div')
  warp.className = 'home-hero__warp'
  warp.style.cssText = 'display:block;visibility:visible;opacity:1'
  warp.setAttribute('data-warp-background', 'var(--home-warp-background, linear-gradient(180deg, #ffffff, #f8fafc, #f1f5f9))')
  warp.getBoundingClientRect = () => box()
  f.document.querySelector('.home-hero__media').appendChild(warp)
  for (const [theme, background, rgb, ink] of [
    ['dark', 'linear-gradient(180deg, #0b1018, #101a28, #0c0f14)', [13, 19, 28], '#ffffff'],
    ['light', 'linear-gradient(180deg, #ffffff, #f8fafc, #f1f5f9)', [248, 250, 252], '#0a1a3a'],
    ['dark', '#0c0f14', [12, 15, 20], '#ffffff'],
  ]) {
    f.document.documentElement.setAttribute('data-icue-home-theme', theme)
    warp.style.background = background
    const sample = f.sample()
    assert.deepEqual(Array.from(sample), rgb)
    assert.equal(pickBarColor(sample), ink, `${theme}: transparent controls follow the rendered surface`)
  }
  assert.equal(f.reads(), 0, 'CSS theme sampling does not read canvas pixels')
})

test('People background CSS remains sampled when WebGL is unavailable or reduced motion replaces it', async t => {
  const f = await fixture(t)
  f.video.style.display = 'none'
  const background = f.document.querySelector('.about-waves-bg')
  background.className = 'interactive-bg'
  background.style.cssText = 'display:block;visibility:visible;opacity:1;background:#0a0e14'
  background.getBoundingClientRect = () => box()
  f.target('.about-container p')
  assert.deepEqual(Array.from(f.sample()), [10, 14, 20], 'dark CSS base before the canvas loads')
  const fallback = f.document.createElement('div')
  fallback.className = 'interactive-bg__fallback'
  fallback.style.cssText = 'display:block;visibility:visible;opacity:1;background:linear-gradient(160deg,#eef4fc,#e3ecf8,#d6e4f5)'
  fallback.getBoundingClientRect = () => box()
  background.appendChild(fallback)
  assert.ok(Array.from(f.sample()).every(channel => channel > 220), 'light fallback covers the dark base')
  assert.equal(f.reads(), 0)
})

test('About CSS waves and modern computed RGB colors remain adaptive without canvas access', async t => {
  const f = await fixture(t)
  f.video.style.display = 'none'
  const waves = f.document.querySelector('.about-waves-bg')
  waves.style.cssText = 'display:block;visibility:visible;opacity:1;background:#efe8dc'
  waves.getBoundingClientRect = () => box()
  f.target('.about-container p')
  assert.deepEqual(Array.from(f.sample()), [239, 232, 220])
  waves.style.background = '#07131b'
  assert.deepEqual(Array.from(f.sample()), [7, 19, 27])
  f.target('footer')
  const footer = f.document.querySelector('footer')
  f.computedColors.set(footer, 'rgb(245 248 252 / 95%)')
  assert.deepEqual(Array.from(f.sample()), [245, 248, 252])
  f.computedColors.set(footer, 'rgb(10% 20% 30%)')
  Array.from(f.sample()).forEach((channel, index) => assert.ok(Math.abs(channel - [25.5, 51, 76.5][index]) < 0.001))
  assert.equal(f.reads(), 0)
})

test('standalone pages resample shell theme changes and content surfaces without a content ID', async t => {
  silenceRenderer(t)
  const f = await fixture(t)
  f.video.style.display = 'none'
  const main = f.document.querySelector('main')
  main.removeAttribute('id')
  main.className = 'page-shell__main'
  const shell = f.document.createElement('div')
  shell.className = 'page-shell'
  main.replaceWith(shell)
  shell.appendChild(main)
  const stylesheet = f.document.createElement('style')
  stylesheet.textContent = '.page-shell__main { background:#f8fafc } .page-shell--interactive-bg .page-shell__main { background:#0b0f14 }'
  f.document.head.appendChild(stylesheet)
  f.target('main')
  let now = 1000, color, nextTimer = 0
  const timers = new Map()
  f.window.setTimeout = (callback, delay) => {
    const id = ++nextTimer
    timers.set(id, { callback, at: now + delay })
    return id
  }
  f.window.clearTimeout = id => timers.delete(id)
  const { useBackgroundContrastColor } = await sourceModule('shared/contact-sidebar/useMusicBarColor.js', {
    globals: { ...f.globals, performance: { now: () => now } },
  })
  function Probe() {
    const ref = React.useRef(f.music)
    color = useBackgroundContrastColor(ref)
    return null
  }
  const tick = async () => {
    await act(async () => {
      await Promise.resolve()
      now += 150
      for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback() }
    })
  }
  let renderer
  await act(async () => { renderer = create(React.createElement(Probe)) })
  assert.equal(color, '#0a1a3a')
  shell.classList.add('page-shell--interactive-bg')
  await tick()
  assert.equal(color, '#ffffff')
  main.style.backgroundColor = '#ffffff'
  await tick()
  assert.equal(color, '#0a1a3a')
  await unmount(renderer)
  assert.equal(timers.size, 0)
})

test('camera hook updates on Home theme changes, preserves toggling, and stops observing when hidden', async t => {
  silenceRenderer(t)
  const f = await fixture(t)
  let now = 1000, nextTimer = 0, changed
  const timers = new Map()
  f.window.setTimeout = (callback, delay) => {
    const id = ++nextTimer
    timers.set(id, { callback, at: now + delay })
    return id
  }
  f.window.clearTimeout = id => timers.delete(id)
  f.window.matchMedia = () => ({ matches: true })
  const { default: VideoToggle } = await sourceModule('shared/main-site-nav/VideoToggle.jsx', {
    globals: { ...f.globals, performance: { now: () => now } },
    imports: { 'react-dom': { flushSync: callback => callback() } },
  })
  let renderer
  const props = { id: 'home-camera', animated: true, checked: false, onCheckedChange: value => { changed = value } }
  const render = visible => React.createElement(React.StrictMode, null, React.createElement(VideoToggle, { ...props, visible }))
  const tick = async () => {
    await act(async () => {
      await Promise.resolve()
      now += 150
      for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback() }
    })
  }
  await act(async () => {
    renderer = create(render(true), { createNodeMock: node => node.type === 'button' ? f.camera.querySelector('button') : f.camera })
  })
  const button = () => renderer.root.findByType('button')
  assert.equal(button().props.style.color, '#0a1a3a')
  await act(async () => button().props.onClick())
  assert.equal(changed, true)
  f.header.style.background = '#0a0e14'
  f.document.documentElement.setAttribute('data-icue-home-theme', 'dark')
  await tick()
  assert.equal(button().props.style.color, '#ffffff')
  f.header.style.background = '#ffffff'
  f.document.documentElement.setAttribute('data-icue-home-theme', 'light')
  await tick()
  assert.equal(button().props.style.color, '#0a1a3a')
  f.header.style.background = '#0a0e14'
  f.header.setAttribute('data-over-hero', 'true')
  await tick()
  assert.equal(button().props.style.color, '#ffffff', 'camera also reacts when scrolling changes only the header surface')
  await act(async () => renderer.update(render(false)))
  assert.equal(renderer.toJSON(), null)
  assert.equal(timers.size, 0)
  const styles = f.styles()
  f.document.documentElement.setAttribute('data-icue-home-theme', 'dark')
  await tick()
  assert.equal(f.styles(), styles)
  await unmount(renderer)
  assert.equal(timers.size, 0)
})
