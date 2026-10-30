import { createRetryableLoader, withDeadline } from '../../resilience/requests.js'
import { accountToken, cachedAccountToken, getAccountSnapshot, subscribeAccount } from '../../customer-account/account.js'
import { validateChatFile, uploadChatFile, downloadChatFile } from './liveChatFiles.js'

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

export const getLiveChatConfig = () => loadConfig()

async function requestChatRpc({ url, anonKey }, name, args, { signal, keepalive, accessToken }) {
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/support_chat_${name}`, {
    method: 'POST', credentials: 'omit', cache: 'no-store', signal, keepalive,
    headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${accessToken || anonKey}` },
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
    const pending = requestChatRpc(loadedConfig, name, args, { signal, keepalive, accessToken: cachedAccountToken() })
    return withDeadline(() => pending, { signal, timeoutMs: 12_000 })
  }
  return withDeadline(async requestSignal => {
    const [config, accessToken] = await Promise.all([loadConfig(), accountToken()])
    return requestChatRpc(config, name, args, { signal: requestSignal, keepalive, accessToken })
  }, { signal, timeoutMs: 12_000 })
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
export function createLiveChatClient({ rpc = liveChatRpc, storage, random = globalThis.crypto, now = Date.now, upload = uploadChatFile, download = downloadChatFile, config = loadConfig } = {}) {
  if (storage === undefined) { try { storage = globalThis.localStorage } catch { /* Memory-only session. */ } }
  const ownerKey = id => `${STORAGE_KEY}:account:${id}`
  function readSaved(key) {
    try {
      const saved = JSON.parse(storage?.getItem(key) || 'null')
      if (!saved || (!tokenPattern.test(saved.token) && !(uuidPattern.test(saved.ownerId) && uuidPattern.test(saved.id)))) return null
      if (!saved.ownerId && saved.expiresAt && Date.parse(saved.expiresAt) <= now()) { storage?.removeItem(key); return null }
      const value = { token: tokenPattern.test(saved.token) ? saved.token : null, id: uuidPattern.test(saved.id) ? saved.id : null,
        ownerId: uuidPattern.test(saved.ownerId) ? saved.ownerId : null, expiresAt: saved.expiresAt || new Date(now() + 86_400_000).toISOString(),
        draft: typeof saved.draft === 'string' ? saved.draft.slice(0,4000) : '', files: Array.isArray(saved.files) ? saved.files.filter(file => uuidPattern.test(file?.id) && typeof file.name === 'string' && ['application/pdf','image/png','image/jpeg'].includes(file.mime) && file.size > 0 && file.size <= 10 * 1024 * 1024).slice(0,5) : [] }
      if (uuidPattern.test(saved.pending?.id) && typeof saved.pending.content === 'string'
        && saved.pending.content.length <= 4000 && (saved.pending.content.trim() || saved.pending.files?.length)) {
        value.pending = { id: saved.pending.id, content: saved.pending.content, files: Array.isArray(saved.pending.files) ? saved.pending.files.filter(id => uuidPattern.test(id)).slice(0,5) : [],
          locale: locales.has(saved.pending.locale) ? saved.pending.locale : 'vi', name: String(saved.pending.name || '').slice(0,100), email: String(saved.pending.email || '').slice(0,254), path: String(saved.pending.path || '/').split(/[?#]/)[0].slice(0,500) }
      }
      return value
    } catch { return null }
  }
  let record = readSaved(STORAGE_KEY), accountId = null, accountTask = null, preparing = null, operationController
  const localFiles = new Map()
  let state = { conversation: null, messages: [], hasMore: false, health: null, checkedAt: 0,
    status: 'idle', sending: false, loadingEarlier: false, pending: record?.pending || null,
    draft: record?.pending?.content || record?.draft || '', attachments: (record?.files || []).map(file => ({ ...file, status: 'ready' })),
    account: null, accountError: false, fileError: null, name: '', email: '', sessionOnly: !storage }
  const listeners = new Set()
  let generation = 0, reading = false, queuedRead = null, lastTyping = -Infinity
  let presenceState = 'left', presenceStarted = false, connectionId = null, presenceSequence = 0, lastPresenceAt = -Infinity
  const update = patch => { state = { ...state, ...patch }; listeners.forEach(notify => notify()) }
  function persist() {
    try {
      if (!storage) throw new Error('Storage unavailable')
      if (record) {
        record.draft = state.draft
        record.files = state.attachments.filter(file => file.status === 'ready').map(({ id,client_id,name,mime,size }) => ({ id,client_id,name,mime,size }))
        // An unsent or unacknowledged first message still needs its creation
        // capability after navigation. Once the server ID is known, ownership
        // alone authorizes reloads and the capability can be discarded.
        if (record.ownerId) { storage.setItem(ownerKey(record.ownerId), JSON.stringify({ ...record, token: uuidPattern.test(record.id) ? null : record.token })); storage.removeItem(STORAGE_KEY) }
        else storage.setItem(STORAGE_KEY, JSON.stringify(record))
      } else storage.removeItem(STORAGE_KEY)
    } catch { update({ sessionOnly: true }) }
  }
  function ensureRecord() {
    if (record) return
    const bytes = random.getRandomValues(new Uint8Array(32))
    record = { token: [...bytes].map(byte => byte.toString(16).padStart(2,'0')).join(''), id: null, ownerId: accountId, expiresAt: new Date(now() + 86_400_000).toISOString() }
  }
  const identity = () => record?.token ? { p_token: record.token } : { p_token: null, p_conversation_id: record?.id }
  function expireGuest() {
    if (!record || record.ownerId || Date.parse(record.expiresAt) > now()) return false
    operationController?.abort(); localFiles.forEach(entry => entry.controller?.abort()); localFiles.clear()
    record = null; generation++
    update({ conversation: null, messages: [], draft: '', attachments: [], pending: null, sending: false, status: 'missing' }); persist()
    return true
  }
  function failure(error) {
    if (error?.name === 'AbortError') return
    const status = error?.code === '42501' ? 'missing'
      : ['PGRST202', '42P01', 'UNAVAILABLE'].includes(error?.code) ? 'unavailable' : 'error'
    if (status === 'missing') { record = null; update({ conversation: null, messages: [], draft: '', attachments: [], pending: null }); persist() }
    update({ status })
  }
  function apply(data, { older = false } = {}) {
    if (!data?.conversation?.id || !Array.isArray(data.messages) || data.health?.version !== 1) throw new Error('Invalid chat response')
    if (!record) throw new Error('Chat identity unavailable')
    record.id = data.conversation.id
    if (data.conversation.guest_expires_at) record.expiresAt = data.conversation.guest_expires_at
    const acknowledged = record.pending && data.messages.some(message => message.client_id === record.pending.id)
    const patch = { conversation: data.conversation, messages: mergeLiveMessages(state.messages, data.messages),
      health: data.health, checkedAt: now(), status: 'ready' }
    if (data.conversation.account_saved === true) patch.accountError = false
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
      patch.attachments = []
      localFiles.clear()
    }
    update(patch)
    persist()
    if (presenceStarted) void setPresence(presenceState)
  }
  async function refresh({ signal } = {}) {
    if (expireGuest() || state.status === 'missing') return
    if (reading) { queuedRead = { signal }; return }
    reading = true
    const request = generation
    try {
      if (record?.id) {
        const data = await rpc('read', { ...identity(), p_mark_read: true }, { signal })
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
    if (state.sending || state.status === 'missing') return false
    if (expireGuest() || state.attachments.some(file => file.status !== 'ready')) return false
    if (!record?.pending && !state.draft.trim() && !state.attachments.length) return false
    ensureRecord()
    if (!record.pending) record.pending = { id: random.randomUUID(), content: state.draft.trim(), files: state.attachments.map(file => file.id),
      locale: locales.has(locale) ? locale : 'vi', name: state.name.trim(), email: state.email.trim(), path: path.split(/[?#]/)[0].slice(0, 500) }
    const request = ++generation
    operationController = new AbortController()
    persist()
    update({ sending: true, pending: record.pending })
    try {
      const pending = record.pending
      let data = record.id
        ? pending.files?.length
          ? await rpc('send_files', { ...identity(), p_client_id: pending.id, p_message: pending.content, p_files: pending.files }, { signal: operationController.signal })
          : await rpc('send', { ...identity(), p_client_id: pending.id, p_message: pending.content }, { signal: operationController.signal })
        : await rpc('open', { p_token: record.token, p_client_id: pending.id, p_message: pending.content,
          p_locale: pending.locale, p_name: pending.name, p_email: pending.email, p_path: pending.path }, { signal: operationController.signal })
      if (request !== generation) return false
      if (record.ownerId && record.token && data?.conversation?.account_saved === false) {
        // A guest first-send may have committed before sign-in but lost its
        // acknowledgement. Claim that now-known thread before discarding the
        // capability; otherwise its owner-scoped reload would be unauthorized.
        try { data = await rpc('claim', { p_token: record.token }, { signal: operationController.signal }) }
        catch { if (request === generation) update({ accountError: true }); return false }
        if (request !== generation) return false
      }
      apply(data)
      return true
    } catch (error) {
      if (request === generation && error?.code === '42501' && record?.pending?.files?.length) {
        try {
          // A missing draft file must not erase an otherwise valid conversation.
          const data = await rpc('read', { ...identity(), p_mark_read: true })
          if (request === generation) {
            apply(data)
            if (record.pending) {
              delete record.pending
              update({ pending: null, fileError: 'expired', attachments: state.attachments.map(file => ({ ...file, status: 'failed', canRetry: localFiles.has(file.client_id) })) })
              persist()
            }
          }
        } catch (readError) { if (request === generation) failure(readError) }
      } else if (request === generation) failure(error)
      return false
    }
    finally { if (request === generation) update({ sending: false }) }
  }
  async function loadEarlier() {
    if (!record?.id || state.loadingEarlier || !state.hasMore) return
    const request = generation
    update({ loadingEarlier: true })
    try {
      const data = await rpc('read', { ...identity(), p_before: state.messages[0]?.seq, p_mark_read: false })
      if (request === generation) apply(data, { older: true })
    } catch (error) { if (request === generation) failure(error) }
    finally { update({ loadingEarlier: false }) }
  }
  function typing(value) {
    if (!record?.id || (value && now() - lastTyping < 3000)) return
    lastTyping = now()
    void rpc('activity', { ...identity(), p_typing: Boolean(value) }).catch(() => {})
  }
  function setPresence(next, { keepalive = false, force = false } = {}) {
    if (!['active', 'away', 'left'].includes(next)) return Promise.resolve()
    const previous = presenceState
    presenceState = next
    if (next === 'active') presenceStarted = true
    // Reading the assistant alone never reports visitor presence to staff.
    if (!presenceStarted || !record || (!record.token && !record.id) || expireGuest()) return Promise.resolve()
    if (!force && next === previous && now() - lastPresenceAt < 15_000) return Promise.resolve()
    connectionId ||= random.randomUUID()
    lastPresenceAt = now()
    const sequence = ++presenceSequence
    return rpc('visitor_presence', { ...identity(), p_connection_id: connectionId, p_sequence: sequence, p_state: next }, { keepalive })
      .catch(() => { if (sequence === presenceSequence) lastPresenceAt = -Infinity })
  }
  async function syncAccount(user, { force = false } = {}) {
    const nextId = user?.id || null
    if (nextId === accountId && !force) { update({ account: user || null }); return accountTask }
    const oldId = accountId, guest = !record?.ownerId ? record : null
    accountId = nextId
    const request = ++generation
    operationController?.abort(); localFiles.forEach(entry => entry.controller?.abort())
    if (oldId && oldId !== nextId && record?.ownerId === oldId) { try { storage?.setItem(ownerKey(oldId), JSON.stringify({ id: record.id, ownerId: oldId })) } catch { /* Memory-only. */ } }
    update({ account: user || null, accountError: false, sending: false, loadingEarlier: false, attachments: state.attachments.map(file => file.status === 'uploading' ? { ...file, status: 'failed' } : file) })
    accountTask = (async () => {
      if (nextId && guest?.id) {
        try {
          const data = await rpc('claim', { p_token: guest.token })
          if (request !== generation) return
          record = { ...guest, ownerId: nextId }; apply(data)
        } catch { if (request === generation) update({ accountError: true }); return }
      } else {
        // Keep the question that led to sign-in instead of replacing it with
        // the account's last conversation. An empty guest record is not work
        // to carry over, so it must not displace that saved account selection.
        const guestComposer = guest && (state.draft.trim() || guest.pending || state.attachments.length > 0)
        record = nextId ? (guestComposer ? { ...guest, ownerId: nextId } : readSaved(ownerKey(nextId)))
          || (guest ? { ...guest, ownerId: nextId } : null) : readSaved(STORAGE_KEY)
        localFiles.clear()
        update({ conversation: null, messages: [], hasMore: false, pending: record?.pending || null, draft: record?.pending?.content || record?.draft || '', attachments: (record?.files || []).map(file => ({ ...file, status: 'ready' })), status: 'idle' })
        persist()
        await refresh()
      }
    })()
    return accountTask
  }
  async function ensureConversation({ locale = 'vi', path = '/' } = {}) {
    if (expireGuest()) throw new Error('CHAT_EXPIRED')
    if (record?.id) return
    if (preparing) return preparing
    ensureRecord(); persist()
    const request = generation
    preparing = rpc('prepare', { p_token: record.token, p_locale: locales.has(locale) ? locale : 'vi', p_name: state.name, p_email: state.email, p_path: path.split(/[?#]/)[0].slice(0,500) })
      .then(async data => {
        if (request !== generation) throw new Error('CHAT_CHANGED')
        // Preparing an upload can also recover an anonymous creation whose
        // response was lost before sign-in. Adopt it before persisting its ID.
        if (record.ownerId && record.token && data?.conversation?.account_saved === false) {
          try { data = await rpc('claim', { p_token: record.token }) }
          catch (error) { if (request === generation) update({ accountError: true }); throw error }
          if (request !== generation) throw new Error('CHAT_CHANGED')
        }
        apply(data)
      }).finally(() => { preparing = null })
    return preparing
  }
  async function runUpload(entry, options) {
    const request = generation
    entry.controller = new AbortController()
    update({ attachments: state.attachments.map(file => file.client_id === entry.client_id ? { ...file, status: 'uploading' } : file), fileError: null })
    try {
      await ensureConversation(options)
      const data = await upload(await config(), entry.file, { id: record.id, token: record.token }, entry.client_id, { signal: entry.controller.signal })
      if (request !== generation || !localFiles.has(entry.client_id)) return
      update({ attachments: state.attachments.map(file => file.client_id === entry.client_id ? { ...data, status: 'ready' } : file) }); persist()
    } catch (error) {
      if (request === generation && localFiles.has(entry.client_id)) update({ fileError: error.name === 'AbortError' ? null : error.status === 429 ? 'quota' : error.status === 400 || error.status === 413 ? 'format' : 'upload', attachments: state.attachments.map(file => file.client_id === entry.client_id ? { ...file, status: 'failed' } : file) })
    }
  }
  function attachFiles(files, options) {
    if (state.pending || state.sending) return Promise.resolve()
    if (state.attachments.length + files.length > 5) { update({ fileError: 'limit' }); return Promise.resolve() }
    try { files.forEach(validateChatFile) } catch { update({ fileError: 'format' }); return Promise.resolve() }
    const entries = files.map(file => ({ file, client_id: random.randomUUID(), options }))
    entries.forEach(entry => localFiles.set(entry.client_id, entry))
    update({ attachments: [...state.attachments, ...entries.map(entry => ({ name: entry.file.name, size: entry.file.size, mime: entry.file.type, client_id: entry.client_id, status: 'uploading' }))], fileError: null })
    return Promise.all(entries.map(entry => runUpload(entry, options)))
  }
  function removeAttachment(file) {
    if (state.pending) return
    localFiles.get(file.client_id)?.controller?.abort(); localFiles.delete(file.client_id)
    update({ attachments: state.attachments.filter(item => file.client_id ? item.client_id !== file.client_id : item.id !== file.id), fileError: null }); persist()
    if (file.id && record?.id) void rpc('file_discard', { ...identity(), p_conversation_id: record.id, p_file: file.id }).catch(() => {})
  }
  function stop() { operationController?.abort(); localFiles.forEach(entry => entry.controller?.abort()) }
  async function selectConversation(id) {
    if (!accountId || !uuidPattern.test(id)) return
    stop(); generation++; localFiles.clear()
    record = { id, ownerId: accountId, token: null }
    update({ conversation: null, messages: [], pending: null, draft: '', attachments: [], status: 'idle', fileError: null }); persist(); await refresh()
  }
  return {
    subscribe: notify => { listeners.add(notify); return () => listeners.delete(notify) },
    getSnapshot: () => state,
    refresh, send, loadEarlier, typing, setPresence, syncAccount, selectConversation, attachFiles, removeAttachment, stop,
    retryAttachment(file) { const entry = localFiles.get(file.client_id); if (entry) return runUpload(entry, entry.options) },
    saveDraft() { ensureRecord(); persist() },
    newConversation() { stop(); generation++; record = null; localFiles.clear(); try { if (accountId) storage?.removeItem(ownerKey(accountId)) } catch { /* Memory-only session. */ } update({ conversation: null, messages: [], pending: null, draft: '', attachments: [], status: 'idle', fileError: null }); persist(); void refresh() },
    async downloadFile(file) { try { await download(await config(), file, { id: record.id, token: record.token }) } catch { update({ fileError: 'download' }) } },
    setDraft: draft => { update({ draft: String(draft).slice(0, 4000) }); if (record || accountId) { ensureRecord(); persist() } },
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
  if (!sharedClient) {
    sharedClient = createLiveChatClient()
    subscribeAccount(() => { if (getAccountSnapshot().status === 'ready') void sharedClient.syncAccount(getAccountSnapshot().user) })
  }
  return sharedClient
}
