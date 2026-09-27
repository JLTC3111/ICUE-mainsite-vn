import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import { React, act, create, deferred, platform, silenceRenderer, sourceModule, unmount } from '../resilience/testHarness.js'

const vi = JSON.parse(await fs.readFile(new URL('../../faq-app/src/locales/vi.json', import.meta.url)))
const en = JSON.parse(await fs.readFile(new URL('../../faq-app/src/locales/en.json', import.meta.url)))
const kb = JSON.parse(await fs.readFile(new URL('../../public/chatbot/kb.vi.json', import.meta.url)))
const authoredReply = { content: kb.intents[0].answer, meta: { source: 'intent' } }

async function fixture(t, getResponse, { touch = false } = {}) {
  silenceRenderer(t)
  const f = platform()
  const storage = new Map()
  const timers = new Map()
  const frames = new Map()
  let time = 0, serial = 0, focused = null
  const setTimer = (callback, delay) => { const id = ++serial; timers.set(id, { at: time + delay, callback }); return id }
  const clearTimer = id => timers.delete(id)
  const root = { style: { setProperty() {}, removeProperty() {} }, classList: { toggle() {}, remove() {} } }
  f.window.innerHeight = 844
  f.window.matchMedia = () => ({ matches: !touch })
  f.window.location = { pathname: '/faqs/' }
  f.window.visualViewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0 })
  f.window.requestAnimationFrame = callback => { const id = ++serial; frames.set(id, callback); return id }
  f.window.cancelAnimationFrame = id => frames.delete(id)
  f.window.setTimeout = setTimer
  f.window.clearTimeout = clearTimer
  const { default: Chatbot } = await sourceModule('shared/chatbot/Chatbot.jsx', {
    imports: {
      './icue-bird.webp': { default: '/bird.webp' },
      './icue-bird-core.webp': { default: '/bird-core.webp' },
      './lib/knowledgeAssets.js': { knowledgeUrls: {} },
      './lib/knowledge': { createChatbotKnowledge: ({ siteLang }) => ({ getResponse: (message, options) => getResponse(message, siteLang, options) }) },
    },
    env: { BASE_URL: '/faqs/' },
    globals: { ...f, TextEncoder, TextDecoder, crypto, btoa, atob, setTimeout: setTimer, clearTimeout: clearTimer,
      localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    },
  })
  const props = { locale: 'vi', labels: vi.chat, links: { faqs: '/faqs', contact: '/contact' } }
  const element = next => React.createElement(React.StrictMode, null, React.createElement(Chatbot, { ...props, ...next }))
  let renderer
  await act(async () => {
    renderer = create(element(), { createNodeMock: node => {
      if (node.props.className?.split(' ').includes('icue-chat')) return root
      return { scrollTop: 0, scrollHeight: 100, focus: () => { focused = node.props.className } }
    } })
  })
  const find = className => renderer.root.findByProps({ className })
  const state = () => find('icue-mascot icue-mascot--launcher').props['data-state']
  const open = () => act(async () => find('icue-chat__toggle').props.onClick())
  const send = () => act(async () => renderer.root.findAllByProps({ className: 'icue-chat__suggestion' })[0].props.onClick())
  const advance = async ms => {
    const end = time + ms
    for (;;) {
      const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
      if (!due) break
      timers.delete(due[0]); time = due[1].at
      // Do not await the callback: a pending retrieval must remain pending.
      await act(async () => { void due[1].callback() })
    }
    time = end
  }
  return { ...f, renderer, find, state, open, send, advance, storage, timers, frames,
    get focused() { return focused },
    update: next => act(async () => renderer.update(element(next))),
  }
}

test('real chat lifecycle selects reactions, preserves textual errors, and recovers on the next send', async t => {
  let response = authoredReply
  const f = await fixture(t, () => {
    if (response instanceof Error) throw response
    return response
  })
  await f.open()
  assert.equal(f.state(), 'excited')
  const launcher = () => f.find('icue-mascot icue-mascot--launcher')
  assert.equal(launcher().props['data-paused'], false, 'the visible launcher keeps moving while chat is open')
  assert.equal(launcher().props['data-interactive'], false, 'the launcher cannot fall asleep during an open conversation')
  assert.equal(launcher().props['data-effect'], 'sparkles')
  await f.advance(650)
  assert.equal(f.state(), 'happy')
  assert.equal(launcher().props['data-effect'], 'none', 'opening settles without a second celebration')
  await f.advance(1800)
  assert.equal(f.state(), 'idle')
  await f.send()
  assert.equal(f.state(), 'thinking')
  assert.equal(launcher().props['data-state'], 'thinking')
  assert.equal(launcher().props['data-paused'], false)
  assert.equal(f.find('icue-chat__bubble icue-chat__pending').props.children, vi.chat.thinking)
  await f.advance(700)
  assert.equal(f.state(), 'happy')
  assert.equal(launcher().props['data-state'], 'happy')
  assert.equal(launcher().props['data-effect'], 'hearts')
  assert.equal(launcher().props['data-paused'], false)
  await f.advance(1800)
  assert.equal(f.state(), 'idle')
  response = { content: kb.fallback.answer, meta: { source: 'fallback' } }
  await f.send(); await f.advance(700)
  assert.equal(f.state(), 'confused')
  response = new Error('Retrieval failed')
  await f.send(); await f.advance(700)
  assert.equal(f.state(), 'error')
  assert.ok(JSON.stringify(f.renderer.toJSON()).includes(vi.chat.error))
  response = authoredReply
  await f.send(); await f.advance(700)
  assert.equal(f.state(), 'happy')
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('opening reactions run once, survive typing, and restart on a new opening', async t => {
  const f = await fixture(t, () => authoredReply)
  const mascot = () => f.find('icue-mascot icue-mascot--launcher')
  await f.open()
  await f.advance(500)
  await act(async () => f.find('icue-chat__input').props.onChange({ target: { value: 'draft' } }))
  await f.advance(150)
  assert.equal(f.state(), 'happy')
  await f.advance(1800)
  assert.equal(f.state(), 'idle')
  await f.advance(10_000)
  assert.equal(f.state(), 'idle')
  assert.equal(mascot().props['data-effect'], 'none')
  await act(async () => f.find('icue-chat__close').props.onClick())
  await f.open()
  assert.equal(f.state(), 'excited')
  assert.equal(mascot().props['data-effect'], 'sparkles')
  await f.send()
  await f.advance(650)
  assert.equal(f.state(), 'thinking', 'a send interrupts the greeting without a stale happy timer')
  await f.advance(50)
  assert.equal(f.state(), 'happy')
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('retrieval, sourced documents, guidance and uncertain replies get meaningful effects', async t => {
  const pending = deferred()
  let response = pending.promise
  const f = await fixture(t, (_message, _locale, options) => {
    options.onRetrieval()
    return response
  })
  const effect = () => f.find('icue-mascot icue-mascot--launcher').props['data-effect']
  await f.open(); await f.send()
  assert.equal(effect(), 'none', 'the artificial reply delay is not a KB fetch')
  await f.advance(700)
  assert.equal(effect(), 'book')
  assert.equal(f.find('icue-mascot icue-mascot--launcher').props['data-pose'], 'reading', 'a book selects the seated reading pose instead of the pondering pose')
  await f.advance(5000)
  assert.equal(f.state(), 'thinking')
  assert.equal(effect(), 'book', 'the book stays open while retrieval is pending')
  await act(async () => pending.resolve({ ...authoredReply, meta: { source: 'faq', faqId: 'services.1' } }))
  assert.equal(effect(), 'book', 'a sourced FAQ stays readable briefly after retrieval')
  assert.equal(f.find('icue-mascot icue-mascot--launcher').props['data-pose'], 'reading', 'a successful document reply keeps holding the book')
  await f.advance(1800)
  assert.equal(effect(), 'none')
  response = { ...authoredReply, meta: { source: 'intent', intentId: 'process_steps' } }
  await f.send(); await f.advance(700)
  assert.equal(effect(), 'bulb')
  assert.equal(f.find('icue-mascot icue-mascot--launcher').props['data-pose'], 'idea')
  await f.advance(1800)
  assert.equal(effect(), 'none')
  response = { content: kb.fallback.answer, meta: { source: 'fallback' } }
  await f.send(); await f.advance(700)
  assert.equal(f.state(), 'confused')
  assert.equal(effect(), 'none')
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('inactivity progresses through music, coffee and right-facing sleep with clean wake-up', async t => {
  const f = await fixture(t, () => authoredReply)
  const mascot = () => f.find('icue-mascot icue-mascot--launcher')
  await f.advance(29_999)
  assert.equal(f.state(), 'idle')
  await f.advance(1)
  assert.equal(f.state(), 'listening')
  assert.equal(mascot().props['data-pose'], 'listening')
  assert.equal(mascot().props['data-effect'], 'music')
  assert.equal(f.renderer.root.findAllByProps({ className: 'icue-mascot__coffee' }).length, 0)
  const headMotion = mascot().findByProps({ className: 'icue-mascot__head-motion' })
  assert.equal(headMotion.findAllByProps({ className: 'icue-mascot__headphones' }).length, 1, 'earcups move with the head')
  assert.equal(headMotion.findAllByProps({ className: 'icue-mascot__headphone-band' }).length, 1, 'the band follows the head behind the artwork')
  await act(async () => f.document.dispatchEvent(new Event('keydown')))
  assert.equal(f.state(), 'idle', 'keyboard interaction interrupts music')
  await f.advance(30_000)
  assert.equal(f.state(), 'listening')
  await f.advance(29_999)
  assert.equal(f.state(), 'listening')
  await f.advance(1)
  assert.equal(f.state(), 'coffee')
  assert.equal(mascot().props['data-pose'], 'coffee')
  assert.equal(mascot().props['data-effect'], 'coffee')
  assert.equal(f.renderer.root.findAllByProps({ className: 'icue-mascot__coffee' }).length, 1)
  assert.equal(f.renderer.root.findAllByProps({ className: 'icue-mascot__coffee-logo' }).length, 0)
  assert.equal(f.renderer.root.findAllByProps({ className: 'icue-mascot__headphones' }).length, 0, 'headphones are put away for coffee')
  await f.advance(59_999)
  assert.equal(f.state(), 'coffee', 'coffee lasts until two minutes of inactivity')
  await f.advance(1)
  assert.equal(f.state(), 'sleeping')
  assert.equal(mascot().props['data-pose'], 'sleeping')
  assert.equal(mascot().props['data-effect'], 'zzz')
  assert.equal(f.renderer.root.findAllByProps({ className: 'icue-mascot__coffee' }).length, 0, 'the mug is put away for sleep')
  assert.equal(f.renderer.root.findAllByProps({ className: 'icue-mascot__headphones' }).length, 0, 'headphones are put away for sleep')
  const idleEyes = mascot().findByProps({ 'data-face': 'idle' }).findAllByType('path').map(p => [p.props.d, p.props.transform])
  const sleepingEyes = mascot().findByProps({ 'data-face': 'sleeping' }).findAllByType('path').map(p => [p.props.d, p.props.transform])
  assert.deepEqual(sleepingEyes, idleEyes, 'sleep keeps the > _ face with one eye open')
  await act(async () => f.document.dispatchEvent(new Event('pointerdown')))
  assert.equal(f.state(), 'idle')
  assert.equal(mascot().props['data-effect'], 'none')
  await f.advance(120_000)
  await act(async () => mascot().props.onPointerEnter())
  assert.equal(f.state(), 'idle', 'hover wakes the entire bird, not only its eyes')
  assert.equal(mascot().props['data-pose'], 'idle')
  await f.advance(59_999)
  assert.equal(f.state(), 'listening')
  await f.advance(1)
  assert.equal(f.state(), 'coffee', 'wake restarts the coffee deadline')
  await act(async () => f.document.dispatchEvent(new Event('keydown')))
  assert.equal(f.state(), 'idle', 'keyboard interaction interrupts coffee')
  assert.equal(f.renderer.root.findAllByProps({ className: 'icue-mascot__headphones' }).length, 0)
  await f.advance(119_999)
  assert.equal(f.state(), 'coffee')
  await f.advance(1)
  assert.equal(f.state(), 'sleeping', 'wake restarts the sleep deadline')
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('opening chat or hiding the page cancels all three inactivity stages', async t => {
  const f = await fixture(t, () => authoredReply)
  await f.advance(30_000)
  assert.equal(f.state(), 'listening')
  await f.open()
  assert.equal(f.state(), 'excited')
  await f.advance(150_000)
  assert.equal(f.state(), 'idle', 'an open conversation never enters a rest pose')
  await f.open()
  await f.advance(30_000)
  assert.equal(f.state(), 'listening')
  await act(async () => {
    f.document.hidden = true
    f.document.dispatchEvent(new Event('visibilitychange'))
  })
  await f.advance(150_000)
  assert.equal(f.state(), 'idle')
  await act(async () => {
    f.document.hidden = false
    f.document.dispatchEvent(new Event('visibilitychange'))
  })
  assert.equal(f.state(), 'idle', 'returning to the page starts a fresh inactivity cycle')
  await f.advance(29_999)
  assert.equal(f.state(), 'idle')
  await f.advance(1)
  assert.equal(f.state(), 'listening')
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('the reusable mascot composes expressions and SVG effects without changing static variants', async t => {
  silenceRenderer(t)
  const { default: ChatMascot } = await sourceModule('shared/chatbot/mascot/ChatMascot.jsx', {
    imports: {
      './icue-bird.webp': { default: '/bird.webp' },
      './icue-bird-core.webp': { default: '/bird-core.webp' },
    },
    globals: platform(),
  })
  let renderer
  const render = props => React.createElement(ChatMascot, { variant: 'avatar', animated: false, ...props })
  await act(async () => { renderer = create(render({ expression: 'handoff' })) })
  const mascot = () => renderer.root.findByProps({ className: 'icue-mascot icue-mascot--avatar' })
  assert.equal(mascot().props['data-state'], 'handoff')
  assert.equal(mascot().props['data-effect'], 'none')
  assert.equal(renderer.root.findAllByType('img').length, 1, 'reuse the original artwork')
  await act(async () => renderer.update(render({ expression: 'thinking', effect: 'book' })))
  assert.equal(mascot().props['data-state'], 'thinking')
  assert.equal(mascot().props['data-effect'], 'book')
  assert.equal(renderer.root.findAllByProps({ className: 'icue-mascot__book' }).length, 1)
  await act(async () => renderer.update(render({ expression: 'happy', effect: 'none' })))
  assert.equal(mascot().props['data-effect'], 'none', 'an explicit override can suppress a default burst')
  await unmount(renderer)
})

test('duplicate clicks cannot start concurrent replies, including before React commits', async t => {
  let calls = 0
  const f = await fixture(t, () => { calls++; return authoredReply })
  await f.open()
  const suggestion = f.renderer.root.findAllByProps({ className: 'icue-chat__suggestion' })[0]
  await act(async () => { suggestion.props.onClick(); suggestion.props.onClick() })
  await f.advance(700)
  assert.equal(calls, 1)
  assert.equal(JSON.parse(f.storage.get('icueChatbotHistory:vi')).length, 2)
  await unmount(f.renderer)
})

test('a reply finishing after a locale change cannot alter the new transcript or mascot', async t => {
  const pending = deferred()
  const f = await fixture(t, () => pending.promise)
  await f.open(); await f.send(); await f.advance(700)
  await f.update({ locale: 'en', labels: en.chat })
  assert.equal(f.state(), 'idle')
  await act(async () => pending.resolve(authoredReply))
  assert.equal(f.state(), 'idle')
  assert.equal(f.storage.has('icueChatbotHistory:en'), false)
  assert.equal(JSON.parse(f.storage.get('icueChatbotHistory:vi')).length, 1)
  assert.ok(JSON.stringify(f.renderer.toJSON()).includes(en.chat.greeting))
  await unmount(f.renderer)
})

test('unmount cancels delayed sends and discards a retrieval already in flight', async t => {
  let calls = 0
  const pending = deferred()
  const f = await fixture(t, () => { calls++; return pending.promise })
  await f.open(); await f.send()
  await unmount(f.renderer); await f.advance(700)
  assert.equal(calls, 0)
  const other = await fixture(t, () => pending.promise)
  await other.open(); await other.send(); await other.advance(700)
  await unmount(other.renderer)
  await act(async () => pending.resolve(authoredReply))
  assert.equal(JSON.parse(other.storage.get('icueChatbotHistory:vi')).length, 1)
  assert.equal(other.timers.size, 0)
})

test('touch opening preserves the keyboard, and hidden/resumed state pauses motion and refreshes viewport', async t => {
  const f = await fixture(t, () => authoredReply, { touch: true })
  await f.open()
  assert.equal(f.focused, 'icue-chat__close')
  f.document.hidden = true
  await act(async () => f.document.dispatchEvent(new Event('visibilitychange')))
  assert.equal(f.find('icue-mascot icue-mascot--launcher').props['data-paused'], true)
  f.window.dispatchEvent(new Event('resize'))
  assert.equal(f.frames.size, 0)
  f.document.hidden = false
  await act(async () => f.document.dispatchEvent(new Event('visibilitychange')))
  assert.equal(f.find('icue-mascot icue-mascot--launcher').props['data-paused'], false)
  assert.equal(f.frames.size, 1)
  await act(async () => f.find('icue-chat__close').props.onClick())
  assert.equal(f.focused, 'icue-chat__toggle')
  assert.equal(f.frames.size, 0)
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})
