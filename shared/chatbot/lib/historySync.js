import { chatHistory, mergeHistories } from './historyStore.js'
import { createHistoryCipher, createPairingCode, normalizePairingCode } from './historyCrypto.js'
import { createHistoryApi } from './historyApi.js'

export const SYNC_KEY = 'icueChatbotSync:v1'

/** Event-driven sync, with a slow poll only while the chat is visible.
 * Every write merges the latest remote revision and uses compare-and-swap.
 * Offline changes stay local; aborts and stale identities cannot merge data. */
export function createHistorySync({
  store = chatHistory, api = createHistoryApi(), storage = () => globalThis.localStorage,
  events = globalThis.window, page = globalThis.document, network = globalThis.navigator,
  timers = globalThis,
} = {}) {
  const saved = () => {
    try { return normalizePairingCode(storage()?.getItem(SYNC_KEY)) } catch { return '' }
  }
  let state = { code: saved(), status: 'local', busy: false, persistent: true }
  let started = false, open = false, timer, controller, epoch = 0, unsubscribe, dirty = false
  let cipherCode, cipher
  let pendingCode = ''
  const listeners = new Set()
  const set = values => { state = { ...state, ...values }; listeners.forEach(listener => listener()) }
  const visible = () => !page?.hidden && network?.onLine !== false
  const clearTimer = () => { timers.clearTimeout(timer); timer = undefined }
  const cancel = () => { epoch++; clearTimer(); controller?.abort(); controller = undefined }
  const statusFor = error => network?.onLine === false ? 'offline'
    : error.status === 404 ? 'missing'
      : error.status === 503 ? 'unavailable'
        : error.message === 'invalid_code' ? 'invalid' : 'error'
  const persist = code => {
    let persistent = true
    try { if (code) storage().setItem(SYNC_KEY, code); else storage().removeItem(SYNC_KEY) } catch { persistent = false }
    set({ code, persistent })
  }
  const cipherFor = async code => {
    if (cipherCode !== code) { cipher = await createHistoryCipher(code); cipherCode = code }
    return cipher
  }
  const schedule = (delay = 400) => {
    dirty = true
    if (!started || !state.code || !visible() || state.busy) return
    clearTimer()
    timer = timers.setTimeout(() => { void sync() }, delay)
  }
  async function operation(task) {
    if (state.busy || !started) return false
    const generation = ++epoch
    controller = new AbortController()
    const signal = controller.signal
    const current = () => started && generation === epoch && !signal.aborted
    dirty = false
    clearTimer()
    set({ busy: true, status: 'syncing' })
    try {
      await task(signal, current)
      if (current()) set({ status: state.code ? 'ready' : 'local' })
      return current()
    } catch (error) {
      if (current()) set({ status: statusFor(error) })
      return false
    } finally {
      if (generation === epoch) {
        controller = undefined
        set({ busy: false })
        // A failing request backs off. There are no background/hidden polls.
        if (started && state.code && visible() && state.status !== 'missing' && (open || dirty)) schedule(state.status === 'ready' && dirty ? 800 : 30_000)
      }
    }
  }
  async function sync() {
    if (!state.code || !visible()) { if (state.code) set({ status: network?.onLine === false ? 'offline' : state.status }); return false }
    const code = state.code
    return operation(async (signal, current) => {
      const crypt = await cipherFor(code)
      for (let attempt = 0; attempt < 4 && current(); attempt++) {
        const remote = await api(crypt.token, { signal })
        const history = await crypt.decrypt(remote.payload)
        if (!current()) return
        const merged = mergeHistories(history, store.readAll())
        store.merge(merged)
        if (JSON.stringify(merged) === JSON.stringify(history)) return
        const payload = await crypt.encrypt(merged)
        if (!current()) return
        try {
          await api(crypt.token, { method: 'PUT', body: { revision: remote.revision, payload }, signal })
          return
        } catch (error) { if (error.status !== 409 || attempt === 3) throw error }
      }
    })
  }
  const resume = () => {
    if (!visible()) {
      cancel()
      set({ busy: false, status: network?.onLine === false && state.code ? 'offline' : state.status })
    } else {
      if (!state.code && state.status === 'syncing') set({ status: 'local' })
      schedule()
    }
  }
  const suspend = () => { cancel(); set({ busy: false }) }
  const storageChanged = event => {
    if (event.key !== SYNC_KEY && event.key !== null) return
    const code = saved()
    if (code === state.code) return
    cancel()
    set({ code, busy: false, status: code ? 'syncing' : 'local' })
    schedule()
  }
  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    start() {
      started = true
      unsubscribe = store.subscribe(() => schedule())
      events?.addEventListener('online', resume)
      events?.addEventListener('offline', resume)
      events?.addEventListener('pageshow', resume)
      events?.addEventListener('pagehide', suspend)
      events?.addEventListener('storage', storageChanged)
      page?.addEventListener('visibilitychange', resume)
      page?.addEventListener('freeze', suspend)
      page?.addEventListener('resume', resume)
      resume()
      return () => {
        started = false
        cancel()
        state = { ...state, busy: false }
        unsubscribe?.()
        events?.removeEventListener('online', resume)
        events?.removeEventListener('offline', resume)
        events?.removeEventListener('pageshow', resume)
        events?.removeEventListener('pagehide', suspend)
        events?.removeEventListener('storage', storageChanged)
        page?.removeEventListener('visibilitychange', resume)
        page?.removeEventListener('freeze', suspend)
        page?.removeEventListener('resume', resume)
      }
    },
    setOpen(value) { open = value; if (value || dirty) schedule(); else clearTimer() },
    sync,
    create() {
      return operation(async (signal, current) => {
        // Retain the same capability for a retry after a lost create response.
        // A duplicate insert is reconciled by reading/decrypting the vault.
        const code = pendingCode || createPairingCode()
        pendingCode = code
        const crypt = await cipherFor(code)
        const payload = await crypt.encrypt(store.readAll())
        if (!current()) return
        try {
          await api(crypt.token, { method: 'PUT', body: { revision: 0, payload }, signal })
        } catch (error) {
          if (error.status !== 409 || !current()) throw error
          const remote = await api(crypt.token, { signal })
          const history = await crypt.decrypt(remote.payload)
          if (current()) { store.merge(history); dirty = true }
        }
        if (current()) { persist(code); pendingCode = '' }
      })
    },
    join(input) {
      return operation(async (signal, current) => {
        const code = normalizePairingCode(input)
        const crypt = await cipherFor(code)
        const remote = await api(crypt.token, { signal })
        const history = await crypt.decrypt(remote.payload)
        if (!current()) return
        // Only verified existing vaults can pair. A mistyped code never creates
        // a new cloud history or replaces the visitor's local conversation.
        persist(code)
        store.merge(history)
        dirty = true
      })
    },
    disconnect() {
      cancel()
      pendingCode = ''
      persist('')
      set({ busy: false, status: 'local' })
    },
    remove() {
      const code = state.code
      if (!code) return Promise.resolve(false)
      return operation(async (signal, current) => {
        const crypt = await cipherFor(code)
        if (!current()) return
        await api(crypt.token, { method: 'DELETE', signal })
        if (current()) { persist(''); set({ status: 'local' }) }
      })
    },
  }
}
