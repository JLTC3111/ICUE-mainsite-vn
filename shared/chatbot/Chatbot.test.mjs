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
      './lib/knowledge': { createChatbotKnowledge: ({ siteLang }) => ({ getResponse: message => getResponse(message, siteLang) }) },
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
  const state = () => find('icue-mascot icue-mascot--header').props['data-state']
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
  assert.equal(f.state(), 'greeting')
  await f.advance(1800)
  assert.equal(f.state(), 'idle')
  await f.send()
  assert.equal(f.state(), 'thinking')
  assert.equal(f.find('icue-chat__bubble icue-chat__pending').props.children, vi.chat.thinking)
  await f.advance(700)
  assert.equal(f.state(), 'happy')
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
  assert.equal(f.find('icue-mascot icue-mascot--header').props['data-paused'], true)
  f.window.dispatchEvent(new Event('resize'))
  assert.equal(f.frames.size, 0)
  f.document.hidden = false
  await act(async () => f.document.dispatchEvent(new Event('visibilitychange')))
  assert.equal(f.find('icue-mascot icue-mascot--header').props['data-paused'], false)
  assert.equal(f.frames.size, 1)
  await act(async () => f.find('icue-chat__close').props.onClick())
  assert.equal(f.focused, 'icue-chat__toggle')
  assert.equal(f.frames.size, 0)
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})
