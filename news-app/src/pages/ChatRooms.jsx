import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Hash, LockKeyhole, MessageSquare, Plus, Settings2, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import LatticeLoader from '../../../shared/ui/LatticeLoader.jsx'
import RoomMessage from '../components/RoomMessage'
import RoomComposer from '../components/RoomComposer'
import { roomChatCopy } from '../lib/roomChatCopy'
import { recordRoomNetwork, roomChatRpc } from '../lib/roomChat'
import { applyRoomSnapshot, EMPTY_ROOM_DOCUMENT, mergeRoomMessages, normalizeRoomDocument, roomDocumentHasContent } from '../lib/roomDocument'
import './ChatRooms.css'

const newDraft = () => ({ document: EMPTY_ROOM_DOCUMENT, sticker: null, files: [], pending: null })
const emptyThread = () => ({ messages: [], has_more: false })

function CustomerSelector({ labels, selected, onSelect, excluded = [] }) {
  const [search, setSearch] = useState(''), [state, setState] = useState({ customers: [], loading: true, error: false }), [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setState(previous => ({ ...previous, loading: true }))
      void roomChatRpc('customers', { p_search: search }, { signal: controller.signal }).then(data => {
        if (!controller.signal.aborted) setState({ customers: data.customers || [], loading: false, error: false })
      }).catch(() => { if (!controller.signal.aborted) setState({ customers: [], loading: false, error: true }) })
    }, search ? 250 : 0)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [search, revision])
  return <fieldset className="room-manager__customers"><legend>{labels.customers}</legend><input type="search" value={search} onChange={event => setSearch(event.target.value)} maxLength={120} placeholder={labels.search} aria-label={labels.search} />
    {state.loading && <LatticeLoader label={labels.loading} compact />}
    {state.error && <p role="alert">{labels.error} <button type="button" onClick={() => setRevision(value => value + 1)}>{labels.retry}</button></p>}
    <div className="room-manager__customer-list">{state.customers.filter(customer => !excluded.includes(customer.id)).map(customer => <label key={customer.id}><input type="checkbox" checked={selected.includes(customer.id)} onChange={event => onSelect(event.target.checked ? [...selected, customer.id] : selected.filter(id => id !== customer.id))} /><span><strong>{customer.display_name}</strong><small>{customer.email}</small></span></label>)}</div>
    <small>{selected.length} / 30</small>
  </fieldset>
}

function CreateRoom({ labels, onClose, onCreated }) {
  const [name, setName] = useState(''), [customers, setCustomers] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const alive = useRef(true), busyRef = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function create(event) {
    event.preventDefault()
    if (busyRef.current || !name.trim() || !customers.length || customers.length > 30) return
    busyRef.current = true; setBusy(true); setError('')
    try {
      const result = await roomChatRpc('create', { p_name: name.trim(), p_customer_ids: customers })
      if (alive.current) onCreated(result.room || result)
    } catch { if (alive.current) setError(labels.error) }
    finally { busyRef.current = false; if (alive.current) setBusy(false) }
  }
  return <section className="room-manager" aria-label={labels.newRoom}><header><h2>{labels.newRoom}</h2><button type="button" onClick={onClose} aria-label={labels.close} disabled={busy}><X size={18} aria-hidden="true" /></button></header><p>{labels.customerHint}</p>
    <form onSubmit={create}><label>{labels.roomName}<input autoFocus required value={name} maxLength={80} onChange={event => setName(event.target.value)} /></label><CustomerSelector labels={labels} selected={customers} onSelect={setCustomers} />
      {error && <p className="room-chat__error" role="alert">{error}</p>}
      <button type="submit" className="room-chat__primary" disabled={busy || !name.trim() || !customers.length || customers.length > 30}>{busy ? labels.loading : labels.create}</button>
    </form>
  </section>
}

function NetworkActivity({ roomId, labels, locale }) {
  const [state, setState] = useState({ events: [], loading: true, error: false }), [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void roomChatRpc('network_events', { p_room_id: roomId }, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ events: data.events || [], loading: false, error: false })
    }).catch(() => { if (!controller.signal.aborted) setState({ events: [], loading: false, error: true }) })
    return () => controller.abort()
  }, [roomId, revision])
  const status = value => ['yes', 'true', 'detected'].includes(String(value)) ? labels.detected : ['no', 'false', 'not_detected'].includes(String(value)) ? labels.notDetected : labels.unknown
  return <section className="room-network"><h3>{labels.network}</h3><p>{labels.networkHint}</p>
    {state.loading && <LatticeLoader label={labels.loading} compact />}
    {state.error && <p role="alert">{labels.error} <button type="button" onClick={() => setRevision(value => value + 1)}>{labels.retry}</button></p>}
    {!state.loading && !state.error && !state.events.length && <p>{labels.networkEmpty}</p>}
    <div className="room-network__events">{state.events.map(event => <article key={event.id}><strong>{event.display_name}</strong><code>{event.ip}</code><small>{new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.created_at))}</small><span>{labels.vpn}: {status(event.vpn_status)} · {labels.proxy}: {status(event.proxy_status)} · {labels.firewall}: {labels.unknown}</span><small>{event.provider} · {event.source}</small></article>)}</div>
  </section>
}

function ManageRoom({ room, userId, labels, locale, onClose, onChanged }) {
  const [participants, setParticipants] = useState(null), [selected, setSelected] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState(false), [revision, setRevision] = useState(0), [network, setNetwork] = useState(false)
  const alive = useRef(true), busyRef = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    const controller = new AbortController()
    void roomChatRpc('participants', { p_room_id: room.id }, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) { setParticipants(data.participants || []); setError(false) } }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [room.id, revision])
  async function change(name, args) {
    if (busyRef.current) return false
    busyRef.current = true; setBusy(true); setError(false)
    try {
      const result = await roomChatRpc(name, { p_room_id: room.id, ...args })
      if (!alive.current) return false
      if (result.participants) setParticipants(result.participants)
      onChanged()
      return true
    } catch { if (alive.current) setError(true); return false }
    finally { busyRef.current = false; if (alive.current) setBusy(false) }
  }
  async function addCustomers() {
    for (const id of selected) { if (!await change('members', { p_user_id: id, p_action: 'add' })) return }
    if (alive.current) setSelected([])
  }
  return <section className="room-manager" aria-label={labels.manage}><header><h2>{labels.manage}</h2><button type="button" onClick={onClose} aria-label={labels.close}><X size={18} aria-hidden="true" /></button></header><p>{room.name}</p>
    {error && <p className="room-chat__error" role="alert">{labels.error} <button type="button" onClick={() => setRevision(value => value + 1)}>{labels.retry}</button></p>}
    {!participants && !error && <LatticeLoader label={labels.loading} compact />}
    {room.kind === 'customers' && <><h3>{labels.participants}</h3><p>{labels.removeHint}</p><ul className="room-manager__participants">{participants?.map(person => <li key={person.id}><span>{person.display_name}{person.id === userId ? ` · ${labels.current}` : ''}<small>{person.role}</small></span>{person.id !== userId && <button type="button" disabled={busy} aria-label={`${labels.removeMember}: ${person.display_name}`} onClick={() => change('members', { p_user_id: person.id, p_action: 'remove' })}>{labels.remove}</button>}</li>)}</ul>
      {!room.archived && <><CustomerSelector labels={labels} selected={selected} onSelect={setSelected} excluded={(participants || []).map(person => person.id)} /><button className="room-chat__primary" type="button" disabled={busy || !selected.length || selected.length > 30} onClick={addCustomers}>{labels.add}</button></>}
      <button type="button" className="room-manager__archive" disabled={busy} onClick={() => { if (room.archived || window.confirm(labels.confirmArchive)) void change('archive', { p_archived: !room.archived }) }}>{room.archived ? labels.reopen : labels.archive}</button>
    </>}
    <button type="button" className="room-manager__network-toggle" aria-expanded={network} onClick={() => setNetwork(value => !value)}><ShieldCheck size={16} aria-hidden="true" />{labels.network}</button>{network && <NetworkActivity roomId={room.id} labels={labels} locale={locale} />}
  </section>
}

function RoomWorkspace({ userId, locale, labels }) {
  const [bootstrap, setBootstrap] = useState(null), [selectedId, setSelectedId] = useState(''), [threads, setThreads] = useState({}), [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true), [error, setError] = useState(false), [denied, setDenied] = useState(false), [revision, setRevision] = useState(0), [sending, setSending] = useState(null), [older, setOlder] = useState(false), [panel, setPanel] = useState(null)
  const alive = useRef(true), selectedRef = useRef(selectedId), draftsRef = useRef(drafts), sendingRef = useRef(false), lastNetwork = useRef(0), viewRef = useRef(null), sendController = useRef(null), scrollRestore = useRef(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false; sendController.current?.abort() } }, [])
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])
  const updateDraft = useCallback((id, next) => {
    if (!alive.current) return
    draftsRef.current = { ...draftsRef.current, [id]: next }
    setDrafts(draftsRef.current)
  }, [])
  const applyThread = useCallback((id, snapshot, earlier = false) => {
    if (!alive.current) return
    setThreads(previous => ({ ...previous, [id]: applyRoomSnapshot(previous[id] || emptyThread(), snapshot, earlier) }))
    const pending = draftsRef.current[id]?.pending
    if (pending && snapshot.messages.some(message => message.client_id === pending.id && message.user_id === userId)) updateDraft(id, newDraft())
  }, [updateDraft, userId])

  useEffect(() => {
    let timer, controller, disposed = false, cycle = 0
    const pause = () => { cycle++; clearTimeout(timer); controller?.abort() }
    const poll = async () => {
      pause()
      if (disposed || document.hidden) return
      const request = cycle
      controller = new AbortController()
      const currentController = controller
      try {
        const result = await roomChatRpc('bootstrap', {}, { signal: controller.signal })
        if (disposed || currentController.signal.aborted) return
        if (!Array.isArray(result?.rooms) || result.account?.id !== userId) throw new Error('ROOM_RESPONSE')
        setBootstrap(result); setDenied(false)
        const allowed = new Set(result.rooms.map(room => room.id))
        setThreads(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => allowed.has(id))))
        const nextDrafts = Object.fromEntries(Object.entries(draftsRef.current).filter(([id]) => allowed.has(id)))
        draftsRef.current = nextDrafts; setDrafts(nextDrafts)
        if (Date.now() - lastNetwork.current > 60_000) { lastNetwork.current = Date.now(); void recordRoomNetwork({ signal: currentController.signal }).catch(() => {}) }
        if (!allowed.has(selectedId)) setSelectedId(result.rooms[0]?.id || '')
        else if (selectedId) {
          const snapshot = await roomChatRpc('messages', { p_room_id: selectedId }, { signal: controller.signal })
          if (disposed || currentController.signal.aborted) return
          applyThread(selectedId, snapshot)
        }
        setError(false)
      } catch (cause) {
        if (!disposed && !currentController.signal.aborted) {
          if (cause?.code === '42501') { setBootstrap(null); setThreads({}); setDrafts({}); draftsRef.current = {}; setDenied(true); setPanel(null) }
          setError(true)
        }
      } finally {
        if (!disposed && request === cycle && !currentController.signal.aborted) { setLoading(false); timer = setTimeout(poll, 2500) }
      }
    }
    const resume = () => { if (document.hidden) pause(); else void poll() }
    void poll()
    document.addEventListener('visibilitychange', resume); window.addEventListener('online', resume); window.addEventListener('pageshow', resume)
    return () => { disposed = true; pause(); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume); window.removeEventListener('pageshow', resume) }
  }, [userId, selectedId, revision, applyThread])

  const room = bootstrap?.rooms.find(item => item.id === selectedId)
  const current = room ? threads[room.id] : null, draft = drafts[selectedId] || newDraft()
  const messageCount = current?.messages.length
  useEffect(() => {
    const view = viewRef.current
    const restore = scrollRestore.current
    scrollRestore.current = null
    if (view && restore?.id === selectedId) { view.scrollTop = restore.top + view.scrollHeight - restore.height; return }
    if (view && (view.scrollHeight - view.scrollTop - view.clientHeight < 220 || view.scrollTop === 0)) view.scrollTop = view.scrollHeight
  }, [selectedId, messageCount])

  async function send() {
    const id = selectedRef.current, saved = draftsRef.current[id] || newDraft()
    if (!id || !room || room.archived || sendingRef.current) return
    let document
    try { document = normalizeRoomDocument({ ...saved.document, content: [...saved.document.content, ...(saved.sticker ? [{ type: 'sticker', attrs: { name: saved.sticker } }] : [])] }) }
    catch { setError(true); return }
    if (!saved.pending && !roomDocumentHasContent(document) && !saved.files?.length) return
    const pending = saved.pending || { id: crypto.randomUUID(), document, files: (saved.files || []).map(file => file.id) }
    updateDraft(id, { ...saved, pending }); sendingRef.current = true; setSending(id)
    const controller = new AbortController(); sendController.current = controller
    try {
      const data = await roomChatRpc('send', { p_room_id: id, p_client_id: pending.id, p_document: pending.document, p_files: pending.files }, { signal: controller.signal })
      if (!alive.current || controller.signal.aborted) return
      if (!data?.message || data.message.client_id !== pending.id || data.message.user_id !== userId) throw new Error('ROOM_RESPONSE')
      updateDraft(id, newDraft())
      setThreads(previous => ({ ...previous, [id]: { ...(previous[id] || emptyThread()), messages: mergeRoomMessages(previous[id]?.messages || [], [data.message]) } }))
      setError(false); setRevision(value => value + 1)
    } catch (cause) {
      if (alive.current && !controller.signal.aborted) {
        if (cause?.code === '42501') { setThreads(previous => ({ ...previous, [id]: emptyThread() })); updateDraft(id, newDraft()); setRevision(value => value + 1) }
        setError(true)
      }
    } finally { sendingRef.current = false; if (alive.current) setSending(null) }
  }
  async function loadEarlier() {
    if (!current || older) return
    const id = selectedId; setOlder(true)
    try {
      const data = await roomChatRpc('messages', { p_room_id: id, p_before: current.messages[0]?.id })
      if (alive.current) {
        const view = viewRef.current
        if (selectedRef.current === id && view) scrollRestore.current = { id, top: view.scrollTop, height: view.scrollHeight }
        applyThread(id, data, true)
      }
    }
    catch { if (alive.current) setError(true) }
    finally { if (alive.current) setOlder(false) }
  }
  const canManageRoom = bootstrap?.can_manage && (room?.kind === 'members' || Boolean(room))
  return <>
    {loading && !bootstrap && <div className="room-chat__notice"><LatticeLoader label={labels.checking} /></div>}
    {error && <div className="room-chat__error" role="alert">{denied ? labels.denied : labels.error} <button type="button" onClick={() => setRevision(value => value + 1)}>{labels.retry}</button></div>}
    {bootstrap && <div className={`room-chat__workspace${panel ? ' room-chat__workspace--panel' : ''}`}>
      <aside className="room-chat__sidebar"><div className="room-chat__sidebar-heading"><h2>{labels.rooms}</h2>{bootstrap.can_manage && <button type="button" aria-label={labels.newRoom} title={labels.newRoom} onClick={() => setPanel(panel === 'create' ? null : 'create')}><Plus size={18} aria-hidden="true" /></button>}</div>
        <nav aria-label={labels.rooms}>{bootstrap.rooms.map(item => <button type="button" key={item.id} aria-pressed={item.id === selectedId} onClick={() => { setSelectedId(item.id); setPanel(null) }}>{item.kind === 'members' ? <Hash size={18} aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}<span><strong>{item.kind === 'members' ? labels.members : item.name}</strong><small>{item.archived ? labels.archived : item.kind === 'members' ? 'ICUE' : labels.private}</small></span></button>)}</nav>
        {!bootstrap.rooms.length && <p>{labels.noRooms}</p>}
        <div className="room-chat__identity"><span>{bootstrap.account.display_name}</span><small>{bootstrap.account.role}</small></div>
      </aside>
      {room ? <section className="room-chat__thread" aria-label={room.name}><header className="room-chat__thread-heading"><div>{room.kind === 'members' ? <Hash size={22} aria-hidden="true" /> : <LockKeyhole size={20} aria-hidden="true" />}<span><h2>{room.kind === 'members' ? labels.members : room.name}</h2><small>{room.archived ? labels.archived : room.kind === 'members' ? labels.title : labels.customerHint}</small></span></div>{canManageRoom && <button type="button" aria-label={labels.manage} title={labels.manage} onClick={() => setPanel(panel === 'manage' ? null : 'manage')}><Settings2 size={19} aria-hidden="true" /></button>}</header>
        <div ref={viewRef} className="room-chat__messages" role="log" aria-label={labels.editor} aria-live="polite" aria-relevant="additions text">
          {current?.has_more && <button className="room-chat__earlier" type="button" disabled={older} onClick={loadEarlier}>{older ? labels.loading : labels.earlier}</button>}
          {!current ? <div className="room-chat__notice"><LatticeLoader label={labels.loading} compact /></div> : !current.messages.length ? <p className="room-chat__empty"><MessageSquare size={28} aria-hidden="true" />{labels.empty}</p> : current.messages.map(message => <RoomMessage key={message.id} roomId={room.id} userId={userId} message={message} labels={labels} locale={locale} />)}
        </div>
        {current && <RoomComposer key={room.id} roomId={room.id} draft={draft} onDraft={next => updateDraft(room.id, next)} onSend={send} sending={Boolean(sending)} labels={labels} archived={room.archived} />}
      </section> : <div className="room-chat__empty"><MessageSquare size={32} aria-hidden="true" /><p>{bootstrap.rooms.length ? labels.choose : labels.noRooms}</p></div>}
      {panel === 'create' && bootstrap.can_manage && <CreateRoom labels={labels} onClose={() => setPanel(null)} onCreated={created => { if (created.id) setSelectedId(created.id); setPanel(null); setRevision(value => value + 1) }} />}
      {panel === 'manage' && canManageRoom && <ManageRoom key={room.id} room={room} userId={userId} labels={labels} locale={locale} onClose={() => setPanel(null)} onChanged={() => setRevision(value => value + 1)} />}
    </div>}
  </>
}

export default function ChatRooms() {
  const { user, loading } = useAuth(), { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage || i18n.language || 'vi', labels = roomChatCopy(locale)
  useDocumentTitle(labels.title)
  return <main className="room-chat" lang={locale}><div className="room-chat__shell"><header className="room-chat__header"><a className="room-chat__brand" href={`/?lang=${locale}`}><img src="/logoIcons/ICUE_Radial_Parcel_Dark_A_Transparent.svg" alt="" width="30" height="30" />ICUE</a><nav><Link to={`/portal?lang=${locale}`}>{labels.account}</Link><a href={`/?lang=${locale}`}><ArrowLeft size={15} aria-hidden="true" />{labels.back}</a><LanguageSwitcher /></nav></header>
    <div className="room-chat__title"><span><ShieldCheck size={18} aria-hidden="true" />ICUE</span><h1>{labels.title}</h1><p>{labels.intro}</p></div>
    {loading ? <div className="room-chat__notice"><LatticeLoader label={labels.checking} /></div> : !user ? <section className="room-chat__login"><LockKeyhole size={28} aria-hidden="true" /><h2>{labels.signIn}</h2><p>{labels.signInHint}</p><Link className="room-chat__primary" to={`/portal?next=chatrooms&lang=${locale}`}>{labels.signIn}</Link></section> : <RoomWorkspace key={user.id} userId={user.id} locale={locale} labels={labels} />}
    <p className="room-chat__privacy">{labels.privacy}</p>
  </div></main>
}
