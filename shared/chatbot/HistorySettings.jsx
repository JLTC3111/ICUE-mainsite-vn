import { useEffect, useId, useRef, useState } from 'react'
import './HistorySettings.css'

export default function HistorySettings({ sync, state, labels, onBack }) {
  const [input, setInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const [confirming, setConfirming] = useState(false)
  const backRef = useRef(null)
  const codeRef = useRef(null)
  const id = useId()
  useEffect(() => { backRef.current?.focus({ preventScroll: true }) }, [])
  const copy = async () => {
    try { await navigator.clipboard.writeText(state.code); setCopyStatus(labels.copied) }
    catch { setRevealed(true); setCopyStatus(labels.copyFailed); codeRef.current?.focus(); codeRef.current?.select() }
  }

  return (
    <section className="icue-chat-sync" aria-label={labels.title}>
      <button ref={backRef} type="button" className="icue-chat-sync__back" onClick={onBack}>← {labels.back}</button>
      <h2>{labels.title}</h2>
      <p>{labels.description}</p>
      <p className="icue-chat-sync__status" role="status">{labels.status[state.status]}</p>
      {!state.persistent && <p role="status">{labels.sessionOnly}</p>}
      {state.code ? (
        <>
          <label htmlFor={id}>{labels.code}</label>
          <input ref={codeRef} id={id} className="icue-chat-sync__code" value={state.code} type={revealed ? 'text' : 'password'} readOnly autoComplete="off" spellCheck="false" aria-describedby={`${id}-secret`} />
          <div className="icue-chat-sync__actions">
            <button type="button" onClick={() => setRevealed(value => !value)}>{revealed ? labels.hide : labels.show}</button>
            <button type="button" onClick={copy}>{labels.copy}</button>
          </div>
          {copyStatus && <p role="status">{copyStatus}</p>}
          <p id={`${id}-secret`}>{labels.secret}</p>
          <button type="button" disabled={state.busy} onClick={() => { void sync.sync() }}>{labels.retry}</button>
          <button type="button" onClick={() => { sync.disconnect(); setCopyStatus(''); setRevealed(false) }}>{labels.disconnect}</button>
          {confirming ? (
            <div className="icue-chat-sync__confirmation">
              <p>{labels.confirmRemove}</p>
              <button type="button" disabled={state.busy} onClick={async () => { if (await sync.remove()) setConfirming(false) }}>{labels.confirm}</button>
              <button type="button" onClick={() => setConfirming(false)}>{labels.cancel}</button>
            </div>
          ) : <button type="button" disabled={state.busy} onClick={() => setConfirming(true)}>{labels.remove}</button>}
        </>
      ) : (
        <>
          <button type="button" disabled={state.busy} onClick={() => { void sync.create() }}>{labels.start}</button>
          <form onSubmit={async event => { event.preventDefault(); if (await sync.join(input)) setInput('') }}>
            <label htmlFor={id}>{labels.code}</label>
            <input id={id} className="icue-chat-sync__code" type="password" value={input} onChange={event => setInput(event.target.value)} placeholder={labels.hint} autoComplete="off" autoCapitalize="none" spellCheck="false" maxLength={60} required />
            <span className="icue-chat-sync__join">
              <button type="submit" disabled={state.busy || !input.trim()}>{labels.join}</button>
            </span>
          </form>
        </>
      )}
      <p>{labels.scope}</p>
    </section>
  )
}
