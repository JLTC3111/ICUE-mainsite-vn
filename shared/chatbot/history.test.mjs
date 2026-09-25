import assert from 'node:assert/strict'
import test from 'node:test'
import { createHistoryStore, mergeHistories, normalizeMessages } from './lib/historyStore.js'
import { createHistoryCipher, createPairingCode } from './lib/historyCrypto.js'
import { createHistorySync, SYNC_KEY } from './lib/historySync.js'
import { createHistoryApi } from './lib/historyApi.js'

const message = (id, content = id) => ({ id, role: 'user', content, timestamp: '2026-09-24T12:00:00.000Z' })
const memory = () => {
  const map = new Map()
  return { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }
}
function device(api) {
  const storage = memory(), events = new EventTarget(), page = Object.assign(new EventTarget(), { hidden: false }), network = { onLine: true }
  const queued = new Map(); let serial = 0
  const timers = { setTimeout: (fn, delay) => { const id = ++serial; queued.set(id, { fn, delay }); return id }, clearTimeout: id => queued.delete(id) }
  const store = createHistoryStore({ storage: () => storage, events })
  const sync = createHistorySync({ store, api, storage: () => storage, events, page, network, timers })
  const stop = sync.start()
  return { store, sync, stop, storage, events, page, network, queued }
}
function relay() {
  const vaults = new Map(); let conflicts = 0
  const api = async (token, { method = 'GET', body } = {}) => {
    const row = vaults.get(token)
    if (method === 'DELETE') { vaults.delete(token); return { revision: 0 } }
    if (method === 'GET') {
      if (!row) throw Object.assign(new Error('missing'), { status: 404 })
      return structuredClone(row)
    }
    if ((row?.revision || 0) !== body.revision) { conflicts++; throw Object.assign(new Error('conflict'), { status: 409 }) }
    const next = { revision: body.revision + 1, payload: body.payload }
    vaults.set(token, structuredClone(next)); return next
  }
  return { api, vaults, get conflicts() { return conflicts } }
}

test('legacy transcripts migrate, locale histories stay separate, and hostile storage is bounded', () => {
  const old = { role: 'bot', content: 'Authored reply', timestamp: '2026-09-24T11:00:00Z', meta: { source: 'intent', intentId: 'services' }, links: [{ label: 'Bad', url: 'javascript:alert(1)' }, { label: 'Contact', url: '/contact?lang=en' }] }
  const normalized = normalizeMessages([old, old, null, { ...old, timestamp: 'invalid' }])
  assert.equal(normalized.length, 1)
  assert.match(normalized[0].id, /^legacy-/)
  assert.equal(normalized[0].meta.intentId, 'services')
  assert.deepEqual(normalized[0].links, [{ label: 'Contact', url: '/contact?lang=en' }])
  const history = mergeHistories({ en: [message('a')], vi: [message('b')] }, { en: [message('c')] })
  assert.deepEqual(history.en.map(x => x.id), ['a', 'c'])
  assert.deepEqual(history.vi.map(x => x.id), ['b'])
  assert.equal(normalizeMessages(Array.from({ length: 80 }, (_, i) => message(String(i)))).length, 50)
  const huge = normalizeMessages(Array.from({ length: 50 }, (_, i) => message(String(i), 'あ'.repeat(4000))))
  assert.ok(Buffer.byteLength(JSON.stringify(huge)) < 121_000)
})

test('cross-tab storage and unavailable storage preserve local messages', () => {
  const storage = memory(), events = new EventTarget()
  const a = createHistoryStore({ storage: () => storage, events }), b = createHistoryStore({ storage: () => storage, events })
  const off = b.subscribe(() => {})
  a.append('en', { role: 'user', content: 'first' }); b.append('en', { role: 'user', content: 'second' })
  events.dispatchEvent(Object.assign(new Event('storage'), { key: 'icueChatbotHistory:en' }))
  assert.equal(a.read('en').length, 2)
  assert.equal(b.read('en').length, 2)
  off()
  const privateStore = createHistoryStore({ storage: () => { throw new Error('blocked') }, events })
  privateStore.append('en', { role: 'user', content: 'private browser' })
  assert.equal(privateStore.read('en')[0].content, 'private browser')
})

test('pairing encrypts history with fresh IVs and rejects altered ciphertext or a different code', async () => {
  const code = createPairingCode(), crypt = await createHistoryCipher(code)
  const history = { en: [message('a', 'private transcript')] }
  const a = await crypt.encrypt(history), b = await crypt.encrypt(history)
  assert.notEqual(a.iv, b.iv)
  assert.equal(JSON.stringify(a).includes('private transcript'), false)
  assert.equal(crypt.token.includes(code), false)
  assert.equal((await crypt.decrypt(a)).en[0].content, 'private transcript')
  const other = await createHistoryCipher(createPairingCode())
  await assert.rejects(other.decrypt(a))
  await assert.rejects(crypt.decrypt({ ...a, data: (a.data[0] === 'A' ? 'B' : 'A') + a.data.slice(1) }))
  await assert.rejects(createHistoryCipher('123456'))
})

test('two paired devices merge simultaneous updates, retry conflicts, and reconnect without duplicates', async () => {
  const server = relay(), a = device(server.api), b = device(server.api)
  a.store.append('en', { role: 'user', content: 'from first device' })
  assert.equal(await a.sync.create(), true)
  assert.equal(await b.sync.join(a.sync.getSnapshot().code), true)
  assert.equal(b.store.read('en')[0].content, 'from first device')
  a.store.append('en', { role: 'user', content: 'concurrent A' })
  b.store.append('en', { role: 'user', content: 'concurrent B' })
  await Promise.all([a.sync.sync(), b.sync.sync()])
  await a.sync.sync(); await b.sync.sync()
  assert.ok(server.conflicts > 0)
  assert.deepEqual(a.store.readAll(), b.store.readAll())
  assert.equal(a.store.read('en').length, 3)
  b.network.onLine = false
  b.events.dispatchEvent(new Event('offline'))
  b.store.append('en', { role: 'user', content: 'offline draft sent' })
  assert.equal(await b.sync.sync(), false)
  assert.equal(b.sync.getSnapshot().status, 'offline')
  assert.equal(b.queued.size, 0)
  b.network.onLine = true
  b.events.dispatchEvent(new Event('online'))
  await b.sync.sync(); await a.sync.sync(); await a.sync.sync()
  assert.equal(a.store.read('en').length, 4)
  assert.deepEqual(a.store.readAll(), b.store.readAll())
  assert.equal(a.storage.getItem(SYNC_KEY), b.storage.getItem(SYNC_KEY))
  a.stop(); b.stop()
  assert.equal(a.queued.size + b.queued.size, 0)
})

test('wrong pairing codes never create vaults or replace local history', async () => {
  const server = relay(), a = device(server.api)
  a.store.append('vi', { role: 'user', content: 'keep me' })
  assert.equal(await a.sync.join(createPairingCode()), false)
  assert.equal(a.sync.getSnapshot().status, 'missing')
  assert.equal(a.sync.getSnapshot().code, '')
  assert.equal(server.vaults.size, 0)
  assert.equal(a.store.read('vi')[0].content, 'keep me')
  a.stop()
})

test('cloud deletion is not undone by a stale device, and local transcripts remain', async () => {
  const server = relay(), a = device(server.api), b = device(server.api)
  a.store.append('en', { role: 'user', content: 'retained locally' })
  await a.sync.create(); await b.sync.join(a.sync.getSnapshot().code)
  assert.equal(await a.sync.remove(), true)
  assert.equal(a.sync.getSnapshot().code, '')
  assert.equal(a.sync.getSnapshot().status, 'local')
  b.store.append('en', { role: 'user', content: 'after deletion' })
  assert.equal(await b.sync.sync(), false)
  assert.equal(b.sync.getSnapshot().status, 'missing')
  assert.equal(server.vaults.size, 0)
  assert.equal(a.store.read('en').length, 1)
  assert.equal(b.store.read('en').length, 2)
  a.stop(); b.stop()
})

test('a late pairing response cannot attach history after disconnect; hidden pages stop timers', async () => {
  const server = relay(), a = device(server.api)
  a.store.append('en', { role: 'user', content: 'remote only' })
  await a.sync.create()
  let release
  const waiting = new Promise(resolve => { release = resolve })
  const b = device(async (...args) => { await waiting; return server.api(...args) })
  const pending = b.sync.join(a.sync.getSnapshot().code)
  b.sync.disconnect(); release()
  assert.equal(await pending, false)
  assert.equal(b.store.read('en').length, 0)
  assert.equal(b.sync.getSnapshot().code, '')
  a.sync.setOpen(true)
  assert.ok(a.queued.size)
  a.page.hidden = true; a.page.dispatchEvent(new Event('visibilitychange'))
  assert.equal(a.queued.size, 0)
  a.page.hidden = false; a.page.dispatchEvent(new Event('visibilitychange'))
  assert.equal(a.queued.size, 1)
  a.stop(); b.stop()
})

test('HTTP sync cancels a stalled request and does not send cookies or secrets in URLs', async () => {
  const controller = new AbortController()
  const api = createHistoryApi({ request: async (url, init) => {
    assert.equal(url, '/.netlify/functions/chat-history')
    assert.equal(init.credentials, 'omit')
    assert.equal(init.cache, 'no-store')
    return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)))
  } })
  const pending = api('a'.repeat(64), { signal: controller.signal })
  await Promise.resolve()
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
})

test('retry after a committed create loses its response reuses the vault instead of duplicating it', async () => {
  const server = relay()
  let loseResponse = true
  const a = device(async (...args) => {
    const result = await server.api(...args)
    if (loseResponse && args[1]?.method === 'PUT') { loseResponse = false; throw new Error('connection lost after commit') }
    return result
  })
  a.store.append('en', { role: 'user', content: 'before disconnect' })
  assert.equal(await a.sync.create(), false)
  assert.equal(server.vaults.size, 1)
  a.store.append('en', { role: 'user', content: 'after reconnect' })
  assert.equal(await a.sync.create(), true)
  assert.equal(server.vaults.size, 1)
  await a.sync.sync()
  const crypt = await createHistoryCipher(a.sync.getSnapshot().code)
  const remote = await server.api(crypt.token)
  assert.equal((await crypt.decrypt(remote.payload)).en.length, 2)
  a.stop()
})

test('closing the chat does not cancel an unsent local history update', async () => {
  const server = relay(), a = device(server.api)
  await a.sync.create()
  a.sync.setOpen(true)
  a.store.append('en', { role: 'user', content: 'just before closing' })
  a.sync.setOpen(false)
  assert.equal(a.queued.size, 1)
  await a.sync.sync()
  const crypt = await createHistoryCipher(a.sync.getSnapshot().code)
  assert.equal((await crypt.decrypt((await server.api(crypt.token)).payload)).en[0].content, 'just before closing')
  a.stop()
})
