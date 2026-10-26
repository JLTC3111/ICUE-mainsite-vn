import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
const icons = createRequire(import.meta.url)('lucide-react')
import { React, act, create, deferred, platform, silenceRenderer, sourceModule, unmount } from '../resilience/testHarness.js'

const vi = JSON.parse(await fs.readFile(new URL('../../faq-app/src/locales/vi.json', import.meta.url)))
const en = JSON.parse(await fs.readFile(new URL('../../faq-app/src/locales/en.json', import.meta.url)))
const kb = JSON.parse(await fs.readFile(new URL('../../public/chatbot/kb.vi.json', import.meta.url)))
const authoredReply = { content: kb.intents[0].answer, meta: { source: 'intent' } }

async function fixture(t, getResponse, { touch = false, musicPlaying = false, collapseMode = 'expanded', desktopCollapseMode, liveChat } = {}) {
  silenceRenderer(t)
  const f = platform()
  const collapseKey = `icue:chat-mascot:collapse${touch ? ':compact' : ''}`
  const storage = new Map(collapseMode ? [[collapseKey, collapseMode]] : [])
  if (desktopCollapseMode) storage.set('icue:chat-mascot:collapse', desktopCollapseMode)
  const timers = new Map()
  const frames = new Map()
  let time = 0, serial = 0, focused = null
  const setTimer = (callback, delay) => { const id = ++serial; timers.set(id, { at: time + delay, callback }); return id }
  const clearTimer = id => timers.delete(id)
  const root = { style: { setProperty() {}, removeProperty() {} }, classList: { toggle() {}, remove() {} } }
  f.window.innerHeight = 844
  f.window.matchMedia = query => ({ matches: query.includes('pointer') ? !touch : touch })
  f.window.location = { pathname: '/faqs/' }
  f.window.visualViewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0 })
  f.window.requestAnimationFrame = callback => { const id = ++serial; frames.set(id, callback); return id }
  f.window.cancelAnimationFrame = id => frames.delete(id)
  f.window.setTimeout = setTimer
  f.window.clearTimeout = clearTimer
  const audio = Object.assign(new EventTarget(), {
    paused: !musicPlaying, ended: false, readyState: musicPlaying ? 4 : 0, error: null,
    play() {
      this.paused = false
      this.ended = false
      this.error = null
      this.readyState = 4
      this.dispatchEvent(new Event('playing'))
      return Promise.resolve()
    },
    pause() {
      this.paused = true
      this.dispatchEvent(new Event('pause'))
    },
  })
  f.window.__icueBackgroundAudio = audio
  const { default: Chatbot } = await sourceModule('shared/chatbot/Chatbot.jsx', {
    imports: {
      ...(liveChat ? { './lib/liveChat.js': liveChat } : {}),
      './icue-bird.webp': { default: '/bird.webp' },
      'lucide-react': icons,
      'react-dom': { createPortal: node => node },
      '../customer-account/account.js': { connectAccount: async () => {}, customerPortalUrl: () => '/newsroom/portal' },
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
      return { style: {}, scrollTop: 0, scrollHeight: 100, focus: () => { focused = node.props.className } }
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
  return { ...f, renderer, find, state, open, send, advance, storage, timers, frames, audio,
    get focused() { return focused },
    update: next => act(async () => renderer.update(element(next))),
  }
}

test('the team tab exchanges staff messages, preserves separate drafts and stops polling while hidden', async t => {
  const { createLiveChatClient, liveTimeLeft } = await sourceModule('shared/chatbot/lib/liveChat.js', { globals: { crypto } })
  const calls = []
  const health = { version: 1, server_time: new Date().toISOString(), available_until: null }
  let snapshot
  const client = createLiveChatClient({ storage: { getItem() {}, setItem() {} }, rpc: async (name, args) => {
    calls.push({ name, args })
    if (name === 'health') return health
    if (name === 'open') snapshot = { conversation: { id: '00000000-0000-4000-8000-000000007100', status: 'waiting' }, health,
      messages: [{ id: args.p_client_id, client_id: args.p_client_id, seq: 1, content: args.p_message, sender: 'visitor' }], has_more: false }
    return snapshot
  } })
  const f = await fixture(t, () => authoredReply, { liveChat: { getLiveChatClient: () => client, liveTimeLeft } })
  await f.open()
  assert.equal(calls.length, 0, 'opening the assistant never starts a staff session')
  await act(async () => f.find('icue-chat__input').props.onChange({ target: { value: 'Private assistant draft' } }))
  await act(async () => f.renderer.root.findByProps({ 'data-mode': 'team' }).props.onClick())
  assert.equal(calls.filter(call => call.name === 'health').length, 1)
  await act(async () => f.renderer.root.findByType('textarea').props.onChange({ target: { value: 'Please help with my project' } }))
  await act(async () => f.find('icue-live__composer').props.onSubmit({ preventDefault() {} }))
  assert.equal(calls.find(call => call.name === 'open').args.p_message, 'Please help with my project')
  const presence = () => calls.filter(call => call.name === 'visitor_presence').at(-1)?.args.p_state
  assert.equal(presence(), 'active')
  assert.ok(!JSON.stringify(calls).includes('Private assistant draft'))
  snapshot = { ...snapshot, messages: [...snapshot.messages, { id: 'staff-reply', client_id: 'staff-client', seq: 2, content: 'A person from ICUE is here.', sender: 'staff', sender_name: 'ICUE colleague' }] }
  await act(async () => client.refresh())
  assert.ok(JSON.stringify(f.renderer.toJSON()).includes('A person from ICUE is here.'))
  await act(async () => f.renderer.root.findByProps({ 'data-mode': 'assistant' }).props.onClick())
  assert.equal(presence(), 'away')
  assert.equal(f.find('icue-chat__input').props.value, 'Private assistant draft')
  await act(async () => f.renderer.root.findByProps({ 'data-mode': 'team' }).props.onClick())
  await act(async () => f.renderer.root.findByType('textarea').props.onChange({ target: { value: 'Unfinished team draft' } }))
  await act(async () => f.find('icue-chat__close').props.onClick())
  assert.equal(presence(), 'left')
  await f.open()
  assert.equal(presence(), 'active')
  assert.equal(f.renderer.root.findByType('textarea').props.value, 'Unfinished team draft')
  await act(async () => { f.document.hidden = true; f.document.dispatchEvent(new Event('visibilitychange')) })
  assert.equal(presence(), 'away')
  const pausedCalls = calls.length
  await f.advance(30_000)
  assert.equal(calls.length, pausedCalls, 'hidden visitors make no chat requests')
  await act(async () => { f.document.hidden = false; f.document.dispatchEvent(new Event('visibilitychange')) })
  assert.ok(calls.length > pausedCalls, 'returning reads the latest staff response')
  assert.equal(presence(), 'active')
  await act(async () => f.window.dispatchEvent(new Event('pagehide')))
  assert.equal(presence(), 'left')
  await act(async () => { f.document.hidden = true; f.document.dispatchEvent(new Event('visibilitychange')) })
  assert.equal(presence(), 'left', 'a late visibility event during navigation cannot downgrade a departure to away')
  f.document.hidden = false
  await act(async () => f.window.dispatchEvent(new Event('pageshow')))
  assert.equal(presence(), 'active', 'a restored browser page returns to the chat')
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('a staff member attending this chat is green without general availability and clears on expiry, resolution or disconnect', async t => {
  const { createLiveChatClient, liveTimeLeft } = await sourceModule('shared/chatbot/lib/liveChat.js', { globals: { crypto } })
  const health = { version: 1, server_time: new Date().toISOString(), available_until: null }
  let snapshot = { conversation: { id: '00000000-0000-4000-8000-000000007100', status: 'waiting' }, messages: [], has_more: false, health }
  let disconnected = false
  const client = createLiveChatClient({
    storage: { getItem: () => JSON.stringify({ token: 'a'.repeat(64), id: snapshot.conversation.id }), setItem() {} },
    rpc: async () => { if (disconnected) throw new Error('Disconnected'); return snapshot },
  })
  const f = await fixture(t, () => authoredReply, { liveChat: { getLiveChatClient: () => client, liveTimeLeft } })
  await f.open()
  await act(async () => f.renderer.root.findByProps({ 'data-mode': 'team' }).props.onClick())
  const status = () => f.find('icue-live__status')
  assert.equal(status().props['data-online'], false)
  snapshot = { ...snapshot, conversation: { ...snapshot.conversation, staff_attending_until: new Date(Date.now() + 45_000).toISOString() } }
  await act(async () => client.refresh())
  assert.equal(status().props['data-attending'], true)
  assert.equal(status().props['data-online'], true)
  assert.equal(status().findByProps({ role: 'status' }).props.children, 'Nhân viên đang hỗ trợ bạn')
  assert.equal(f.find('icue-live__thread-status').props.children, '', 'do not also tell an attended visitor to wait for a person')
  snapshot = { ...snapshot, conversation: { ...snapshot.conversation, staff_attending_until: new Date(Date.now() - 1000).toISOString() } }
  await act(async () => client.refresh())
  assert.equal(status().props['data-attending'], false)
  assert.equal(status().props['data-online'], false)
  snapshot = { ...snapshot, conversation: { ...snapshot.conversation, status: 'closed', staff_attending_until: new Date(Date.now() + 45_000).toISOString() } }
  await act(async () => client.refresh())
  assert.equal(status().props['data-online'], false)
  assert.equal(status().findByProps({ role: 'status' }).props.children, 'Đã hoàn tất')
  snapshot = { ...snapshot, conversation: { ...snapshot.conversation, status: 'active' } }
  await act(async () => client.refresh())
  assert.equal(status().props['data-attending'], true)
  disconnected = true
  await act(async () => client.refresh())
  assert.equal(status().props['data-attending'], false)
  assert.equal(status().props['data-online'], false)
  await unmount(f.renderer)
})

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

test('silent inactivity progresses through coffee and right-facing sleep with clean wake-up', async t => {
  const f = await fixture(t, () => authoredReply)
  const mascot = () => f.find('icue-mascot icue-mascot--launcher')
  await f.advance(30_000)
  assert.equal(f.state(), 'idle', 'silence never starts the music pose')
  await f.advance(29_999)
  assert.equal(f.state(), 'idle')
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
  assert.equal(f.state(), 'idle')
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

test('opening chat or hiding the page cancels inactivity stages', async t => {
  const f = await fixture(t, () => authoredReply)
  await f.advance(60_000)
  assert.equal(f.state(), 'coffee')
  await f.open()
  assert.equal(f.state(), 'excited')
  await f.advance(150_000)
  assert.equal(f.state(), 'idle', 'an open conversation never enters a rest pose')
  await f.open()
  await f.advance(60_000)
  assert.equal(f.state(), 'coffee')
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
  await f.advance(59_999)
  assert.equal(f.state(), 'idle')
  await f.advance(1)
  assert.equal(f.state(), 'coffee')
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('music holds the walking pose and every stop starts a fresh idle countdown', async t => {
  const f = await fixture(t, () => authoredReply)
  const mascot = () => f.find('icue-mascot icue-mascot--launcher')
  await f.advance(59_000)
  await act(async () => f.audio.play())
  assert.equal(f.state(), 'listening')
  assert.equal(mascot().props['data-pose'], 'listening')
  assert.equal(mascot().props['data-effect'], 'music')
  const headMotion = mascot().findByProps({ className: 'icue-mascot__head-motion' })
  assert.equal(headMotion.findAllByProps({ className: 'icue-mascot__headphones' }).length, 1)
  assert.equal(headMotion.findAllByProps({ className: 'icue-mascot__headphone-band' }).length, 1)
  assert.equal(f.timers.size, 0, 'playback cancels every inactivity deadline')
  await act(async () => {
    f.document.dispatchEvent(new Event('pointerdown'))
    f.document.dispatchEvent(new Event('keydown'))
    mascot().props.onPointerEnter()
  })
  await f.advance(300_000)
  assert.equal(f.state(), 'listening', 'interaction and long playback never interrupt listening')
  assert.equal(f.timers.size, 0)
  await act(async () => f.audio.pause())
  assert.equal(f.state(), 'idle')
  assert.equal(mascot().props['data-pose'], 'idle')
  assert.equal(mascot().props['data-effect'], 'none')
  assert.equal(mascot().findAllByProps({ className: 'icue-mascot__headphones' }).length, 0)
  await f.advance(59_999)
  assert.equal(f.state(), 'idle', 'time before playback is discarded')
  await f.advance(1)
  assert.equal(f.state(), 'coffee')

  for (const restState of ['coffee', 'sleeping']) {
    if (restState === 'sleeping') await f.advance(60_000)
    assert.equal(f.state(), restState)
    await act(async () => f.audio.play())
    assert.equal(f.state(), 'listening', `resuming wakes the bird from ${restState}`)
    assert.equal(f.timers.size, 0)
    await f.advance(180_000)
    assert.equal(f.state(), 'listening')
    await act(async () => f.audio.pause())
    assert.equal(f.state(), 'idle', 'stopping never restores a stale rest pose')
    await f.advance(59_999)
    assert.equal(f.state(), 'idle')
    await f.advance(1)
    assert.equal(f.state(), 'coffee', 'each stop restarts the full countdown')
  }
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('existing playback survives page visibility and stops for native media interruptions', async t => {
  const f = await fixture(t, () => authoredReply, { musicPlaying: true })
  const mascot = () => f.find('icue-mascot icue-mascot--launcher')
  assert.equal(f.state(), 'listening', 'a late-mounted bird joins current playback')
  await act(async () => {
    f.document.hidden = true
    f.document.dispatchEvent(new Event('visibilitychange'))
  })
  assert.equal(mascot().props['data-paused'], true)
  await f.advance(180_000)
  await act(async () => {
    f.document.hidden = false
    f.document.dispatchEvent(new Event('visibilitychange'))
  })
  assert.equal(f.state(), 'listening')
  assert.equal(mascot().props['data-paused'], false)
  assert.equal(f.timers.size, 0)

  for (const event of ['waiting', 'ended', 'emptied', 'error', 'pause']) {
    await act(async () => {
      f.audio.readyState = 0
      f.audio.dispatchEvent(new Event(event))
    })
    assert.equal(f.state(), 'idle', `${event} stops the listening pose`)
    await f.advance(40_000)
    assert.equal(f.state(), 'idle')
    await act(async () => f.audio.play())
    assert.equal(f.state(), 'listening', `playback resumes after ${event}`)
    assert.equal(f.timers.size, 0)
  }
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('chat interactions keep the bird listening while preserving actual reply status', async t => {
  const pending = deferred()
  const f = await fixture(t, () => pending.promise, { musicPlaying: true })
  await f.open()
  assert.equal(f.state(), 'listening')
  await f.send()
  await f.advance(700)
  assert.equal(f.state(), 'listening')
  assert.equal(f.find('icue-chat__bubble icue-chat__pending').props.children, vi.chat.thinking)
  await act(async () => f.audio.pause())
  assert.equal(f.state(), 'thinking', 'stopping music reveals the ongoing reply')
  await act(async () => f.audio.play())
  assert.equal(f.state(), 'listening')
  await act(async () => pending.resolve(authoredReply))
  await f.advance(1800)
  assert.equal(f.state(), 'listening')
  await f.open()
  assert.equal(f.state(), 'listening', 'closing chat does not restart inactivity during music')
  assert.equal(f.timers.size, 0)
  await unmount(f.renderer)
})

test('the reusable mascot composes expressions and SVG effects without changing static variants', async t => {
  silenceRenderer(t)
  const { default: ChatMascot } = await sourceModule('shared/chatbot/mascot/ChatMascot.jsx', {
    imports: {
      './icue-bird.webp': { default: '/bird.webp' },
      'lucide-react': icons,
      '../customer-account/account.js': { connectAccount: async () => {}, customerPortalUrl: () => '/newsroom/portal' },
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

test('follow-up context survives closing, clears on uncertainty and locale changes, and stays out of history', async t => {
  const contexts = []
  const anchor = { intentId: 'planning_design', language: 'vi' }
  let reply = { ...authoredReply, context: anchor }
  const f = await fixture(t, (_message, _locale, options) => {
    contexts.push(options.context)
    return reply
  })
  await f.open(); await f.send(); await f.advance(700)
  assert.equal(contexts[0], null)
  await act(async () => f.find('icue-chat__close').props.onClick())
  await f.open(); await f.send(); await f.advance(700)
  assert.deepEqual(contexts[1], anchor)
  const history = JSON.parse(f.storage.get('icueChatbotHistory:vi'))
  assert.ok(history.every(message => !message.context))
  reply = { content: 'Please clarify.', meta: { source: 'fallback' } }
  await f.send(); await f.advance(700)
  await f.send(); await f.advance(700)
  assert.equal(contexts[3], null)
  reply = { ...authoredReply, context: anchor }
  await f.send(); await f.advance(700)
  await f.update({ locale: 'en', labels: en.chat })
  await f.send(); await f.advance(700)
  assert.equal(contexts[5], null)
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


test('automatic mascot collapse leaves chat accessible and never interrupts a draft', async t => {
  const f = await fixture(t, () => authoredReply, { collapseMode: null })
  const root = () => f.renderer.root.find(node => node.type === 'div' && node.props.className?.split(' ').includes('icue-chat'))
  assert.equal(root().props['data-collapsed'], false)
  await f.advance(12_000)
  assert.equal(root().props['data-collapsed'], true)
  assert.equal(f.find('icue-chat__mascot').props['aria-hidden'], true)
  assert.equal(f.find('icue-mascot icue-mascot--launcher').props['data-paused'], true)
  await f.open()
  assert.equal(root().props['data-collapsed'], false)
  await act(async () => f.find('icue-chat__input').props.onChange({ target: { value: 'Keep this draft' } }))
  await f.advance(60_000)
  assert.equal(root().props['data-collapsed'], false)
  assert.equal(f.find('icue-chat__input').props.value, 'Keep this draft')
  await act(async () => f.find('icue-chat__close').props.onClick())
  assert.equal(root().props['data-collapsed'], false, 'the chat icon restores the mascot beyond the current conversation')
  assert.equal(f.storage.get('icue:chat-mascot:collapse'), 'expanded')
  await f.advance(60_000)
  assert.equal(root().props['data-collapsed'], false, 'manual expansion disables automatic collapse')
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('mobile starts collapsed despite desktop expansion and chat restores the mascot without losing the thread', async t => {
  const f = await fixture(t, () => authoredReply, { touch: true, collapseMode: null, desktopCollapseMode: 'expanded' })
  const mascot = () => f.find('icue-chat__mascot')
  const dismiss = () => f.find('icue-chat__collapse')
  const availableControls = () => f.find('icue-chat__launcher').findAllByType('button').filter(node => !node.props.disabled)
  assert.equal(mascot().props['aria-hidden'], true)
  assert.equal(f.storage.get('icue:chat-mascot:collapse'), 'expanded')
  assert.equal(availableControls().length, 1, 'only the chat icon can receive input while collapsed')
  assert.equal(dismiss().props.tabIndex, -1)
  assert.equal(f.renderer.root.findAllByProps({ className: 'floating-collapse-controls' }).length, 0)
  await f.open()
  assert.equal(mascot().props['aria-hidden'], undefined)
  assert.equal(dismiss().props.disabled, true, 'the panel close button handles an open conversation')
  await f.send()
  await f.advance(700)
  assert.equal(f.state(), 'happy')
  await act(async () => f.find('icue-chat__input').props.onChange({ target: { value: 'Keep my unfinished question' } }))
  await act(async () => f.find('icue-chat__close').props.onClick())
  assert.equal(mascot().props['aria-hidden'], undefined)
  assert.equal(availableControls().length, 2, 'the mascot has just its chat target and corner X')
  assert.equal(dismiss().props['aria-controls'], mascot().props.id)
  assert.equal(f.storage.get('icue:chat-mascot:collapse:compact'), 'expanded')
  // Rapidly reverse the transition: the same mascot stays mounted and an X
  // never strands keyboard focus on a disappearing control.
  for (let attempt = 0; attempt < 3; attempt++) {
    await act(async () => dismiss().props.onClick())
    assert.equal(mascot().props['aria-hidden'], true)
    assert.equal(mascot().props.hidden, undefined, 'CSS can animate the mounted mascot out')
    assert.equal(f.find('icue-mascot icue-mascot--launcher').props['data-paused'], true)
    assert.equal(availableControls().length, 1)
    assert.equal(f.focused, 'icue-chat__toggle')
    assert.equal(f.storage.get('icue:chat-mascot:collapse:compact'), 'collapsed')
    assert.equal(f.storage.get('icue:chat-mascot:collapse'), 'expanded', 'mobile keeps the desktop preference intact')
    await f.open()
    assert.equal(mascot().props['aria-hidden'], undefined)
    assert.equal(f.find('icue-chat__input').props.value, 'Keep my unfinished question')
    assert.ok(f.renderer.root.findAll(node => node.props.className === 'icue-chat__message icue-chat__message--bot').length > 0)
    await act(async () => f.find('icue-chat__close').props.onClick())
  }
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})
