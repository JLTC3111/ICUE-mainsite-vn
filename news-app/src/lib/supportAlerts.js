const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i
const sequence = value => /^(0|[1-9]\d*)$/.test(String(value)) ? String(value) : null
const newer = (next, previous) => BigInt(next) > BigInt(previous || '0')

export const isSupportConversationId = value => typeof value === 'string' && UUID.test(value)

function eventFrom(value) {
  const seq = sequence(value?.seq)
  if (!isSupportConversationId(value?.conversation_id) || !seq || !Number.isSafeInteger(value?.count) || value.count < 1) return null
  return { id: value.conversation_id, seq, count: value.count,
    name: typeof value.visitor_name === 'string' ? value.visitor_name.slice(0, 100) : '',
    preview: typeof value.preview === 'string' ? value.preview.slice(0, 180) : '' }
}

export function createSupportAlerts({ userId, rpc, preferenceStorage, sessionStorage, window, document,
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  const preferenceKey = `icue:support-alerts:${userId}`
  const sessionKey = `icue:support-alerts-session:${userId}`
  let saved, enabled = false
  try { enabled = preferenceStorage?.getItem(preferenceKey) === 'true' } catch { /* Keep an in-memory preference. */ }
  try { saved = JSON.parse(sessionStorage?.getItem(sessionKey) || 'null') } catch { /* Ignore invalid saved alerts. */ }
  let cursor = sequence(saved?.cursor)
  let seen = new Set(Array.isArray(saved?.seen) ? saved.seen.map(sequence).filter(Boolean).slice(0, 1000) : [])
  const restored = Array.isArray(saved?.toasts) ? saved.toasts.map(eventFrom).filter(Boolean) : []
  let snapshot = { enabled, unread: 0, toasts: [...new Map(restored.map(event => [event.id, event])).values()], error: false, arrival: 0 }
  const listeners = new Set()
  let running = false, timer, controller, generation = 0, failures = 0
  const publish = patch => { snapshot = { ...snapshot, ...patch }; listeners.forEach(notify => notify()) }
  const persist = () => {
    try { sessionStorage?.setItem(sessionKey, JSON.stringify({ cursor, seen: [...seen], toasts: snapshot.toasts.map(event => ({
      conversation_id: event.id, seq: event.seq, count: event.count, visitor_name: event.name, preview: event.preview,
    })) })) } catch { /* Alerts remain visible if storage is blocked or full. */ }
  }
  const pause = () => { generation++; clearTimer(timer); controller?.abort(); controller = null }
  const poll = async () => {
    if (!running || !snapshot.enabled || controller) return
    clearTimer(timer)
    const request = new AbortController()
    controller = request
    const version = generation
    let hasMore = false
    try {
      const data = await rpc({ p_after: cursor }, { signal: request.signal })
      if (!running || version !== generation || request.signal.aborted) return
      const nextCursor = sequence(data?.cursor)
      if (!nextCursor || !Array.isArray(data.events) || !Number.isSafeInteger(data.unread) || data.unread < 0
        || typeof data.has_more !== 'boolean' || (cursor && newer(cursor, nextCursor))) throw new Error('Invalid support alert response')
      const events = data.events.map(eventFrom)
      const overlap = Array.isArray(data.overlap) ? data.overlap.map(eventFrom) : []
      const processed = Array.isArray(data.seen) ? data.seen.map(sequence) : []
      if ([...events, ...overlap].some(event => !event || newer(event.seq, nextCursor)) || processed.some(seq => !seq || newer(seq, nextCursor))) throw new Error('Invalid support alert event')
      const toasts = new Map(snapshot.toasts.map(event => [event.id, event]))
      let arrivals = 0
      const incoming = [...events.filter(event => !cursor || newer(event.seq, cursor)), ...overlap.filter(event => !seen.has(event.seq))]
      for (const event of incoming) {
        const previous = toasts.get(event.id)
        toasts.set(event.id, { ...(previous && newer(previous.seq, event.seq) ? previous : event), count: event.count + (previous?.count || 0) })
        arrivals++
      }
      seen = new Set([...new Set([...seen, ...processed, ...events.map(event => event.seq), ...overlap.map(event => event.seq)])]
        .sort((a, b) => newer(a, b) ? -1 : a === b ? 0 : 1).slice(0, 1000))
      cursor = nextCursor
      failures = 0
      hasMore = data.has_more
      publish({ unread: data.unread, toasts: [...toasts.values()], error: false, arrival: snapshot.arrival + arrivals })
      persist()
    } catch (error) {
      if (request.signal.aborted || version !== generation || !running) return
      failures++
      if (error?.code === '42501' || error?.status === 401 || error?.status === 403) {
        cursor = null
        seen.clear()
        publish({ enabled: false, unread: 0, toasts: [], error: true })
        persist()
      } else publish({ error: true })
    } finally {
      if (controller === request) controller = null
      if (running && snapshot.enabled && version === generation) {
        const delay = failures ? Math.min(30_000, 2500 * 2 ** failures) : hasMore ? 0 : document?.hidden ? 10_000 : 2500
        timer = setTimer(poll, delay)
      }
    }
  }
  const setEnabled = (value, persistPreference = true) => {
    if (value === snapshot.enabled) return
    pause()
    publish({ enabled: value, error: false })
    if (persistPreference) try { preferenceStorage?.setItem(preferenceKey, String(value)) } catch { /* Memory still works. */ }
    if (value) void poll()
  }
  const wake = () => { if (running && snapshot.enabled) { clearTimer(timer); void poll() } }
  const storage = event => { if (event.key === preferenceKey || event.key === null) {
    let value
    try { value = preferenceStorage?.getItem(preferenceKey) === 'true' } catch { return }
    setEnabled(value, false)
  } }
  return {
    getSnapshot: () => snapshot,
    subscribe: notify => { listeners.add(notify); return () => listeners.delete(notify) },
    setEnabled,
    dismiss(id, seq) {
      publish({ toasts: snapshot.toasts.filter(event => event.id !== id || newer(event.seq, seq)) })
      persist()
    },
    start() {
      if (running) return
      running = true
      window?.addEventListener('online', wake)
      window?.addEventListener('focus', wake)
      window?.addEventListener('pageshow', wake)
      window?.addEventListener('storage', storage)
      document?.addEventListener('visibilitychange', wake)
      void poll()
    },
    stop() {
      running = false
      pause()
      window?.removeEventListener('online', wake)
      window?.removeEventListener('focus', wake)
      window?.removeEventListener('pageshow', wake)
      window?.removeEventListener('storage', storage)
      document?.removeEventListener('visibilitychange', wake)
    },
    refresh: wake,
  }
}
