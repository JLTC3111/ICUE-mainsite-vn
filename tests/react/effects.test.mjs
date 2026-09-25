import test from 'node:test'
import assert from 'node:assert/strict'
import {
  React, act, create as createRenderer, i18n, platform, silenceRenderer, sourceModule, unmount,
} from '../../shared/resilience/testHarness.js'

function create(element, options) {
  const strict = child => React.createElement(React.StrictMode, null, child)
  const renderer = createRenderer(strict(element), options)
  const update = renderer.update.bind(renderer)
  renderer.update = child => update(strict(child))
  return renderer
}

function browser() {
  const f = platform()
  const frames = new Map()
  const timers = new Map()
  const queries = new Map()
  const observers = new Set()
  const scrolls = []
  let id = 0
  class Observer {
    constructor(callback) { this.callback = callback }
    observe() { observers.add(this) }
    disconnect() { observers.delete(this) }
  }
  Object.assign(f.window, {
    innerWidth: 1200, innerHeight: 900, scrollY: 0,
    scrollTo: value => scrolls.push(value),
    setTimeout: callback => { timers.set(++id, callback); return id },
    clearTimeout: key => timers.delete(key),
    location: { hash: '' },
    history: { replaceState: (_state, _title, hash) => { f.window.location.hash = hash } },
    matchMedia(query) {
      if (!queries.has(query)) queries.set(query, Object.assign(new EventTarget(), { matches: false }))
      return queries.get(query)
    },
  })
  const globals = {
    ...f,
    ResizeObserver: Observer,
    IntersectionObserver: Observer,
    requestAnimationFrame: callback => { frames.set(++id, callback); return id },
    cancelAnimationFrame: key => frames.delete(key),
  }
  return {
    ...f, globals, frames, timers, observers, scrolls,
    flushFrames() { const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback()) },
    flushTimers() { const batch = [...timers.values()]; timers.clear(); batch.forEach(callback => callback()) },
    setMedia(query, matches) {
      const media = f.window.matchMedia(query)
      media.matches = matches
      media.dispatchEvent(new Event('change'))
    },
  }
}

function carousel(length = 3, index = 0) {
  const events = new Map()
  const viewport = { style: {} }
  const slide = () => ({ scrollHeight: 450, offsetHeight: 400, querySelectorAll: () => [] })
  const api = {
    index, length,
    selectedScrollSnap: () => api.index,
    canScrollPrev: () => api.index > 0,
    canScrollNext: () => api.index < api.length - 1,
    on(event, listener) {
      if (!events.has(event)) events.set(event, new Set())
      events.get(event).add(listener)
      return api
    },
    off(event, listener) { events.get(event)?.delete(listener); return api },
    emit(event) { for (const listener of [...events.get(event) || []]) listener(api, event) },
    scrollTo(next) {
      const bounded = Math.max(0, Math.min(api.length - 1, next))
      if (bounded !== api.index) { api.index = bounded; api.emit('select') }
    },
    scrollPrev: () => api.scrollTo(api.index - 1),
    scrollNext: () => api.scrollTo(api.index + 1),
    reInit() { api.index = Math.max(0, Math.min(api.length - 1, api.index)); api.emit('reInit') },
    rootNode: () => viewport,
    slideNodes: () => Array.from({ length: api.length }, slide),
    listenerCount: () => [...events.values()].reduce((sum, listeners) => sum + listeners.size, 0),
  }
  return api
}

test('Embla selection handles a late API, selection, changed boundaries, and replacement without stale listeners', async t => {
  silenceRenderer(t)
  const { default: useSelection } = await sourceModule('news-app/src/hooks/useEmblaSelection.js')
  let latest
  function Probe({ api }) { latest = useSelection(api); return null }
  let renderer
  await act(async () => { renderer = create(React.createElement(Probe)) })
  assert.equal(latest.selectedIndex, 0)
  assert.equal(latest.canScrollNext, false)
  const first = carousel(3, 1)
  await act(async () => renderer.update(React.createElement(Probe, { api: first })))
  assert.equal(latest.selectedIndex, 1)
  await act(async () => first.scrollNext())
  assert.equal(latest.selectedIndex, 2)
  assert.equal(latest.canScrollNext, false)
  await act(async () => { first.length = 4; first.reInit() })
  assert.equal(latest.selectedIndex, 2)
  assert.equal(latest.canScrollNext, true, 'reInit must update arrows even when the index is unchanged')
  const second = carousel(1)
  await act(async () => renderer.update(React.createElement(Probe, { api: second })))
  assert.equal(first.listenerCount(), 0)
  assert.equal(latest.selectedIndex, 0)
  assert.equal(latest.canScrollPrev, false)
  await unmount(renderer)
  assert.equal(second.listenerCount(), 0)
})

test('comparison carousel keeps its active slide and dots synchronized after selection and a shorter gallery', async t => {
  silenceRenderer(t)
  const f = browser()
  const api = carousel(3, 1)
  const { default: Carousel } = await sourceModule('news-app/src/components/ArticleComparisonCarousel.jsx', {
    globals: f.globals,
    imports: {
      'react-i18next': i18n,
      'embla-carousel-react': { default: () => [() => {}, api] },
      '../context/PerformanceProfileContext': { usePerformanceProfile: () => ({ disableParallax: true, reduceMotion: true }) },
      './ArticleImageComparison': { default: () => null },
    },
  })
  const pairs = Array.from({ length: 3 }, (_, i) => ({ before: { id: `b${i}` }, after: { id: `a${i}` } }))
  let renderer
  await act(async () => { renderer = create(React.createElement(Carousel, { pairs })) })
  const selected = () => renderer.root.findAllByType('button').findIndex(button => button.props['aria-current'] === 'true')
  assert.equal(selected(), 1)
  await act(async () => renderer.root.findAllByType('button')[2].props.onClick())
  assert.equal(selected(), 2)
  await act(async () => { api.length = 2; renderer.update(React.createElement(Carousel, { pairs: pairs.slice(0, 2) })) })
  assert.equal(selected(), 1)
  await unmount(renderer)
  assert.equal(api.listenerCount(), 0)
  assert.equal(f.frames.size, 0)
})

test('paged articles restore deep links and keep arrows, keyboard navigation, page callbacks, and hashes aligned', async t => {
  silenceRenderer(t)
  const f = browser()
  f.window.location.hash = '#page-3'
  const api = carousel()
  let availableApi
  const changes = []
  const { default: Pages } = await sourceModule('news-app/src/components/ArticlePagedContent.jsx', {
    globals: f.globals,
    imports: {
      'react-i18next': i18n,
      'lucide-react': { ChevronLeft: () => null, ChevronRight: () => null },
      'embla-carousel-react': { default: () => [() => {}, availableApi] },
      './magicui/SlidingNumber': { default: ({ value }) => React.createElement('output', null, value) },
      './ArticleHtmlContent': { default: ({ html }) => React.createElement('p', null, html) },
      '../lib/articlePagination': { paginateArticleHtml: html => html.split('|') },
      '../lib/articleDropCap': { markDropCapInHtml: html => html },
    },
  })
  const onPageChange = (index, total) => changes.push([index, total])
  let renderer
  await act(async () => { renderer = create(React.createElement(Pages, { html: 'one|two|three', contentKey: 'a', onPageChange }), {
    createNodeMock: () => ({ getBoundingClientRect: () => ({ top: 200 }) }),
  }) })
  assert.equal(f.window.location.hash, '#page-3', 'the incoming link must survive Embla initialization')
  availableApi = api
  await act(async () => renderer.update(React.createElement(Pages, { html: 'one|two|three', contentKey: 'a', onPageChange })))
  const selected = () => renderer.root.findAllByType('article').findIndex(page => !page.props['aria-hidden'])
  assert.equal(selected(), 2)
  assert.equal(f.window.location.hash, '#page-3')
  assert.equal(renderer.root.findAllByType('button')[1].props.disabled, true)
  assert.deepEqual(changes.at(-1), [2, 3])
  assert.equal(f.scrolls.length, 0, 'restoring a deep link must not trigger a user scroll')
  await act(async () => f.flushFrames())
  await act(async () => {
    const event = new Event('keydown', { cancelable: true })
    Object.defineProperty(event, 'key', { value: 'ArrowLeft' })
    f.window.dispatchEvent(event)
  })
  assert.equal(selected(), 1)
  assert.equal(f.window.location.hash, '#page-2')
  assert.deepEqual(changes.at(-1), [1, 3])
  assert.equal(f.scrolls.length, 1)
  await act(async () => renderer.root.findAllByType('button')[0].props.onClick())
  assert.equal(selected(), 0)
  assert.equal(renderer.root.findAllByType('button')[0].props.disabled, true)
  await unmount(renderer)
  assert.equal(api.listenerCount(), 0)
  assert.equal(f.observers.size, 0)
})

test('outside clicks use the latest committed handler and ignore handlers from a suspended render', async t => {
  silenceRenderer(t)
  const f = browser()
  const inside = {}
  const ref = { current: { contains: node => node === inside } }
  const pending = new Promise(() => {})
  const calls = []
  const { default: useClickOutside } = await sourceModule('news-app/src/hooks/useClickOutside.js', { globals: f.globals })
  function Probe({ label, suspend }) {
    useClickOutside(ref, () => calls.push(label))
    if (suspend) throw pending
    return null
  }
  const element = (label, suspend = false) => React.createElement(React.Suspense, { fallback: null }, React.createElement(Probe, { label, suspend }))
  const click = target => {
    const event = new Event('pointerdown')
    Object.defineProperty(event, 'target', { value: target })
    f.document.dispatchEvent(event)
  }
  let renderer
  await act(async () => { renderer = create(element('first')) })
  await act(async () => click(inside))
  assert.deepEqual(calls, [])
  await act(async () => renderer.update(element('latest')))
  await act(async () => React.startTransition(() => renderer.update(element('uncommitted', true))))
  await act(async () => click({}))
  assert.deepEqual(calls, ['latest'])
  await unmount(renderer)
  click({})
  assert.deepEqual(calls, ['latest'])
})

test('popovers clear their exposed style when closed and measure the new position before reopening', async t => {
  silenceRenderer(t)
  const f = browser()
  let rect = { left: 100, top: 100, bottom: 140, width: 200 }
  const ref = { current: { getBoundingClientRect: () => rect } }
  const { usePopoverPosition } = await sourceModule('news-app/src/hooks/usePopoverPosition.js', { globals: f.globals })
  let style
  function Probe({ open }) { style = usePopoverPosition(open, ref); return null }
  let renderer
  await act(async () => { renderer = create(React.createElement(Probe, { open: true })) })
  assert.equal(style.top, '146px')
  await act(async () => renderer.update(React.createElement(Probe, { open: false })))
  assert.equal(style, null)
  rect = { left: 900, top: 780, bottom: 820, width: 200 }
  await act(async () => f.window.dispatchEvent(new Event('resize')))
  assert.equal(style, null)
  await act(async () => renderer.update(React.createElement(Probe, { open: true })))
  assert.equal(style.bottom, '126px')
  assert.equal(style.left, '868px')
  rect = { left: 50, top: 100, bottom: 140, width: 200 }
  await act(async () => f.window.dispatchEvent(new Event('scroll')))
  assert.equal(style.top, '146px')
  await unmount(renderer)
})

test('comparison image sizing ignores obsolete loads and old measurements after the image pair changes', async t => {
  silenceRenderer(t)
  const f = browser()
  const pending = []
  class Image {
    set src(url) { this.url = url; pending.push(this) }
  }
  const load = (url, width, height) => {
    for (const image of pending.filter(image => image.url === url)) {
      image.naturalWidth = width
      image.naturalHeight = height
      image.onload()
    }
  }
  const { default: Comparison } = await sourceModule('news-app/src/components/ArticleImageComparison.jsx', {
    globals: { ...f.globals, Image },
    imports: {
      'react-i18next': i18n,
      './motion-primitives/ImageComparison': {
        ImageComparison: ({ children }) => React.createElement('div', null, children),
        ImageComparisonImage: () => null, ImageComparisonSlider: () => null,
      },
    },
  })
  const element = (pair, fitContent = true) => React.createElement(Comparison, { before: { url: `before-${pair}` }, after: { url: `after-${pair}` }, fitContent })
  let renderer
  await act(async () => { renderer = create(element('a'), { createNodeMock: () => ({ clientWidth: 300 }) }) })
  const style = () => renderer.root.findByProps({ className: 'article-image-comparison__sizer' }).props.style
  await act(async () => { load('before-a', 200, 100); load('after-a', 100, 200) })
  assert.equal(style().height, 600)
  await act(async () => renderer.update(element('b')))
  assert.equal(style().height, undefined)
  await act(async () => renderer.update(element('c')))
  await act(async () => { load('before-b', 100, 800); load('after-b', 100, 800) })
  assert.equal(style().height, undefined)
  await act(async () => { load('before-c', 400, 200); load('after-c', 400, 200) })
  assert.equal(style().height, 150)
  await act(async () => renderer.update(element('c', false)))
  assert.equal(renderer.root.findAllByProps({ className: 'article-image-comparison__sizer' }).length, 0)
  await act(async () => renderer.update(React.createElement(Comparison, { fitContent: true })))
  assert.equal(renderer.toJSON(), null)
  await unmount(renderer)
  assert.equal(f.observers.size, 0)
})

test('view counts reset on changed props, reject obsolete animation updates, and honor reduced motion', async t => {
  silenceRenderer(t)
  const animations = []
  let reduced = false
  const { default: Counter } = await sourceModule('news-app/src/components/ArticleViewCounter.jsx', {
    imports: {
      'react-i18next': i18n,
      'motion/react': { animate: (_from, _to, options) => {
        const animation = { options, stopped: false, stop() { this.stopped = true } }
        animations.push(animation)
        return animation
      } },
      '../hooks/useMediaQuery': { default: () => reduced },
      './icons/DevIcon174': { default: () => null },
      './magicui/SlidingNumber': { default: ({ value }) => React.createElement('output', null, value), SLOW_SPRING: {} },
    },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(Counter, { count: 20 })) })
  const value = () => Number(renderer.root.findByType('output').children[0])
  const hover = () => renderer.root.findAllByType('span')[0].props.onMouseEnter()
  assert.equal(value(), 20)
  await act(async () => { hover(); animations[0].options.onUpdate(7.2) })
  assert.equal(value(), 7)
  await act(async () => renderer.update(React.createElement(Counter, { count: 30 })))
  assert.equal(value(), 30)
  assert.equal(animations[0].stopped, true)
  await act(async () => animations[0].options.onUpdate(10))
  assert.equal(value(), 30)
  await act(async () => renderer.update(React.createElement(Counter, { count: 20 })))
  assert.equal(value(), 20)
  await act(async () => { hover(); animations[1].options.onComplete() })
  assert.equal(value(), 20)
  reduced = true
  await act(async () => renderer.update(React.createElement(Counter, { count: 20 })))
  await act(async () => hover())
  assert.equal(animations.length, 2)
  reduced = false
  await act(async () => renderer.update(React.createElement(Counter, { count: 20 })))
  await act(async () => hover())
  await unmount(renderer)
  assert.equal(animations[2].stopped, true)
})

test('comparison reveals settle for static/reduced motion and cancel pending work without replaying', async t => {
  silenceRenderer(t)
  const f = browser()
  const { default: Card } = await sourceModule('news-app/src/components/BentoCardComparison.jsx', { globals: f.globals })
  const element = (staticSplit = false) => React.createElement(Card, { before: { url: 'before' }, after: { url: 'after' }, staticSplit })
  let renderer
  await act(async () => { renderer = create(element(), { createNodeMock: () => ({}) }) })
  assert.equal(f.observers.size, 1)
  await act(async () => [...f.observers][0].callback([{ isIntersecting: true }]))
  assert.equal(f.timers.size, 1)
  await act(async () => renderer.update(element(true)))
  assert.equal(f.timers.size, 0)
  assert.match(renderer.toJSON().props.className, /is-static/)
  const beforeStyle = () => renderer.root.findByProps({ className: 'bento-card-comparison__before' }).props.style
  assert.equal(beforeStyle().clipPath, 'inset(0 50% 0 0)')
  await act(async () => renderer.update(element(false)))
  assert.equal(f.observers.size, 0)
  assert.equal(beforeStyle().clipPath, 'inset(0 50% 0 0)')
  await unmount(renderer)

  f.setMedia('(prefers-reduced-motion: reduce)', true)
  await act(async () => { renderer = create(element(), { createNodeMock: () => ({}) }) })
  assert.match(renderer.toJSON().props.className, /is-static/)
  assert.equal(f.observers.size, 0)
  await act(async () => f.setMedia('(prefers-reduced-motion: reduce)', false))
  assert.equal(f.observers.size, 0, 'turning motion back on must not replay an already settled card')
  await unmount(renderer)

  await act(async () => { renderer = create(element(), { createNodeMock: () => ({}) }) })
  await act(async () => [...f.observers][0].callback([{ isIntersecting: true }]))
  await act(async () => f.flushTimers())
  assert.match(renderer.toJSON().props.className, /--reveal/)
  await act(async () => renderer.root.findByProps({ className: 'bento-card-comparison__before' }).props.onTransitionEnd({ propertyName: 'clip-path' }))
  assert.match(renderer.toJSON().props.className, /--split/)
  await unmount(renderer)
  assert.equal(f.observers.size, 0)
  assert.equal(f.timers.size, 0)
})

test('scroll progress switches between page progress and scroll tracking without reading refs during render', async t => {
  silenceRenderer(t)
  const scroll = { value: 0.25 }
  let scrollOptions
  const containerRef = { get current() { throw new Error('ref read during component render') } }
  const { default: Progress } = await sourceModule('news-app/src/components/ScrollProgress.jsx', {
    imports: { 'motion/react': {
      motion: { div: 'div' },
      useScroll: options => { scrollOptions = options; return { scrollYProgress: scroll } },
      useSpring: source => source,
      useMotionValue: initial => React.useMemo(() => ({ value: initial, set(value) { this.value = value } }), []),
    } },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(Progress, { containerRef })) })
  const source = () => renderer.root.findAllByType('div')[1].props.style.scaleX
  assert.equal(scrollOptions.container, containerRef)
  assert.equal(source(), scroll)
  await act(async () => renderer.update(React.createElement(Progress, { containerRef, progress: 0.75 })))
  assert.equal(source().value, 0.75)
  await act(async () => renderer.update(React.createElement(Progress, { containerRef, progress: 1 })))
  assert.equal(source().value, 1)
  await act(async () => renderer.update(React.createElement(Progress, { containerRef })))
  assert.equal(source(), scroll)
  await unmount(renderer)
})
