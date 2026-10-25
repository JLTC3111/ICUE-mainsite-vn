import { useLayoutEffect, useRef } from 'react'

export default function LiveChatMessages({ messages, conversation, labels, locale, viewer = 'visitor', pending, active = true, children }) {
  const logRef = useRef(null)
  const previous = useRef({ last: null, height: 0, count: 0 })
  useLayoutEffect(() => {
    const log = logRef.current
    if (!log || !active) return
    const last = messages.at(-1)
    if (last?.id === previous.current.last && messages.length > previous.current.count) {
      log.scrollTop += log.scrollHeight - previous.current.height
    } else if (last?.id !== previous.current.last || pending) {
      const nearBottom = previous.current.height - log.scrollTop - log.clientHeight < 100
      if (!previous.current.last || nearBottom || last?.sender === viewer || pending) log.scrollTop = log.scrollHeight
    }
    previous.current = { last: last?.id, count: messages.length, height: log.scrollHeight }
  }, [messages, pending, active, viewer])

  return (
    <div ref={logRef} className="icue-live__messages" role="log" aria-live="polite" aria-label={labels.title}>
      {children}
      {messages.map(message => {
        const own = message.sender === viewer
        const readSeq = viewer === 'visitor' ? conversation?.staff_read_seq : conversation?.visitor_read_seq
        const time = new Date(message.created_at)
        return (
          <article key={message.id} className={`icue-live__message${own ? ' icue-live__message--own' : ''}`}>
            <span className="icue-live__sender">{own ? labels.you : message.sender_name || (viewer === 'visitor' ? labels.title : labels.guest)}</span>
            <p>{message.content}</p>
            <small>
              {Number.isFinite(time.getTime()) && <time dateTime={message.created_at}>{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(time)}</time>}
              {own && <span> · {message.seq <= readSeq ? labels.seen : labels.sent}</span>}
            </small>
          </article>
        )
      })}
      {pending && !messages.some(message => message.client_id === pending.id) && (
        <article className="icue-live__message icue-live__message--own icue-live__message--pending">
          <span className="icue-live__sender">{labels.you}</span><p>{pending.content}</p>
        </article>
      )}
    </div>
  )
}
