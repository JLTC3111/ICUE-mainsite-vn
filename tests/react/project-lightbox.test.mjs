import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { createPortal } = require('react-dom')

const images = [
  { src: '/original-landscape.webp', width: 960, height: 720 },
  { src: '/original-portrait.jpg', width: 1024, height: 1450 },
  { src: '/original-wide-plan.jpg', width: 3300, height: 1500 },
]
const labels = { closeImage: 'Close image', previousImage: 'Previous image', nextImage: 'Next image' }

async function fixture(t, { pictures = images, initialIndex = 1 } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><main><button id="trigger">Open gallery</button><div id="root"></div></main></body></html>', {
    pretendToBeVisual: true, url: 'https://vi.icue.test/past-projects/4',
  })
  const { window } = dom, { document } = window
  const originals = new Map()
  for (const [name, value] of Object.entries({ window, document })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  let root
  t.after(async () => {
    if (root) await act(async () => root.unmount())
    dom.window.close()
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  })
  window.matchMedia = () => Object.assign(new window.EventTarget(), { matches: false })
  document.documentElement.style.overflow = 'clip'
  document.body.style.overflow = 'auto'
  let modalOpens = 0, modalCloses = 0, closeRequests = 0, latestSwiperProps, swiperApi
  window.HTMLDialogElement.prototype.showModal = function () {
    assert.ok(this.isConnected, 'the portal is attached before opening the native modal')
    assert.equal(this.open, false)
    this.open = true
    modalOpens++
  }
  window.HTMLDialogElement.prototype.close = function () {
    if (!this.open) return
    this.open = false
    modalCloses++
    // Browsers queue this event; StrictMode cleanup must not request a user close.
    queueMicrotask(() => this.dispatchEvent(new window.Event('close')))
  }
  const modules = { A11y: Symbol('A11y'), Mousewheel: Symbol('Mousewheel') }
  function Swiper(props) {
    latestSwiperProps = props
    const current = React.useRef(props)
    current.current = props
    const [active, setActive] = React.useState(props.initialSlide || 0)
    const api = React.useRef(null)
    if (!api.current) {
      const change = next => {
        const count = React.Children.count(current.current.children)
        const index = Math.max(0, Math.min(count - 1, next))
        api.current.activeIndex = index
        api.current.realIndex = index
        setActive(index)
        current.current.onSlideChange?.(api.current)
      }
      api.current = {
        activeIndex: props.initialSlide || 0,
        realIndex: props.initialSlide || 0,
        slideTo: change,
        slideNext() {
          const count = React.Children.count(current.current.children)
          change(this.realIndex === count - 1 && current.current.rewind ? 0 : this.realIndex + 1)
        },
        slidePrev() {
          const count = React.Children.count(current.current.children)
          change(this.realIndex === 0 && current.current.rewind ? count - 1 : this.realIndex - 1)
        },
      }
    }
    React.useLayoutEffect(() => {
      assert.equal(document.querySelector('dialog').open, true, 'Swiper measures an already open modal')
      swiperApi = api.current
      current.current.onSwiper?.(api.current)
    }, [])
    return React.createElement('div', { className: props.className, 'data-active-slide': active, onWheelCapture: props.onWheelCapture }, props.children)
  }
  const icon = () => React.createElement('svg', { 'aria-hidden': true })
  const { default: ProjectLightbox } = await sourceModule('home-app/src/components/ProjectLightbox.jsx', {
    globals: { window, document }, imports: {
      'react-dom': { createPortal },
      'swiper/modules': modules,
      'swiper/css': {}, 'swiper/css/a11y': {},
      'swiper/react': { Swiper, SwiperSlide: ({ children, ...props }) => React.createElement('div', props, children) },
      'lucide-react': { ChevronLeft: icon, ChevronRight: icon, X: icon },
    },
  })
  const trigger = document.getElementById('trigger')
  trigger.focus()
  root = createRoot(document.getElementById('root'))
  function Host() {
    const [open, setOpen] = React.useState(true)
    return open ? React.createElement(ProjectLightbox, {
      images: pictures, initialIndex, title: 'Project planning gallery', labels,
      returnFocus: trigger, onClose: () => { closeRequests++; setOpen(false) },
    }) : null
  }
  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Host))))
  const control = name => document.querySelector(`button[aria-label="${labels[name]}"]`)
  const count = () => document.querySelector('[aria-live="polite"]').textContent.replace(/\s+/g, ' ').trim()
  const click = name => act(async () => control(name).click())
  const key = async key => {
    const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    await act(async () => document.activeElement.dispatchEvent(event))
    return event
  }
  return {
    window, document, trigger, root, control, count, click, key, modules,
    dialog: () => document.querySelector('dialog'),
    params: () => latestSwiperProps,
    api: () => swiperApi,
    calls: () => ({ modalOpens, modalCloses, closeRequests }),
  }
}

test('project lightbox opens the selected original in a native modal and restores focus and scroll styles after close', async t => {
  const f = await fixture(t)
  assert.equal(f.dialog().parentElement, f.document.body, 'the modal escapes page clipping and stacking contexts')
  assert.equal(f.dialog().getAttribute('role'), 'dialog')
  assert.equal(f.dialog().getAttribute('aria-modal'), 'true')
  assert.equal(f.dialog().getAttribute('aria-label'), 'Project planning gallery')
  assert.ok(f.calls().modalOpens >= 2, 'native lifecycle survives StrictMode effect replay')
  assert.equal(f.calls().closeRequests, 0, 'effect replay close events do not close the viewer')
  assert.equal(f.document.activeElement, f.control('closeImage'))
  assert.equal(f.document.body.style.overflow, 'hidden')
  assert.equal(f.document.documentElement.style.overflow, 'hidden')
  assert.equal(f.params().initialSlide, 1)
  assert.equal(f.count(), '2 / 3')
  assert.equal(f.params().simulateTouch, true, 'mouse drag remains enabled at the Swiper boundary')
  assert.equal(f.params().allowTouchMove, true)
  assert.equal(f.params().grabCursor, true)
  assert.ok(f.params().modules.includes(f.modules.Mousewheel))
  assert.equal(f.params().mousewheel.releaseOnEdges, false, 'wheel gestures stay inside the modal')
  for (const [index, image] of [...f.dialog().querySelectorAll('img')].entries()) {
    assert.equal(image.getAttribute('src'), images[index].src)
    assert.equal(image.width, images[index].width)
    assert.equal(image.height, images[index].height)
    assert.equal(image.draggable, false, 'native image dragging cannot steal a swipe')
  }
  await f.click('closeImage')
  assert.equal(f.dialog(), null)
  assert.equal(f.calls().closeRequests, 1)
  assert.equal(f.document.activeElement, f.trigger)
  assert.equal(f.document.body.style.overflow, 'auto')
  assert.equal(f.document.documentElement.style.overflow, 'clip')
})

test('project lightbox navigation stays in sync, contains keyboard events and handles native Escape cancellation', async t => {
  const f = await fixture(t)
  const escapedKeys = []
  f.window.addEventListener('keydown', event => escapedKeys.push(event.key))
  await act(async () => f.dialog().querySelector('img').click())
  assert.ok(f.dialog(), 'activating the image does not act as a backdrop close')
  await f.click('nextImage')
  assert.equal(f.count(), '3 / 3')
  assert.equal((await f.key('ArrowRight')).defaultPrevented, true)
  assert.equal(f.count(), '1 / 3', 'navigation rewinds without duplicating Swiper slides')
  await f.key('ArrowLeft')
  assert.equal(f.count(), '3 / 3')
  await f.key('Home')
  assert.equal(f.count(), '1 / 3')
  await f.key('End')
  assert.equal(f.count(), '3 / 3')
  await f.click('previousImage')
  assert.equal(f.count(), '2 / 3')
  assert.deepEqual(escapedKeys, [], 'background page shortcuts never receive modal navigation keys')
  const cancel = new f.window.Event('cancel', { cancelable: true })
  await act(async () => f.dialog().dispatchEvent(cancel))
  assert.equal(cancel.defaultPrevented, true)
  assert.equal(f.dialog(), null, 'Escape removes the React modal as well as the native dialog')
  assert.equal(f.calls().closeRequests, 1)
  assert.equal(f.document.activeElement, f.trigger)
})

test('a single-image modal has no unavailable navigation controls or wheel capture', async t => {
  const f = await fixture(t, { pictures: images.slice(0, 1), initialIndex: 0 })
  assert.equal(f.count(), '1 / 1')
  assert.equal(f.control('previousImage'), null)
  assert.equal(f.control('nextImage'), null)
  assert.equal(f.params().allowTouchMove, false)
  assert.equal(f.params().mousewheel, false)
  await f.key('ArrowRight')
  assert.equal(f.count(), '1 / 1')
  await f.click('closeImage')
  assert.equal(f.document.activeElement, f.trigger)
})
