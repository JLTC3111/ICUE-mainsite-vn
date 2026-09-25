import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createChatbotKnowledge } from './lib/knowledge'
import { createBotCopy } from './lib/botCopy'
import { knowledgeUrls } from './lib/knowledgeAssets.js'
import { useChatHistory } from './hooks/useChatHistory'
import { useHistorySync } from './hooks/useHistorySync.js'
import HistorySettings from './HistorySettings.jsx'
import AssistantAvatar from './AssistantAvatar.jsx'
import ChatMascot from './mascot/ChatMascot.jsx'
import { responseExpression } from './mascot/expressions.js'
import './Chatbot.css'

/**
 * The ICUE assistant.
 *
 * Ported from `window.initializeChatbot` (src/script.js:4133-4770), where it
 * was injected as an HTML string into every page that loaded the legacy
 * runtime — which meant it appeared on the legacy pages and nowhere else. As a
 * shared component mounted once in each app shell. The legacy runtime is no
 * longer published.
 *
 * The reply engine remains retrieval-only: authored intents are ranked by
 * lexical overlap, alongside the FAQ corpus, with clarification and authored
 * fallback paths. It never generates an answer — see lib/knowledge.js.
 */

const BOT_REPLY_DELAY_MS = 700

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
      <div className="icue-chat__avatar">
        {isUser ? <UserAvatar /> : <AssistantAvatar state={message.meta ? responseExpression(message.meta) : 'idle'} />}
      </div>
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
  const [showSync, setShowSync] = useState(false)
  const { sync, state: syncState } = useHistorySync(isOpen)
  const [draft, setDraft] = useState('')
  const [activity, setActivity] = useState({ locale, state: 'idle' })
  const mascotState = activity.locale === locale ? activity.state : 'idle'
  const isThinking = mascotState === 'thinking'
  const { messages, append } = useChatHistory(locale)
  const rootRef = useRef(null)
  const messagesRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const requestRef = useRef(0)
  const sendingRef = useRef(false)
  const launcherRef = useRef(null)
  const closeRef = useRef(null)
  const syncButtonRef = useRef(null)
  const wasOpenRef = useRef(false)
  const dialogId = useId()

  const knowledge = useMemo(
    () =>
      createChatbotKnowledge({
        siteLang: locale,
        baseUrl: import.meta.env.BASE_URL,
        urls: knowledgeUrls,
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
    sendingRef.current = false
    // A late reply from the previous locale/unmounted page must not update the
    // new transcript or leave its mascot in a stale thinking/error state.
    return () => {
      clearTimeout(timerRef.current)
      requestRef.current += 1
      sendingRef.current = false
    }
  }, [locale])

  const closeChat = useCallback(() => {
    setIsOpen(false)
    setShowSync(false)
    setActivity(previous => previous.locale === locale && previous.state === 'thinking'
      ? previous : { locale, state: 'idle' })
  }, [locale])

  // Pin to the newest message whenever one arrives or the panel opens.
  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isThinking, isOpen, showSync])

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) launcherRef.current?.focus({ preventScroll: true })
      wasOpenRef.current = false
      return undefined
    }
    wasOpenRef.current = true
    // Opening on touch should not summon the keyboard or shift the viewport.
    const target = window.matchMedia('(pointer: fine)').matches ? inputRef : closeRef
    target.current?.focus({ preventScroll: true })

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeChat()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeChat, isOpen])

  // Mobile keyboards can shrink only the visual viewport, leaving fixed
  // elements anchored behind the keyboard in the layout viewport.
  useEffect(() => {
    if (!isOpen) return undefined
    const root = rootRef.current
    const viewport = window.visualViewport
    let frame = 0
    const update = () => {
      frame = 0
      const height = viewport?.height ?? window.innerHeight
      const inset = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0))
      root.style.setProperty('--icue-chat-viewport-height', `${height}px`)
      root.style.setProperty('--icue-chat-keyboard-inset', `${inset}px`)
      root.classList.toggle('icue-chat--compact', height < 600)
    }
    const schedule = () => {
      if (!document.hidden && !frame) frame = window.requestAnimationFrame(update)
    }
    const onVisibility = () => {
      window.cancelAnimationFrame(frame)
      frame = 0
      schedule()
    }
    update()
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)
    window.addEventListener('resize', schedule)
    window.addEventListener('pageshow', onVisibility)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.cancelAnimationFrame(frame)
      viewport?.removeEventListener('resize', schedule)
      viewport?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pageshow', onVisibility)
      document.removeEventListener('visibilitychange', onVisibility)
      root.style.removeProperty('--icue-chat-viewport-height')
      root.style.removeProperty('--icue-chat-keyboard-inset')
      root.classList.remove('icue-chat--compact')
    }
  }, [isOpen])

  const send = useCallback(
    (text) => {
      const message = String(text || '').trim()
      if (!message || sendingRef.current) return
      sendingRef.current = true
      const request = ++requestRef.current

      append({ role: 'user', content: message })
      setDraft('')
      setActivity({ locale, state: 'thinking' })

      // The pause is deliberate — an instant reply reads as a canned lookup,
      // which is exactly what it is, and rushes the reader past their own
      // question. Kept from the legacy implementation.
      timerRef.current = setTimeout(async () => {
        try {
          const response = await knowledge.getResponse(message)
          if (request !== requestRef.current) return
          append({
            role: 'bot',
            content: response.content,
            links: response.links || [],
            meta: response.meta || { source: 'unknown' },
          })
          setActivity({ locale, state: responseExpression(response.meta) })
          emitEvent('response', response.meta || { source: 'unknown' })
        } catch {
          if (request !== requestRef.current) return
          append({ role: 'bot', content: labels.error, links: [], meta: { source: 'error' } })
          setActivity({ locale, state: 'error' })
          emitEvent('error')
        } finally {
          if (request === requestRef.current) {
            sendingRef.current = false
          }
        }
      }, BOT_REPLY_DELAY_MS)
    },
    [append, emitEvent, knowledge, labels.error, locale],
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
    <div className={`icue-chat${isOpen ? ' icue-chat--open' : ''}`} ref={rootRef}>
      {isOpen && (
        <div id={dialogId} className="icue-chat__window" role="dialog" aria-label={labels.title}>
          <div className="icue-chat__header">
            <div className="icue-chat__title">
              <span className="icue-chat__heading">
                <span>{labels.title}</span>
                <span className="icue-chat__subtitle">{labels.badge}</span>
              </span>
            </div>
            <div className="icue-chat__header-actions">
              {labels.sync && (
                <button ref={syncButtonRef} type="button" className="icue-chat__sync" aria-label={labels.sync.title} aria-expanded={showSync} onClick={() => setShowSync(value => !value)}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M20 7a8 8 0 0 0-14-1L3 9m0-6v6h6M4 17a8 8 0 0 0 14 1l3-3m0 6v-6h-6" />
                  </svg>
                </button>
              )}
              <button ref={closeRef} type="button" className="icue-chat__close" onClick={closeChat} aria-label={labels.close}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>

          {showSync && labels.sync ? (
            <HistorySettings sync={sync} state={syncState} labels={labels.sync} onBack={() => { setShowSync(false); syncButtonRef.current?.focus({ preventScroll: true }) }} />
          ) : <>
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
                key={message.id}
                message={message}
                onLinkClick={recordLinkClick}
              />
            ))}
            {isThinking && (
              <div className="icue-chat__message icue-chat__message--bot">
                <div className="icue-chat__avatar">
                  <AssistantAvatar state="thinking" />
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
                maxLength={4000}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={labels.placeholder}
                aria-label={labels.placeholder}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
                }}
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
          </>}
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        className="icue-chat__toggle"
        onClick={() => {
          if (isOpen) closeChat()
          else {
            if (!isThinking) setActivity({ locale, state: 'greeting' })
            setIsOpen(true)
          }
        }}
        aria-expanded={isOpen}
        aria-controls={isOpen ? dialogId : undefined}
        aria-haspopup="dialog"
        aria-label={isOpen ? labels.close : labels.open}
      >
        <ChatMascot state={isThinking ? 'thinking' : mascotState} interactive={!isOpen} />
      </button>
    </div>
  )
}
