import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, deferred, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')

async function reactionFixture(t, { initialLiked = false, initialCount = 8, delayedRead = false } = {}) {
  silenceRenderer(t)
  const reads = [], writes = [], readGate = delayedRead ? deferred() : null
  const state = new Map([
    ['one:heart', { liked: initialLiked, count: initialCount }],
    ['one:clap', { clapped: initialLiked, count: initialCount }],
    ['two:heart', { liked: false, count: 31 }],
    ['two:clap', { clapped: true, count: 14 }],
  ])
  const get = (kind, id, options) => {
    reads.push({ kind, id, signal: options.signal })
    if (readGate && reads.length === 1) return readGate.promise
    return Promise.resolve({ ...state.get(`${id}:${kind}`) })
  }
  const toggle = (kind, id) => {
    const request = deferred()
    writes.push({ kind, id, ...request })
    return request.promise.then(value => { state.set(`${id}:${kind}`, value); return value })
  }
  function PulseBoundary({ liked, count, onChange, disabled, busy, label, className }) {
    return React.createElement('button', {
      type: 'button', disabled, 'aria-pressed': liked, 'aria-busy': busy,
      'aria-label': `${label}, ${count}`, 'data-count': count, className,
      onClick: () => onChange(!liked, count + (liked ? -1 : 1)),
    }, String(count))
  }
  const imports = {
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'en', language: 'en' } }) },
    '../../../shared/resilience/usePageResume.js': { useResumeRevision: () => [0] },
    './react-bits/PulseHeart': { default: PulseBoundary },
    '../lib/engagement': {
      getHearts: (id, options) => get('heart', id, options),
      getClaps: (id, options) => get('clap', id, options),
      toggleHeart: id => toggle('heart', id),
      toggleClap: id => toggle('clap', id),
    },
  }
  const [{ default: Heart }, { default: Clap }] = await Promise.all([
    sourceModule('news-app/src/components/HeartButton.jsx', { imports }),
    sourceModule('news-app/src/components/ClapButton.jsx', { imports }),
  ])
  function Reactions({ articleId = 'one', kinds = ['heart', 'clap'] }) {
    return React.createElement(React.Fragment, null, kinds.map(kind => React.createElement(kind === 'heart' ? Heart : Clap, {
      key: `${articleId}:${kind}`, articleId,
    })))
  }
  let renderer
  await act(async () => { renderer = create(React.createElement(Reactions)) })
  t.after(() => unmount(renderer))
  return {
    renderer, reads, writes, readGate, Reactions,
    button: kind => renderer.root.findAllByType('button').find(button => button.props.className === `${kind}-btn`),
    update: props => act(async () => renderer.update(React.createElement(Reactions, props))),
  }
}

test('article reactions load server state and block duplicate writes before React commits', async t => {
  const f = await reactionFixture(t, { delayedRead: true })
  assert.equal(f.button('heart').props.disabled, true, 'unread state is not interactive')
  await act(async () => f.readGate.resolve({ liked: false, count: 8 }))
  assert.equal(f.button('heart').props.disabled, false)
  assert.equal(f.button('heart').props['data-count'], 8)
  let pending, duplicate
  await act(async () => {
    const click = f.button('heart').props.onClick
    pending = click()
    duplicate = click()
    await Promise.resolve()
  })
  assert.equal(f.writes.length, 1, 'the synchronous guard holds before the disabled render commits')
  assert.equal(f.button('heart').props['aria-pressed'], true)
  assert.equal(f.button('heart').props['data-count'], 9)
  assert.equal(f.button('heart').props.disabled, true)
  await act(async () => {
    f.writes[0].resolve({ liked: true, count: 11 })
    await Promise.all([pending, duplicate])
  })
  assert.equal(f.button('heart').props['data-count'], 11, 'the server total replaces the optimistic estimate')
  assert.equal(f.button('heart').props['aria-pressed'], true)
  assert.equal(f.button('heart').props.disabled, false)
})

test('failed article reactions restore the exact prior state and count for adding and removing', async t => {
  for (const kind of ['heart', 'clap']) {
    for (const initialLiked of [false, true]) {
      const f = await reactionFixture(t, { initialLiked, initialCount: 17 })
      let pending
      await act(async () => { pending = f.button(kind).props.onClick(); await Promise.resolve() })
      assert.equal(f.button(kind).props['aria-pressed'], !initialLiked)
      assert.equal(f.button(kind).props['data-count'], initialLiked ? 16 : 18)
      await act(async () => { f.writes[0].reject(new Error('offline')); await pending })
      assert.equal(f.button(kind).props['aria-pressed'], initialLiked)
      assert.equal(f.button(kind).props['data-count'], 17)
      assert.equal(f.button(kind).props.disabled, false)
    }
  }
})

test('hearts and claps remain independent while simultaneous reactions settle', async t => {
  const f = await reactionFixture(t)
  let heart, clap
  await act(async () => {
    heart = f.button('heart').props.onClick()
    clap = f.button('clap').props.onClick()
    await Promise.resolve()
  })
  assert.deepEqual(f.writes.map(write => write.kind), ['heart', 'clap'])
  await act(async () => {
    f.writes[0].resolve({ liked: true, count: 9 })
    f.writes[1].reject(new Error('clap unavailable'))
    await Promise.all([heart, clap])
  })
  assert.equal(f.button('heart').props['aria-pressed'], true)
  assert.equal(f.button('heart').props['data-count'], 9)
  assert.equal(f.button('clap').props['aria-pressed'], false)
  assert.equal(f.button('clap').props['data-count'], 8)
})

test('keyed article switches keep old pending writes out of the current reaction counts', async t => {
  const f = await reactionFixture(t)
  let pending
  await act(async () => { pending = f.button('heart').props.onClick(); await Promise.resolve() })
  await f.update({ articleId: 'two' })
  assert.equal(f.button('heart').props['data-count'], 31)
  assert.equal(f.button('heart').props['aria-pressed'], false)
  assert.equal(f.button('clap').props['data-count'], 14)
  assert.equal(f.button('clap').props['aria-pressed'], true)
  await act(async () => { f.writes[0].resolve({ liked: true, count: 99 }); await pending })
  assert.equal(f.writes[0].id, 'one')
  assert.equal(f.button('heart').props['data-count'], 31)
  assert.equal(f.button('heart').props['aria-pressed'], false)
})

async function pulseFixture(t, reduced = false) {
  const dom = new JSDOM('<html><body><main></main></body></html>', { pretendToBeVisual: true, url: 'https://icue.test/' })
  const { window } = dom, { document } = window
  const previous = new Map()
  for (const [key, value] of Object.entries({ window, document })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const media = Object.assign(new window.EventTarget(), { matches: reduced })
  window.matchMedia = () => media
  const frames = new Map(), timers = new Map()
  let now = 0, nextId = 0, disposed = false
  const raf = callback => { frames.set(++nextId, callback); return nextId }
  const cancel = id => frames.delete(id)
  const timeout = (callback, delay) => { timers.set(++nextId, { callback, at: now + delay }); return nextId }
  const clear = id => timers.delete(id)
  const { default: Pulse } = await sourceModule('news-app/src/components/react-bits/PulseHeart.jsx', {
    globals: { window, document, performance: { now: () => now }, requestAnimationFrame: raf, cancelAnimationFrame: cancel, setTimeout: timeout, clearTimeout: clear },
  })
  const root = createRoot(document.querySelector('main'))
  const destroy = async () => {
    if (disposed) return
    disposed = true
    await act(async () => root.unmount())
    assert.equal(frames.size, 0, 'unmount releases animation frames')
    assert.equal(timers.size, 0, 'unmount releases count-roll timers')
  }
  t.after(async () => {
    try { await destroy() } finally {
      window.close()
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else delete globalThis[key]
      }
    }
  })
  const render = props => act(async () => root.render(React.createElement(Pulse, props)))
  const step = milliseconds => act(async () => {
    now += milliseconds
    const callbacks = [...frames.values()]; frames.clear()
    for (const callback of callbacks) callback(now)
    for (const [id, timer] of [...timers]) {
      if (timer.at <= now) { timers.delete(id); timer.callback() }
    }
  })
  const press = async () => {
    const button = document.querySelector('button')
    await act(async () => {
      button.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0 }))
      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1, button: 0 }))
    })
  }
  return { Pulse, window, document, root, media, frames, timers, render, step, press, destroy }
}

test('Pulse Heart contracts, flips the glyph with a rolling count, and settles its visual work', async t => {
  const f = await pulseFixture(t)
  const calls = []
  function Host() {
    const [value, setValue] = React.useState({ liked: false, count: 8 })
    return React.createElement(f.Pulse, {
      ...value, label: 'Like', icon: liked => React.createElement('svg', { 'data-filled': String(liked) }),
      onChange: (liked, count) => { calls.push({ liked, count }); setValue({ liked, count }) },
    })
  }
  await act(async () => f.root.render(React.createElement(Host)))
  const button = f.document.querySelector('button')
  assert.equal(button.type, 'button')
  await f.press()
  assert.deepEqual(calls, [{ liked: true, count: 9 }])
  assert.equal(button.getAttribute('aria-pressed'), 'true', 'assistive state follows the logical reaction immediately')
  assert.equal(button.getAttribute('aria-label'), 'Like, 9')
  assert.equal(button.dataset.liked, 'false', 'the visible glyph waits for the contraction')
  await f.step(100)
  const scale = Number(/scale\(([^)]+)\)/.exec(f.document.querySelector('.pulse-heart__heart').style.transform)?.[1])
  assert.ok(scale > 0 && scale < 1, 'the actual glyph contracts toward a dot')
  await f.step(140)
  assert.equal(button.dataset.liked, 'true')
  assert.equal(f.document.querySelector('svg').dataset.filled, 'true')
  assert.ok(f.document.querySelector('.pulse-heart__roll'), 'the changed count rolls at the flip')
  await f.step(500)
  assert.equal(f.frames.size, 0)
  assert.equal(f.timers.size, 0)
  assert.equal(button.hasAttribute('data-running'), false)
  assert.equal(f.document.querySelector('.pulse-heart__heart').style.transform, '')
  assert.equal(f.document.querySelector('.pulse-heart__count').textContent, '9')
})

test('Pulse Heart renders external updates and keyboard activation without inventing pointer animations', async t => {
  const f = await pulseFixture(t)
  const changes = []
  const icon = () => React.createElement('svg')
  await f.render({ liked: false, count: 1204, label: 'Like', locale: 'de', icon, onChange: (...values) => changes.push(values) })
  assert.equal(f.document.querySelector('button').getAttribute('aria-label'), 'Like, 1.204')
  await f.render({ liked: true, count: 1250, label: 'Liked', locale: 'de', icon, onChange: (...values) => changes.push(values) })
  assert.equal(f.document.querySelector('button').dataset.liked, 'true')
  assert.equal(f.document.querySelector('.pulse-heart__count').textContent, '1.250')
  assert.equal(f.frames.size, 0)
  assert.equal(f.timers.size, 0)
  assert.deepEqual(changes, [])
  await act(async () => f.document.querySelector('button').click())
  assert.deepEqual(changes, [[false, 1249]])
  assert.equal(f.frames.size, 0, 'native keyboard/programmatic activation remains immediate')
  await f.render({ liked: true, count: 1250, disabled: true, icon, onChange: (...values) => changes.push(values) })
  await f.press()
  assert.equal(changes.length, 1, 'disabled reactions ignore pointer input')
})

test('Pulse Heart respects reduced motion immediately and cancels a running pulse when preference changes', async t => {
  const f = await pulseFixture(t, true)
  const icon = () => React.createElement('svg')
  let changes = 0
  await f.render({ liked: false, count: 0, icon, onChange: () => { changes++ } })
  await f.press()
  assert.equal(changes, 1)
  assert.equal(f.frames.size, 0)
  assert.equal(f.timers.size, 0)
  f.media.matches = false
  await f.press()
  await f.step(240)
  assert.ok(f.frames.size > 0)
  assert.ok(f.timers.size > 0)
  f.media.matches = true
  await act(async () => f.media.dispatchEvent(new f.window.Event('change')))
  assert.equal(f.frames.size, 0)
  assert.equal(f.timers.size, 0)
  assert.equal(f.document.querySelector('button').hasAttribute('data-running'), false)
  assert.equal(f.document.querySelector('.pulse-heart__heart').style.transform, '')
  f.media.matches = false
  await f.press()
  await f.step(240)
  await f.destroy()
})
