import { useCallback, useRef, useState } from 'react'

/** Keeping the tail bounded stops a long-running transcript filling storage. */
const MAX_MESSAGES = 50

/**
 * The transcript, persisted per language.
 *
 * The legacy key was the literal `'icueChatbotHistory:vi'`
 * (src/script.js:4548) regardless of the language being spoken, so an English
 * reader's transcript was filed under `:vi` and mixed with a Vietnamese one.
 * Keying by the actual language keeps the two apart, which matters now that
 * the same component serves six locales.
 */
export function useChatHistory(language) {
  const storageKey = `icueChatbotHistory:${language}`
  const keyRef = useRef(storageKey)
  keyRef.current = storageKey

  const [messages, setMessages] = useState(() => read(storageKey))

  const append = useCallback((message) => {
    setMessages((previous) => {
      const next = [...previous, { ...message, timestamp: new Date().toISOString() }]
      const trimmed = next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
      write(keyRef.current, trimmed)
      return trimmed
    })
  }, [])

  /** Re-read when the language changes, so each locale keeps its own thread. */
  const reload = useCallback((nextLanguage) => {
    keyRef.current = `icueChatbotHistory:${nextLanguage}`
    setMessages(read(keyRef.current))
  }, [])

  return { messages, append, reload }
}

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Storage may be unavailable in privacy-restricted browsing contexts.
    return []
  }
}

function write(key, messages) {
  try {
    localStorage.setItem(key, JSON.stringify(messages))
  } catch {
    // Storage may be unavailable, or over quota. The transcript is a
    // convenience, so losing it must not break the conversation in progress.
  }
}
