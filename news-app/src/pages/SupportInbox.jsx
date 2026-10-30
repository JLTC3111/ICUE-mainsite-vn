import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import RubberSegment from '../../../shared/ui/RubberSegment.jsx'
import LatticeLoader from '../../../shared/ui/LatticeLoader.jsx'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { supportChatRpc, readSupportDrafts, saveSupportDrafts, downloadSupportFile } from '../lib/supportChat'
import { liveChatCopy } from '../../../shared/chatbot/lib/liveChatCopy.js'
import { liveTimeLeft, mergeLiveMessages } from '../../../shared/chatbot/lib/liveChat.js'
import LiveChatMessages from '../../../shared/chatbot/LiveChatMessages.jsx'
import SupportChatAlertToggle from '../components/SupportChatAlertToggle'
import { isSupportConversationId } from '../lib/supportAlerts'
import '../../../shared/chatbot/LiveChat.css'
import './SupportInbox.css'

const clientPresenceKeys = { active: 'clientActive', away: 'clientAway', left: 'clientLeft', disconnected: 'clientDisconnected', unknown: 'clientUnknown' }
const clientState = (conversation, unavailable) => !unavailable && Object.hasOwn(clientPresenceKeys, conversation?.visitor_status) ? conversation.visitor_status : 'unknown'

function InboxWorkspace({ userId, locale, labels }) {
  const [search, setSearch] = useSearchParams()
  const filter = ['open', 'closed', 'all'].includes(search.get('status')) ? search.get('status') : 'open'
  const requestedPage = Number(search.get('page') || 0)
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 0 && requestedPage <= 2000 ? requestedPage : 0
  const selectedId = isSupportConversationId(search.get('conversation')) ? search.get('conversation') : null
  const updateView = values => setSearch(previous => {
    const next = new URLSearchParams(previous)
    for (const [key, value] of Object.entries(values)) next.set(key, String(value))
    return next
  })
  const [rows, setRows] = useState([])
  const [thread, setThread] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [wantOnline, setWantOnline] = useState(false)
  const [confirmedAt, setConfirmedAt] = useState(0)
  const [clock, setClock] = useState(0)
  const [presenceError, setPresenceError] = useState(false)
  const [drafts, setDrafts] = useState(() => readSupportDrafts(userId))
  const [sending, setSending] = useState(null)
  const [sendError, setSendError] = useState(null)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const selectedRef = useRef(selectedId)
  const sendingRef = useRef(false)
  const lastTyping = useRef(0)
  const alive = useRef(true)
  const draftsRef = useRef(drafts)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])

  const updateDraft = useCallback((id, value) => {
    const next = { ...draftsRef.current, [id]: value }
    if (!value.text && !value.pending) delete next[id]
    draftsRef.current = next
    saveSupportDrafts(userId, next)
    setDrafts(next)
  }, [userId])

  const applyThread = useCallback((data, { older = false } = {}) => {
    if (!data?.conversation?.id || !Array.isArray(data.messages)) throw new Error('Invalid support response')
    const id = data.conversation.id
    const draft = draftsRef.current[id]
    if (draft?.pending && data.messages.some(message => message.client_id === draft.pending.id)) updateDraft(id, { text: '' })
    if (selectedRef.current !== id) return
    setThread(previous => {
      const same = previous?.conversation.id === id
      const gap = same && !older && data.messages.length === 50 && !data.messages.some(message => previous.messages.some(old => old.id === message.id))
      return { ...data, checkedAt: Date.now(), messages: mergeLiveMessages(same && !gap ? previous.messages : [], data.messages),
        has_more: older || !same || gap ? data.has_more : previous.has_more }
    })
  }, [updateDraft])

  useEffect(() => {
    let timer, controller, disposed = false, cycle = 0
    const pause = () => { cycle++; clearTimeout(timer); controller?.abort() }
    const poll = async () => {
      pause()
      if (disposed || document.hidden) return
      const request = cycle
      const requestController = new AbortController()
      controller = requestController
      try {
        const data = await supportChatRpc('inbox', { p_status: filter, p_offset: page * 50 }, { signal: requestController.signal })
        if (disposed || requestController.signal.aborted) return
        if (!Array.isArray(data?.conversations)) throw new Error('Invalid inbox response')
        setRows(data.conversations)
        setClock(Date.now())
        if (selectedId) {
          const snapshot = await supportChatRpc('read', { p_conversation_id: selectedId, p_mark_read: true }, { signal: requestController.signal })
          if (disposed || requestController.signal.aborted) return
          applyThread(snapshot)
        }
        setError(false)
      } catch (error) { if (!disposed && !requestController.signal.aborted) { if (error?.code === '42501') { setThread(null); if (selectedId) updateDraft(selectedId, { text: '' }) } setError(true) } }
      finally {
        if (!disposed && request === cycle && !requestController.signal.aborted) {
          setLoading(false)
          if (!document.hidden) timer = setTimeout(poll, 2500)
        }
      }
    }
    const resume = () => { if (document.hidden) pause(); else void poll() }
    void poll()
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('online', resume)
    window.addEventListener('pageshow', resume)
    return () => {
      disposed = true
      pause()
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('online', resume)
      window.removeEventListener('pageshow', resume)
    }
  }, [filter, page, selectedId, revision, applyThread, updateDraft])

  // Availability is an explicit choice. Keep heartbeats when this inbox is in
  // a background window; an abandoned browser expires server-side in 45s.
  useEffect(() => {
    if (!wantOnline) return undefined
    let timer, disposed = false, busy = false
    const heartbeat = async () => {
      if (busy || disposed) return
      busy = true
      clearTimeout(timer)
      try {
        await supportChatRpc('presence', { p_available: true })
        if (!disposed) { setConfirmedAt(Date.now()); setPresenceError(false) }
      } catch { if (!disposed) { setConfirmedAt(0); setPresenceError(true) } }
      busy = false
      if (!disposed) timer = setTimeout(heartbeat, 15_000)
    }
    void heartbeat()
    window.addEventListener('online', heartbeat)
    return () => {
      disposed = true
      clearTimeout(timer)
      window.removeEventListener('online', heartbeat)
      void supportChatRpc('presence', { p_available: false }).catch(() => {})
    }
  }, [wantOnline])

  useEffect(() => () => {
    if (selectedId) void supportChatRpc('activity', { p_conversation_id: selectedId, p_typing: false }).catch(() => {})
  }, [selectedId])

  const current = thread?.conversation.id === selectedId ? thread : null
  const draft = drafts[selectedId] || { text: '' }
  const available = wantOnline && confirmedAt > 0 && confirmedAt > clock - 45_000
  const conversation = current?.conversation
  const visitorState = clientState(conversation, error)
  const typing = !error && !['away', 'left', 'disconnected'].includes(visitorState) && liveTimeLeft(current?.health, conversation?.visitor_typing_until, current?.checkedAt) > 0

  async function send(event) {
    event.preventDefault()
    const id = selectedId
    const saved = draftsRef.current[id]
    if (!id || !saved?.text.trim() || sendingRef.current) return
    sendingRef.current = true
    const pending = saved.pending || { id: crypto.randomUUID(), content: saved.text.trim() }
    updateDraft(id, { text: saved.text, pending })
    setSending(id)
    setSendError(null)
    try {
      const data = await supportChatRpc('send', { p_conversation_id: id, p_client_id: pending.id, p_message: pending.content })
      if (!alive.current) return
      updateDraft(id, { text: '' })
      applyThread(data)
      setRevision(value => value + 1)
    } catch { if (alive.current) setSendError(id) }
    finally { sendingRef.current = false; if (alive.current) setSending(null) }
  }
  async function changeStatus() {
    if (!conversation) return
    try {
      const data = await supportChatRpc('status', { p_conversation_id: selectedId, p_status: conversation.status === 'closed' ? 'active' : 'closed' })
      if (!alive.current) return
      applyThread(data)
      setRevision(value => value + 1)
    } catch { if (alive.current) setError(true) }
  }
  async function loadEarlier() {
    if (!current || loadingEarlier) return
    setLoadingEarlier(true)
    try {
      const data = await supportChatRpc('read', { p_conversation_id: selectedId, p_before: current.messages[0]?.seq, p_mark_read: false })
      if (alive.current) applyThread(data, { older: true })
    } catch { if (alive.current) setError(true) }
    finally { if (alive.current) setLoadingEarlier(false) }
  }

  return (
    <div className="support-inbox icue-container">
      <div className="support-inbox__heading"><div><h1>{labels.inbox}</h1><p>{labels.inboxIntro}</p></div>
        <div className="support-alerts__controls">
          <SupportChatAlertToggle />
          <RubberSegment role="group" aria-label={labels.presenceHint} size="sm" value={wantOnline ? 'online' : 'away'}
            items={[{ value: 'away', label: labels.goAway }, { value: 'online', label: labels.goOnline }]}
            onChange={value => { setWantOnline(value === 'online'); setConfirmedAt(0) }} />
        </div>
      </div>
      <div className="support-inbox__presence" role="status"><strong>{presenceError ? labels.reconnecting : available ? labels.available : wantOnline ? <LatticeLoader label={labels.connecting} compact inline showTimer={false} announce={false} /> : labels.unavailableStaff}</strong><span>{labels.presenceHint}</span></div>
      {error && <div className="support-inbox__error" role="alert">{labels.staffError} <button type="button" onClick={() => setRevision(value => value + 1)}>{labels.retry}</button></div>}
      <div className="support-inbox__workspace">
        <aside className="support-inbox__queue">
          <div className="icue-segment-scroll" style={{ padding: 10, margin: 0 }}>
            <RubberSegment role="group" aria-label={labels.inbox} value={filter} size="sm" style={{ width: '100%' }}
              items={['open', 'closed', 'all'].map(value => ({ value, label: value === 'closed' ? labels.resolved : labels[value] }))}
              onChange={value => updateView({ status: value, page: 0 })} />
          </div>
          <div className="support-inbox__rows">
            {loading && <p className="support-inbox__empty"><LatticeLoader label={labels.loading} compact /></p>}
            {!loading && !rows.length && <p className="support-inbox__empty">{labels.empty}</p>}
            {rows.slice(0, 50).map(row => <button key={row.id} type="button" className={`support-inbox__row${selectedId === row.id ? ' is-selected' : ''}`} aria-pressed={selectedId === row.id} onClick={() => updateView({ conversation: row.id })}>
              <span className="support-inbox__row-top"><span className="support-inbox__identity"><span className="support-inbox__client-dot" data-state={clientState(row, error)} role="img" aria-label={labels[clientPresenceKeys[clientState(row, error)]]} title={labels[clientPresenceKeys[clientState(row, error)]]} /><strong>{row.visitor_name || labels.guest}</strong></span>{row.unread > 0 && <span className="support-inbox__unread">{row.unread}</span>}</span>
              <span className="support-inbox__preview">{row.preview}</span>
              <span className="support-inbox__row-meta"><span>{row.status === 'closed' ? labels.resolved : row.status === 'waiting' ? labels.waitingLabel : labels.active}</span><span>{row.locale.toUpperCase()}</span></span>
            </button>)}
          </div>
          <div className="support-inbox__pagination"><button type="button" disabled={!page} onClick={() => updateView({ page: page - 1 })}>{labels.previous}</button><span>{page + 1}</span><button type="button" disabled={rows.length <= 50 || page >= 2000} onClick={() => updateView({ page: page + 1 })}>{labels.next}</button></div>
        </aside>
        {!selectedId ? <div className="support-inbox__selection"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H4l-2 2v-10a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" /><path d="M7 10h8m-8 4h5" /></svg><p>{labels.select}</p></div>
          : !current ? <div className="support-inbox__selection"><LatticeLoader label={labels.loading} /></div> : (
            <section className="support-inbox__thread icue-live" aria-label={labels.title}>
              <div className="support-inbox__thread-heading"><div><h2>{conversation.visitor_name || labels.guest}</h2><p>{conversation.visitor_email || conversation.page_path} · {conversation.locale.toUpperCase()}</p><div className="support-inbox__client-presence" data-state={visitorState} role="status"><span className="support-inbox__client-dot" data-state={visitorState} aria-hidden="true" />{labels[clientPresenceKeys[visitorState]]}</div></div><button type="button" onClick={changeStatus}>{conversation.status === 'closed' ? labels.reopen : labels.resolve}</button></div>
              {['away', 'left', 'disconnected'].includes(visitorState) && <p className="support-inbox__client-notice" role="status">{labels.clientReturnHint}</p>}
              <LiveChatMessages key={selectedId} messages={current.messages} conversation={conversation} labels={labels} locale={locale} viewer="staff" pending={draft.pending} onDownload={file => downloadSupportFile(file, selectedId)}>
                {current.has_more && <button type="button" className="icue-live__text-button" disabled={loadingEarlier} onClick={loadEarlier}>{loadingEarlier ? <LatticeLoader label={labels.loading} compact inline showTimer={false} announce={false} /> : labels.earlier}</button>}
              </LiveChatMessages>
              <div className="icue-live__typing" role="status">{typing ? labels.visitorTyping : ''}</div>
              <form className="icue-live__composer" onSubmit={send}>
                {(sendError === selectedId || (draft.pending && sending !== selectedId)) && <p className="icue-live__notice" role="alert">{labels.failed}</p>}
                <div className="icue-live__input-row"><textarea rows={3} maxLength={4000} value={draft.text} readOnly={Boolean(draft.pending)} aria-label={labels.reply} placeholder={labels.reply}
                  onChange={event => {
                    updateDraft(selectedId, { text: event.target.value })
                    if (!event.target.value || Date.now() - lastTyping.current > 3000) {
                      lastTyping.current = Date.now()
                      void supportChatRpc('activity', { p_conversation_id: selectedId, p_typing: Boolean(event.target.value.trim()) }).catch(() => {})
                    }
                  }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit() } }} />
                  <button type="submit" className="icue-live__send" disabled={Boolean(sending) || !draft.text.trim()} aria-label={sending === selectedId ? labels.sending : draft.pending ? labels.retry : labels.send}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 7-7 7 7M12 5v15" /></svg></button>
                </div>
              </form>
            </section>
          )}
      </div>
    </div>
  )
}

export default function SupportInbox() {
  const { isAdmin, user } = useAuth()
  const { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage || i18n.language || 'vi'
  const labels = liveChatCopy(locale)
  useDocumentTitle(labels.inbox)
  if (!isAdmin) return <p className="support-inbox icue-container">{labels.denied}</p>
  return <InboxWorkspace key={user.id} userId={user.id} locale={locale} labels={labels} />
}
