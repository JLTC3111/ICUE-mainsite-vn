export const HISTORY_LANGUAGES = ['vi', 'en', 'de', 'fr', 'ko', 'ja']
export const HISTORY_PREFIX = 'icueChatbotHistory:'
const MAX_MESSAGES = 50
const MAX_BYTES = 120_000
const encoder = new TextEncoder()

function legacyId(message) {
  const text = `${message.timestamp}:${message.role}:${message.content}`
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return `legacy-${message.timestamp}-${(hash >>> 0).toString(16)}`
}

function safeLink(link) {
  if (!link || typeof link.label !== 'string' || typeof link.url !== 'string') return []
  if (!/^https?:\/\//i.test(link.url) && !/^\/(?!\/)/.test(link.url)) return []
  return [{ label: link.label.slice(0, 200), url: link.url.slice(0, 2000) }]
}

/** Validate all storage/import boundaries; transcripts always render as text. */
export function normalizeMessages(input) {
  if (!Array.isArray(input)) return []
  const messages = input.slice(-1000).flatMap(item => {
    if (!item || !['user', 'bot'].includes(item.role) || typeof item.content !== 'string') return []
    if (!Number.isFinite(Date.parse(item.timestamp))) return []
    const message = {
      id: typeof item.id === 'string' && item.id.length <= 100 ? item.id : legacyId(item),
      role: item.role,
      content: item.content.slice(0, 4000),
      timestamp: new Date(item.timestamp).toISOString(),
      links: Array.isArray(item.links) ? item.links.slice(0, 6).flatMap(safeLink) : [],
    }
    if (item.meta && typeof item.meta.source === 'string') {
      message.meta = { source: item.meta.source.slice(0, 40) }
      for (const key of ['intentId', 'faqId', 'language']) {
        if (typeof item.meta[key] === 'string') message.meta[key] = item.meta[key].slice(0, 100)
      }
    }
    return [message]
  })
  const unique = new Map()
  for (const message of messages) {
    const previous = unique.get(message.id)
    // A deterministic tie break makes concurrent merges converge, even for
    // malformed imports reusing an ID with different contents.
    if (!previous || JSON.stringify(message) > JSON.stringify(previous)) unique.set(message.id, message)
  }
  const ordered = [...unique.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)).slice(-MAX_MESSAGES)
  let size = 0
  return ordered.reverse().filter(message => {
    size += encoder.encode(JSON.stringify(message)).length
    return size <= MAX_BYTES
  }).reverse()
}

export function mergeHistories(...histories) {
  return Object.fromEntries(HISTORY_LANGUAGES.map(language => [language,
    normalizeMessages(histories.flatMap(history => Array.isArray(history?.[language]) ? history[language] : [])),
  ]))
}

/** One store per app, shared with the sync controller and every chat consumer. */
export function createHistoryStore({ storage = () => globalThis.localStorage, events = globalThis.window } = {}) {
  const cache = new Map()
  const listeners = new Set()
  const key = language => `${HISTORY_PREFIX}${language}`
  const read = language => {
    let stored = []
    try { stored = JSON.parse(storage()?.getItem(key(language)) || '[]') } catch { /* Keep in-memory history. */ }
    const previous = cache.get(language) || []
    const merged = normalizeMessages([...previous, ...(Array.isArray(stored) ? stored : [])])
    if (JSON.stringify(previous) !== JSON.stringify(merged) || !cache.has(language)) cache.set(language, merged)
    return cache.get(language)
  }
  const notify = () => listeners.forEach(listener => listener())
  const merge = history => {
    let changed = false
    for (const language of HISTORY_LANGUAGES) {
      if (!Array.isArray(history?.[language])) continue
      const previous = read(language)
      const next = normalizeMessages([...previous, ...history[language]])
      const raw = JSON.stringify(next)
      if (raw !== JSON.stringify(previous)) { cache.set(language, next); changed = true }
      try { if (storage()?.getItem(key(language)) !== raw) storage()?.setItem(key(language), raw) } catch { /* In-memory history remains available. */ }
    }
    if (changed) notify()
  }
  const refresh = event => {
    if (event?.type === 'storage' && event.key && !event.key.startsWith(HISTORY_PREFIX)) return
    if (event?.type === 'storage' && event.newValue === null) {
      if (event.key) cache.delete(event.key.slice(HISTORY_PREFIX.length))
      else cache.clear()
      notify()
      return
    }
    // Merge, never replace: a sibling tab may have written from an older view.
    // Persist the union as well, so closing the last tab cannot lose an update
    // that only survived in that tab's in-memory snapshot.
    merge(Object.fromEntries(HISTORY_LANGUAGES.map(language => [language, read(language)])))
    notify()
  }
  return {
    read,
    readAll: () => Object.fromEntries(HISTORY_LANGUAGES.map(language => [language, read(language)])),
    merge,
    append(language, message) {
      const last = read(language).at(-1)
      const timestamp = new Date(Math.max(Date.now(), (Date.parse(last?.timestamp) || 0) + 1)).toISOString()
      const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
      merge({ [language]: [{ ...message, id, timestamp }] })
    },
    subscribe(listener) {
      if (!listeners.size) {
        events?.addEventListener('storage', refresh)
        events?.addEventListener('pageshow', refresh)
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (!listeners.size) {
          events?.removeEventListener('storage', refresh)
          events?.removeEventListener('pageshow', refresh)
        }
      }
    },
  }
}

export const chatHistory = createHistoryStore()
