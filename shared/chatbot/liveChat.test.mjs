import assert from 'node:assert/strict'
import test from 'node:test'
import { sourceModule, deferred } from '../resilience/testHarness.js'

const load = options => sourceModule('shared/chatbot/lib/liveChat.js', { globals: { crypto }, ...options })
const storage = () => {
  const values = new Map()
  return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values }
}
const health = () => ({ version: 1, server_time: new Date().toISOString(), available_until: null })
const messageId = '00000000-0000-4000-8000-000000007100'
function snapshot(args, messages = []) {
  return { conversation: { id: messageId, status: 'waiting', staff_read_seq: 0 },
    messages: [...messages, { id: args.p_client_id, client_id: args.p_client_id, seq: messages.length + 1,
      content: args.p_message, sender: 'visitor', created_at: new Date().toISOString() }], has_more: false, health: health() }
}

test('live chat is opt-in and never sends the assistant transcript or URL query', async () => {
  const { createLiveChatClient } = await load()
  const calls = []
  const client = createLiveChatClient({ storage: storage(), rpc: async (name, args) => {
    calls.push({ name, args })
    return name === 'health' ? health() : snapshot(args)
  } })
  assert.equal(calls.length, 0)
  await client.refresh()
  assert.equal(calls[0].name, 'health')
  client.setDraft('  My project question  ')
  client.setDetails({ name: 'Visitor', email: '' })
  assert.equal(await client.send({ locale: 'fr', path: '/contact?token=private#fragment' }), true)
  const sent = calls[1]
  assert.equal(sent.name, 'open')
  assert.match(sent.args.p_token, /^[a-f0-9]{64}$/)
  assert.equal(sent.args.p_message, 'My project question')
  assert.equal(sent.args.p_locale, 'fr')
  assert.equal(sent.args.p_path, '/contact')
  assert.equal(sent.args.p_email, '')
  assert.equal(client.getSnapshot().draft, '')
  assert.equal(client.getSnapshot().pending, null)
  assert.ok(!JSON.stringify(calls).includes('private'))
})

test('a lost creation acknowledgement survives reload and retries the same capability and message ID', async () => {
  const { createLiveChatClient } = await load()
  const saved = storage(), calls = []
  let committed
  const first = createLiveChatClient({ storage: saved, rpc: async (name, args) => {
    calls.push({ name, args }); committed = snapshot(args); throw new Error('Response lost after commit')
  } })
  first.setDraft('Please connect me with a person')
  assert.equal(await first.send({ locale: 'en' }), false)
  assert.equal(first.getSnapshot().pending.content, 'Please connect me with a person')
  const second = createLiveChatClient({ storage: saved, rpc: async (name, args) => { calls.push({ name, args }); return committed } })
  assert.equal(second.getSnapshot().draft, 'Please connect me with a person')
  assert.equal(await second.send(), true)
  assert.equal(calls[0].args.p_token, calls[1].args.p_token)
  assert.equal(calls[0].args.p_client_id, calls[1].args.p_client_id)
  assert.equal(second.getSnapshot().messages.length, 1)
  assert.equal(second.getSnapshot().pending, null)
})

test('concurrent clicks serialize a send and an older read cannot overwrite its response', async () => {
  const { createLiveChatClient } = await load()
  const send = deferred(), read = deferred()
  let calls = 0
  const client = createLiveChatClient({ storage: storage(), rpc: (name, args) => {
    if (name === 'health') return read.promise
    calls++
    return send.promise.then(() => snapshot(args))
  } })
  const refreshing = client.refresh()
  client.setDraft('Need a consultant')
  const sending = client.send({ locale: 'en' })
  assert.equal(await client.send(), false)
  assert.equal(calls, 1)
  send.resolve(); await sending
  read.resolve({ ...health(), available_until: 'stale' }); await refreshing
  assert.equal(client.getSnapshot().health.available_until, null)
  assert.equal(client.getSnapshot().messages.length, 1)
})

test('read recovery acknowledges an uncertain reply without duplicating messages', async () => {
  const { createLiveChatClient } = await load()
  let latest, fail = false
  const client = createLiveChatClient({ storage: storage(), rpc: async (name, args) => {
    if (name === 'open' || name === 'send') {
      latest = snapshot(args, latest?.messages || [])
      if (fail) throw new Error('Offline after sending')
      return latest
    }
    return latest
  } })
  client.setDraft('First'); await client.send()
  fail = true
  client.setDraft('Second'); await client.send()
  assert.ok(client.getSnapshot().pending)
  await client.refresh()
  assert.equal(client.getSnapshot().pending, null)
  assert.equal(client.getSnapshot().messages.length, 2)
  await client.refresh()
  assert.equal(client.getSnapshot().messages.length, 2)
})

test('sending while an older page loads does not strand pagination or discard the new message', async () => {
  const { createLiveChatClient } = await load()
  const oldRead = deferred()
  const older = { id: 'older-message', seq: 1, sender: 'staff', content: 'Earlier reply' }
  let messages = [], reads = 0, seq = 50
  const client = createLiveChatClient({ storage: storage(), rpc: async (name, args) => {
    if (name === 'open' || name === 'send') {
      messages = [...messages, { id: args.p_client_id, client_id: args.p_client_id, seq: ++seq, sender: 'visitor', content: args.p_message }]
      return { conversation: { id: messageId, status: 'active' }, messages, has_more: true, health: health() }
    }
    if (reads++ === 0) return oldRead.promise
    return { conversation: { id: messageId, status: 'active' }, messages: [older], has_more: false, health: health() }
  } })
  client.setDraft('First'); await client.send()
  const loading = client.loadEarlier()
  assert.equal(client.getSnapshot().loadingEarlier, true)
  client.setDraft('New reply'); await client.send()
  oldRead.resolve({ conversation: { id: messageId }, messages: [older], has_more: false, health: health() })
  await loading
  assert.equal(client.getSnapshot().loadingEarlier, false)
  assert.equal(client.getSnapshot().messages.at(-1).content, 'New reply')
  await client.loadEarlier()
  assert.equal(client.getSnapshot().messages.length, 3)
  assert.equal(client.getSnapshot().messages[0].content, 'Earlier reply')
  assert.equal(client.getSnapshot().hasMore, false)
})

test('blocked storage retains a working session and aborting a poll preserves its last good messages', async () => {
  const { createLiveChatClient } = await load()
  let data
  const controller = new AbortController()
  const client = createLiveChatClient({ storage: { getItem() { throw new Error('Blocked') }, setItem() { throw new Error('Blocked') } }, rpc: async (name, args) => {
    if (name === 'open') { data = snapshot(args); return data }
    controller.abort()
    throw new DOMException('Cancelled', 'AbortError')
  } })
  client.setDraft('Hello'); await client.send()
  assert.equal(client.getSnapshot().sessionOnly, true)
  await client.refresh({ signal: controller.signal })
  assert.equal(client.getSnapshot().status, 'ready')
  assert.equal(client.getSnapshot().messages.length, 1)
})

test('availability and typing expire using server time, independently of the visitor clock', async () => {
  const { liveTimeLeft, mergeLiveMessages } = await load()
  assert.equal(liveTimeLeft({ server_time: '2026-10-25T00:00:00Z' }, '2026-10-25T00:00:06Z', 100, 4100), 2000)
  assert.equal(liveTimeLeft({ server_time: '2026-10-25T00:00:00Z' }, '2026-10-25T00:00:06Z', 100, 7100), 0)
  assert.equal(liveTimeLeft(null, null, 100, 200), 0)
  assert.equal(mergeLiveMessages([], [{ id: 'bad', seq: 1, sender: 'admin', content: 'Forged' }]).length, 0)
})

test('public RPC uses anonymous credentials, request deadlines and POST bodies for the capability', async () => {
  const requests = []
  const { liveChatRpc } = await load({ env: { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'publishable-test-key' }, globals: { crypto, fetch: async (url, init) => {
    requests.push({ url, init }); return new Response(JSON.stringify(health()))
  } } })
  await liveChatRpc('read', { p_token: 'a'.repeat(64) })
  const request = requests[0]
  assert.equal(request.init.credentials, 'omit')
  assert.equal(request.init.headers.Authorization, 'Bearer publishable-test-key')
  assert.equal(request.init.method, 'POST')
  assert.equal(request.init.cache, 'no-store')
  assert.equal(JSON.parse(request.init.body).p_token, 'a'.repeat(64))
  assert.ok(!request.url.includes('a'.repeat(64)))
  assert.ok(request.init.signal instanceof AbortSignal)
})
