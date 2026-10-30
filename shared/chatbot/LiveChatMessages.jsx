import { useLayoutEffect, useRef, useState } from 'react'
import LatticeLoader from '../ui/LatticeLoader.jsx'

export default function LiveChatMessages({ messages, conversation, labels, locale, viewer = 'visitor', pending, active = true, onDownload, children }) {
  const logRef = useRef(null)
  const [downloading, setDownloading] = useState(null)
  const [downloadError, setDownloadError] = useState(false)
  const files = (attachments, pending = false) => Array.isArray(attachments) && attachments.filter(file => typeof file?.name === 'string').map(file => (
    <button key={file.id || file.client_id} type="button" className="icue-live__file" disabled={pending || !onDownload || Boolean(downloading)} aria-label={`${labels.download}: ${file.name}`} onClick={async () => {
      setDownloading(file.id); setDownloadError(false)
      try { await onDownload(file) } catch { setDownloadError(true) } finally { setDownloading(null) }
    }}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 15h8m-8 4h5" /></svg>
      <span><strong>{file.name}</strong><small>{Math.ceil(file.size / 1024)} KB · {downloading === file.id ? <LatticeLoader label={labels.downloading} compact inline showTimer={false} announce={false} /> : labels.download}</small></span>
    </button>
  ))
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
      {downloadError && <p className="icue-live__notice" role="alert">{labels.downloadFailed}</p>}
      {messages.map(message => {
        const own = message.sender === viewer
        const readSeq = viewer === 'visitor' ? conversation?.staff_read_seq : conversation?.visitor_read_seq
        const time = new Date(message.created_at)
        return (
          <article key={message.id} className={`icue-live__message${own ? ' icue-live__message--own' : ''}`}>
            <span className="icue-live__sender">{own ? labels.you : message.sender_name || (viewer === 'visitor' ? labels.title : labels.guest)}</span>
            {message.content && <p>{message.content}</p>}
            {files(message.attachments)}
            <small>
              {Number.isFinite(time.getTime()) && <time dateTime={message.created_at}>{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(time)}</time>}
              {own && <span> · {message.seq <= readSeq ? labels.seen : labels.sent}</span>}
            </small>
          </article>
        )
      })}
      {pending && !messages.some(message => message.client_id === pending.id) && (
        <article className="icue-live__message icue-live__message--own icue-live__message--pending">
          <span className="icue-live__sender">{labels.you}</span>{pending.content && <p>{pending.content}</p>}{files(pending.attachments, true)}
        </article>
      )}
    </div>
  )
}
