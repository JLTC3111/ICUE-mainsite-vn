import { createRetryableLoader, withDeadline } from '../../resilience/requests.js'

const STORAGE_KEY = 'icue:live-chat:v1'
const tokenPattern = /^[a-f0-9]{64}$/
const uuidPattern = /^[a-f0-9-]{36}$/i
const locales = new Set(['vi', 'en', 'de', 'fr', 'ko', 'ja'])
let loadedConfig

const loadConfig = createRetryableLoader(async signal => {
  const env = import.meta.env || {}
  let config = { url: env.VITE_SUPABASE_URL, anonKey: env.VITE_SUPABASE_ANON_KEY }
  if (!config.url || !config.anonKey) {
    const response = await fetch('/newsroom/supabase-config.json', { cache: 'no-store', credentials: 'omit', signal })
    if (!response.ok) throw Object.assign(new Error('Chat unavailable'), { code: 'UNAVAILABLE' })
    config = await response.json()
  }
  if (!config?.url || !config?.anonKey) throw Object.assign(new Error('Chat unavailable'), { code: 'UNAVAILABLE' })
  const url = new URL(config.url)
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Invalid chat configuration')
  loadedConfig = config
  return config
}, { timeoutMs: 10_000 })

async function requestChatRpc({ url, anonKey }, name, args, { signal, keepalive }) {
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/support_chat_${name}`, {
    method: 'POST', credentials: 'omit', cache: 'no-store', signal, keepalive,
    headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify(args),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw Object.assign(new Error('Chat request failed'), { code: data?.code, status: response.status })
  return data
}

/** Public chat deliberately uses the anonymous key, never a newsroom session. */
export function liveChatRpc(name, args = {}, { signal, keepalive = false } = {}) {
  // Start the exit request within the pagehide handler. Waiting even for an
  // already-resolved config promise can miss the browser's unload window.
  if (keepalive && loadedConfig) {
    const pending = requestChatRpc(loadedConfig, name, args, { signal, keepalive })
    return withDeadline(() => pending, { signal, timeoutMs: 12_000 })
  }
  return withDeadline(async requestSignal => requestChatRpc(await loadConfig(), name, args,
    { signal: requestSignal, keepalive }), { signal, timeoutMs: 12_000 })
}

export function liveTimeLeft(health, until, checkedAt, now = Date.now()) {
  return Math.max(0, Date.parse(until) - Date.parse(health?.server_time) - Math.max(0, now - checkedAt)) || 0
}

export function mergeLiveMessages(previous, incoming) {
  const messages = new Map(previous.map(message => [message.id, message]))
  for (const message of incoming || []) {
    if (message && typeof message.id === 'string' && Number.isSafeInteger(message.seq)
      && ['visitor', 'staff'].includes(message.sender) && typeof message.content === 'string') messages.set(message.id, message)
  }
  return [...messages.values()].sort((a, b) => a.seq - b.seq)
}

/** A small external store keeps drafts and uncertain sends through panel closes.
 * Persist the capability and client message ID before sending: retrying a lost
 * acknowledgement must never create another conversation or duplicate message. */
export function createLiveChatClient({ rpc = liveChatRpc, storage, random = globalThis.crypto, now = Date.now } = {}) {
  if (storage === undefined) { try { storage = globalThis.localStorage } catch { /* Memory-only session. */ } }
  let record = null
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null')
    if (tokenPattern.test(saved?.token)) {
      record = { token: saved.token, id: uuidPattern.test(saved.id) ? saved.id : null }
      if (uuidPattern.test(saved.pending?.id) && typeof saved.pending.content === 'string'
        && saved.pending.content.trim().length > 0 && saved.pending.content.length <= 4000) {
        record.pending = { id: saved.pending.id, content: saved.pending.content,
          locale: locales.has(saved.pending.locale) ? saved.pending.locale : 'vi',
          name: String(saved.pending.name || '').slice(0, 100), email: String(saved.pending.email || '').slice(0, 254),
          path: String(saved.pending.path || '/').split(/[?#]/)[0].slice(0, 500) }
      }
    }
  } catch { /* Blocked storage or an obsolete connection. */ }
  let state = { conversation: null, messages: [], hasMore: false, health: null, checkedAt: 0,
    status: 'idle', sending: false, loadingEarlier: false, pending: record?.pending || null,
    draft: record?.pending?.content || '', name: '', email: '', sessionOnly: !storage }
  const listeners = new Set()
  let generation = 0, reading = false, queuedRead = null, lastTyping = -Infinity
  let presenceState = 'left', presenceStarted = false, connectionId = null, presenceSequence = 0, lastPresenceAt = -Infinity
  const update = patch => { state = { ...state, ...patch }; listeners.forEach(notify => notify()) }
  function persist() {
    try {
      if (!storage) throw new Error('Storage unavailable')
      if (record) storage.setItem(STORAGE_KEY, JSON.stringify(record))
      else storage.removeItem(STORAGE_KEY)
    } catch { update({ sessionOnly: true }) }
  }
  function failure(error) {
    if (error?.name === 'AbortError') return
    const status = error?.code === '42501' ? 'missing'
      : ['PGRST202', '42P01', 'UNAVAILABLE'].includes(error?.code) ? 'unavailable' : 'error'
    update({ status })
  }
  function apply(data, { older = false } = {}) {
    if (!data?.conversation?.id || !Array.isArray(data.messages) || data.health?.version !== 1) throw new Error('Invalid chat response')
    record.id = data.conversation.id
    const acknowledged = record.pending && data.messages.some(message => message.client_id === record.pending.id)
    const patch = { conversation: data.conversation, messages: mergeLiveMessages(state.messages, data.messages),
      health: data.health, checkedAt: now(), status: 'ready' }
    if (older || !state.messages.length) patch.hasMore = Boolean(data.has_more)
    // If the newest page no longer overlaps our cache, discard the stale gap
    // and let the visitor load contiguous older pages from the server.
    if (!older && state.messages.length && data.messages.length === 50
      && !data.messages.some(message => state.messages.some(old => old.id === message.id))) {
      patch.messages = mergeLiveMessages([], data.messages)
      patch.hasMore = Boolean(data.has_more)
    }
    if (acknowledged) {
      if (state.draft.trim() === record.pending.content) patch.draft = ''
      delete record.pending
      patch.pending = null
    }
    persist()
    update(patch)
    if (presenceStarted) void setPresence(presenceState)
  }
  async function refresh({ signal } = {}) {
    if (reading) { queuedRead = { signal }; return }
    reading = true
    const request = generation
    try {
      if (record?.id) {
        const data = await rpc('read', { p_token: record.token, p_mark_read: true }, { signal })
        if (request === generation && !signal?.aborted) apply(data)
      } else {
        const health = await rpc('health', {}, { signal })
        if (health?.version !== 1) throw new Error('Invalid chat health')
        if (request === generation && !signal?.aborted) update({ health, checkedAt: now(), status: 'ready' })
      }
    } catch (error) { if (request === generation && !signal?.aborted) failure(error) }
    finally {
      reading = false
      const next = queuedRead
      queuedRead = null
      if (next && !next.signal?.aborted) void refresh(next)
    }
  }
  async function send({ locale = 'vi', path = '/' } = {}) {
    if (state.sending) return false
    if (!record?.pending && !state.draft.trim()) return false
    if (!record) {
      const bytes = random.getRandomValues(new Uint8Array(32))
      record = { token: [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(''), id: null }
    }
    if (!record.pending) record.pending = { id: random.randomUUID(), content: state.draft.trim(),
      locale: locales.has(locale) ? locale : 'vi', name: state.name.trim(), email: state.email.trim(), path: path.split(/[?#]/)[0].slice(0, 500) }
    const request = ++generation
    persist()
    update({ sending: true, pending: record.pending })
    try {
      const pending = record.pending
      const data = record.id
        ? await rpc('send', { p_token: record.token, p_client_id: pending.id, p_message: pending.content })
        : await rpc('open', { p_token: record.token, p_client_id: pending.id, p_message: pending.content,
          p_locale: pending.locale, p_name: pending.name, p_email: pending.email, p_path: pending.path })
      if (request !== generation) return false
      apply(data)
      return true
    } catch (error) { if (request === generation) failure(error); return false }
    finally { if (request === generation) update({ sending: false }) }
  }
  async function loadEarlier() {
    if (!record?.id || state.loadingEarlier || !state.hasMore) return
    const request = generation
    update({ loadingEarlier: true })
    try {
      const data = await rpc('read', { p_token: record.token, p_before: state.messages[0]?.seq, p_mark_read: false })
      if (request === generation) apply(data, { older: true })
    } catch (error) { if (request === generation) failure(error) }
    finally { update({ loadingEarlier: false }) }
  }
  function typing(value) {
    if (!record?.id || (value && now() - lastTyping < 3000)) return
    lastTyping = now()
    void rpc('activity', { p_token: record.token, p_typing: Boolean(value) }).catch(() => {})
  }
  function setPresence(next, { keepalive = false, force = false } = {}) {
    if (!['active', 'away', 'left'].includes(next)) return Promise.resolve()
    const previous = presenceState
    presenceState = next
    if (next === 'active') presenceStarted = true
    // Reading the assistant alone never reports visitor presence to staff.
    if (!presenceStarted || !record?.token) return Promise.resolve()
    if (!force && next === previous && now() - lastPresenceAt < 15_000) return Promise.resolve()
    connectionId ||= random.randomUUID()
    lastPresenceAt = now()
    const sequence = ++presenceSequence
    return rpc('visitor_presence', { p_token: record.token, p_connection_id: connectionId, p_sequence: sequence, p_state: next }, { keepalive })
      .catch(() => { if (sequence === presenceSequence) lastPresenceAt = -Infinity })
  }
  return {
    subscribe: notify => { listeners.add(notify); return () => listeners.delete(notify) },
    getSnapshot: () => state,
    refresh, send, loadEarlier, typing, setPresence,
    setDraft: draft => update({ draft: String(draft).slice(0, 4000) }),
    setDetails: details => update({ name: String(details.name ?? state.name).slice(0, 100), email: String(details.email ?? state.email).slice(0, 254) }),
    reset() {
      if (state.status !== 'missing' || state.sending) return
      generation++
      record = null
      connectionId = null
      presenceSequence = 0
      lastPresenceAt = -Infinity
      persist()
      update({ conversation: null, messages: [], hasMore: false, pending: null, draft: '', status: 'idle' })
      void refresh()
    },
  }
}

let sharedClient
export function getLiveChatClient() {
  if (!sharedClient) sharedClient = createLiveChatClient()
  return sharedClient
}
