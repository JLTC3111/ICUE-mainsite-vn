import { useEffect, useRef, useSyncExternalStore } from 'react'
import { getLiveChatClient, liveTimeLeft } from './lib/liveChat.js'
import LiveChatMessages from './LiveChatMessages.jsx'
import PromptBar from './PromptBar.jsx'
import { connectAccount, customerPortalUrl } from '../customer-account/account.js'
import './LiveChat.css'

export default function LiveChatPanel({ active, locale, labels, contactUrl, id, labelledBy, client = getLiveChatClient() }) {
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot)
  const inputRef = useRef(null)

  useEffect(() => () => { void client.setPresence('left', { keepalive: true }) }, [client])
  useEffect(() => { if (active) void connectAccount().catch(() => {}) }, [active])

  useEffect(() => {
    if (!active) { void client.setPresence('away'); return undefined }
    let timer, controller, disposed = false, leaving = false, cycle = 0
    const pause = () => { cycle++; clearTimeout(timer); controller?.abort() }
    const poll = async () => {
      pause()
      if (disposed || document.hidden || leaving) return
      const request = cycle
      controller = new AbortController()
      void client.setPresence(navigator.onLine === false ? 'away' : 'active')
      await client.refresh({ signal: controller.signal })
      if (!disposed && request === cycle && !document.hidden) timer = setTimeout(poll, 2500)
    }
    const resume = () => {
      if (document.hidden) { pause(); if (!leaving) void client.setPresence('away', { keepalive: true }) }
      else {
        leaving = false
        void client.setPresence(navigator.onLine === false ? 'away' : 'active', { force: true })
        void poll()
      }
    }
    const leave = () => { leaving = true; pause(); void client.setPresence('left', { keepalive: true }) }
    const offline = () => { void client.setPresence('away', { keepalive: true }) }
    void poll()
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('online', resume)
    window.addEventListener('offline', offline)
    window.addEventListener('pageshow', resume)
    window.addEventListener('pagehide', leave)
    if (window.matchMedia('(pointer: fine)').matches && document.activeElement?.getAttribute('role') !== 'tab') {
      inputRef.current?.focus({ preventScroll: true })
    }
    return () => {
      disposed = true
      pause()
      client.typing(false)
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('online', resume)
      window.removeEventListener('offline', offline)
      window.removeEventListener('pageshow', resume)
      window.removeEventListener('pagehide', leave)
    }
  }, [active, client])

  const ready = state.status === 'ready'
  const online = ready && liveTimeLeft(state.health, state.health?.available_until, state.checkedAt) > 0
  const resolved = state.conversation?.status === 'closed'
  const attending = ready && !resolved && liveTimeLeft(state.health, state.conversation?.staff_attending_until, state.checkedAt) > 0
  const unavailable = state.status === 'unavailable'
  const missing = state.status === 'missing'
  const statusLabel = state.status === 'idle' ? labels.connecting
    : !ready && !unavailable && !missing ? labels.reconnecting
      : resolved ? labels.resolved : attending ? labels.attending : online ? labels.online : labels.away
  const typing = ready && liveTimeLeft(state.health, state.conversation?.staff_typing_until, state.checkedAt) > 0

  return (
    <section id={id} role="tabpanel" aria-labelledby={labelledBy} className="icue-live" hidden={!active}>
      <div className="icue-live__status" data-online={!resolved && (online || attending)} data-attending={attending}>
        <span className="icue-live__dot" aria-hidden="true" />
        <span role="status">{unavailable ? labels.unavailable : missing ? labels.missing : statusLabel}</span>
      </div>
      <LiveChatMessages messages={state.messages} conversation={state.conversation} labels={labels} locale={locale} pending={state.pending ? { ...state.pending, attachments: state.attachments } : null} active={active} onDownload={file => client.downloadFile(file)}>
        {state.hasMore && <button className="icue-live__text-button" type="button" disabled={state.loadingEarlier} onClick={() => client.loadEarlier()}>{state.loadingEarlier ? labels.loading : labels.earlier}</button>}
        {!state.conversation && !state.pending && (
          <div className="icue-live__welcome">
            <span className="icue-live__welcome-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 11.5a8 8 0 0 1-8 8H4l-2 2v-10a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" /><path d="M7 10h8m-8 4h5" /></svg>
            </span>
            <h3>{labels.intro}</h3><p>{labels.description}</p>
            {ready && !online && <p className="icue-live__away-hint">{labels.awayHint}</p>}
          </div>
        )}
      </LiveChatMessages>
      {state.conversation && <p className="icue-live__thread-status">{resolved ? labels.closed : attending ? '' : state.conversation.status === 'waiting' ? labels.waiting : !online ? labels.awayHint : ''}</p>}
      <div className="icue-live__typing" role="status">{typing ? labels.typing : ''}</div>
      <form className="icue-live__composer" onSubmit={event => {
        event.preventDefault()
        void client.send({ locale, path: window.location.pathname || '/' })
      }}>
        {!state.conversation && !state.pending && (
          <details className="icue-live__details">
            <summary>{labels.details}</summary>
            <label>{labels.name}<input autoComplete="name" maxLength={100} value={state.name} onChange={event => client.setDetails({ name: event.target.value })} /></label>
            <label>{labels.email}<input type="email" autoComplete="email" maxLength={254} value={state.email} onChange={event => client.setDetails({ email: event.target.value })} /></label>
          </details>
        )}
        {state.pending && !state.sending && <p className="icue-live__notice" role="alert">{labels.failed}</p>}
        {(unavailable || missing || (state.status === 'error' && !state.pending)) && (
          <div className="icue-live__notice" role="alert">
            <p>{missing ? labels.missing : unavailable ? labels.unavailable : labels.reconnecting}</p>
            <button type="button" className="icue-live__text-button" onClick={() => missing ? client.reset() : client.refresh()}>{missing ? labels.startNew : labels.retry}</button>
            <a href={contactUrl}>{labels.contact}</a>
          </div>
        )}
        {(state.accountError || state.fileError) && <p className="icue-live__notice" role="alert">{state.accountError ? labels.saveFailed : state.fileError === 'format' ? labels.invalidFile : state.fileError === 'limit' ? labels.fileLimit : state.fileError === 'download' ? labels.downloadFailed : state.fileError === 'expired' ? labels.fileExpired : state.fileError === 'quota' ? labels.uploadLimit : labels.uploadFailed}</p>}
        <PromptBar inputRef={inputRef} value={state.draft} placeholder={labels.placeholder} labels={labels}
          attachments={state.attachments || []} busy={state.sending || state.attachments?.some(file => file.status === 'uploading')} disabled={missing} readOnly={Boolean(state.pending)}
          onChange={value => { client.setDraft(value); client.typing(Boolean(value.trim())) }} onSend={() => client.send({ locale, path: window.location.pathname || '/' })} onStop={() => client.stop()}
          onAttach={files => client.attachFiles(files, { locale, path: window.location.pathname || '/' })} onRemove={file => client.removeAttachment(file)} onRetry={file => client.retryAttachment(file)} />
        <div className="icue-live__retention">
          {state.conversation?.account_saved ? <p>{labels.accountSaved}</p> : <><p>{labels.guestRetention}</p>{state.account ? <button type="button" onClick={() => client.syncAccount(state.account, { force: true })}>{labels.saveNow}</button> : <a href={customerPortalUrl(locale)} aria-disabled={state.attachments?.some(file => file.status === 'uploading') || undefined} onClick={event => { if (state.attachments?.some(file => file.status === 'uploading')) event.preventDefault(); else client.saveDraft() }}>{labels.keepChat}</a>}</>}
        </div>
        {state.sessionOnly && <p className="icue-live__privacy">{labels.sessionOnly}</p>}
      </form>
    </section>
  )
}
