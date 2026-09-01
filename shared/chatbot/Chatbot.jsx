import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createChatbotKnowledge } from './lib/knowledge'
import { createBotCopy } from './lib/botCopy'
import { useChatHistory } from './hooks/useChatHistory'
import './Chatbot.css'

/**
 * The ICUE assistant.
 *
 * Ported from `window.initializeChatbot` (src/script.js:4133-4770), where it
 * was injected as an HTML string into every page that loaded the legacy
 * runtime — which meant it appeared on the legacy pages and nowhere else. As a
 * shared component any app can mount it; /faqs and /recruitment do today.
 *
 * The reply engine remains retrieval-only: authored intents are ranked by
 * lexical overlap, alongside the FAQ corpus, with clarification and authored
 * fallback paths. It never generates an answer — see lib/knowledge.js.
 */

const BOT_REPLY_DELAY_MS = 700

function BotAvatar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04 1.05 4.4L1 22l5.6-2.05C8.96 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
    </svg>
  )
}

function UserAvatar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  )
}

function Message({ message, onLinkClick }) {
  const isUser = message.role === 'user'
  const links = Array.isArray(message.links) ? message.links : []

  return (
    <div className={`icue-chat__message icue-chat__message--${isUser ? 'user' : 'bot'}`}>
      <div className="icue-chat__avatar">{isUser ? <UserAvatar /> : <BotAvatar />}</div>
      <div className="icue-chat__bubble">
        {/* Rendered as text, never as markup: the knowledge base is authored,
            but a bubble that interprets HTML is a needless liability. */}
        {message.content}
        {links.length > 0 && (
          <div className="icue-chat__links">
            {links.map((link) => (
              <a
                key={`${link.url}-${link.label}`}
                href={link.url}
                onClick={() => onLinkClick?.(link, message.meta)}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * @param {object} props
 * @param {string} props.locale   the reader's UI language, one of the six
 * @param {object} props.labels   UI chrome from the host app's i18n (`chat.*`)
 * @param {{faqs: string, contact: string}} props.links  resolved page URLs
 * @param {(event: object) => void} [props.onEvent] privacy-safe analytics hook;
 *   events deliberately exclude the visitor's message text
 */
export default function Chatbot({ locale = 'vi', labels, links, onEvent }) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const { messages, append, reload } = useChatHistory(locale)
  const messagesRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const knowledge = useMemo(
    () =>
      createChatbotKnowledge({
        siteLang: locale,
        baseUrl: import.meta.env.BASE_URL,
        copy: createBotCopy({ faqsUrl: links.faqs, contactUrl: links.contact }),
      }),
    [locale, links.faqs, links.contact],
  )

  const emitEvent = useCallback(
    (type, detail = {}) => {
      const event = {
        type,
        locale,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        ...detail,
      }
      onEvent?.(event)
      if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('icue:chatbot-event', { detail: event }))
      }
    },
    [locale, onEvent],
  )

  // Each language keeps its own transcript; switching flag swaps the thread.
  useEffect(() => {
    reload(locale)
  }, [locale, reload])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // Pin to the newest message whenever one arrives or the panel opens.
  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isThinking, isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    inputRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const send = useCallback(
    (text) => {
      const message = String(text || '').trim()
      if (!message || isThinking) return

      append({ role: 'user', content: message })
      setDraft('')
      setIsThinking(true)

      // The pause is deliberate — an instant reply reads as a canned lookup,
      // which is exactly what it is, and rushes the reader past their own
      // question. Kept from the legacy implementation.
      timerRef.current = setTimeout(async () => {
        try {
          const response = await knowledge.getResponse(message)
          append({
            role: 'bot',
            content: response.content,
            links: response.links || [],
            meta: response.meta || { source: 'unknown' },
          })
          emitEvent('response', response.meta || { source: 'unknown' })
        } catch {
          append({ role: 'bot', content: labels.error, links: [] })
          emitEvent('error')
        } finally {
          setIsThinking(false)
        }
      }, BOT_REPLY_DELAY_MS)
    },
    [append, emitEvent, isThinking, knowledge, labels.error],
  )

  const recordLinkClick = useCallback(
    (link, responseMeta = {}) => {
      emitEvent('link_click', {
        source: responseMeta?.source || 'unknown',
        intentId: responseMeta?.intentId,
        faqId: responseMeta?.faqId,
        destination: link.url,
      })
    },
    [emitEvent],
  )

  const suggestions = Array.isArray(labels.suggestions) ? labels.suggestions : []
  const hasTranscript = messages.length > 0

  return (
    <div className="icue-chat">
      {isOpen && (
        <div className="icue-chat__window" role="dialog" aria-label={labels.title}>
          <div className="icue-chat__header">
            <div className="icue-chat__title">
              <span>{labels.title}</span>
            </div>
            <button
              type="button"
              className="icue-chat__close"
              onClick={() => setIsOpen(false)}
              aria-label={labels.close}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          <div
            className="icue-chat__messages"
            ref={messagesRef}
            role="log"
            aria-live="polite"
            aria-label={labels.transcript}
          >
            {/* The greeting is shown only until the reader has a transcript, the
                same way the legacy panel kept its seeded first bubble. */}
            {!hasTranscript && <Message message={{ role: 'bot', content: labels.greeting }} />}
            {messages.map((message) => (
              <Message
                key={`${message.timestamp}-${message.role}`}
                message={message}
                onLinkClick={recordLinkClick}
              />
            ))}
            {isThinking && (
              <div className="icue-chat__message icue-chat__message--bot">
                <div className="icue-chat__avatar">
                  <BotAvatar />
                </div>
                <div className="icue-chat__bubble icue-chat__pending">{labels.thinking}</div>
              </div>
            )}
          </div>

          <div className="icue-chat__input-area">
            <form
              className="icue-chat__input-row"
              onSubmit={(event) => {
                event.preventDefault()
                send(draft)
              }}
            >
              <input
                ref={inputRef}
                className="icue-chat__input"
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={labels.placeholder}
                aria-label={labels.placeholder}
              />
              <button
                type="submit"
                className="icue-chat__send"
                aria-label={labels.send}
                disabled={isThinking || !draft.trim()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>

            {suggestions.length > 0 && (
              <div className="icue-chat__suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="icue-chat__suggestion"
                    onClick={() => send(suggestion)}
                    disabled={isThinking}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        className="icue-chat__toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? labels.close : labels.open}
      >
        <svg width="64" height="64" viewBox="0 -0.5 17 17" aria-hidden="true">
          <path
            d="M9.019,1.04 C4.621,1.04 1.051,3.66 1.051,6.892 C1.051,9.842 4.026,12.276 7.893,12.679 L5.845,15.929 L11.964,12.326 C14.906,11.465 16.989,9.358 16.989,6.891 C16.989,3.66 13.42,1.04 9.019,1.04 L9.019,1.04 Z M6,8 L4,8 L4,6 L6,6 L6,8 L6,8 Z M10,8 L8,8 L8,6 L10,6 L10,8 L10,8 Z M14,8 L12,8 L12,6 L14,6 L14,8 L14,8 Z"
            fill="#34efeb"
          />
        </svg>
        <span className="icue-chat__badge">{labels.badge}</span>
      </button>
    </div>
  )
}
