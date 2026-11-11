import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronDown, Hash, LockKeyhole, MessageSquare, Plus, Settings2, ShieldCheck, Users, X } from 'lucide-react'
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
const chatMemberRoles = new Set(['member', 'author', 'manager', 'admin', 'owner'])
const roomLabel = (item, labels) => item.kind === 'members' ? labels.members : item.name
const roomDetail = (item, labels) => item.archived ? labels.archived : item.kind === 'members' ? 'ICUE' : item.kind === 'staff' ? labels.staffRoom : labels.private
const roomMark = (item, size) => item.kind === 'customers' ? <LockKeyhole size={size} aria-hidden="true" /> : <Hash size={size} aria-hidden="true" />
const sidebarLimits = { min: 200, max: 520, start: 260 }
const stored = (key, fallback) => {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const value = localStorage.getItem(key)
    return value == null ? fallback : value
  } catch { return fallback }
}
const remember = (key, value) => {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value) } catch { /* Keep the choice for this visit when storage is blocked. */ }
}
const clampSidebar = value => Math.round(Math.min(sidebarLimits.max, Math.max(sidebarLimits.min, value)))
const placeholderName = name => { const value = name?.trim().toLowerCase(); return !value || value === 'author' || value === 'customer' }
const personName = (...values) => values.map(value => value?.trim()).find(value => !placeholderName(value)) || ''
const directoryPerson = (person = {}, extras = {}) => {
  const email = (extras.email || person.email || '').trim()
  const name = personName(extras.fullName, person.full_name, person.display_name, email)
  return { id: person.id || extras.id, name, email: email && email.toLowerCase() !== name.toLowerCase() ? email : '', status: extras.status || person.status }
}

function SidebarResize({ width, onWidth, label }) {
  const origin = useRef(null)
  const move = event => { if (origin.current != null) onWidth(event.clientX - origin.current) }
  const stop = event => { origin.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId) }
  return <div className="room-chat__resize" role="separator" aria-orientation="vertical" aria-label={label} aria-valuemin={sidebarLimits.min} aria-valuemax={sidebarLimits.max} aria-valuenow={width} tabIndex={0}
    onPointerDown={event => {
      if (event.button !== 0) return
      const workspace = event.currentTarget.closest('.room-chat__workspace')
      if (!workspace) return
      origin.current = workspace.getBoundingClientRect().left
      event.currentTarget.setPointerCapture(event.pointerId)
      event.preventDefault()
    }}
    onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}
    onKeyDown={event => {
      const step = event.shiftKey ? 32 : 16
      if (event.key === 'ArrowRight') onWidth(width + step)
      else if (event.key === 'ArrowLeft') onWidth(width - step)
      else if (event.key === 'Home') onWidth(sidebarLimits.min)
      else if (event.key === 'End') onWidth(sidebarLimits.max)
      else return
      event.preventDefault()
    }} />
}

function CreateStaffRoom({ labels, onClose, onCreated }) {
  const [name, setName] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const alive = useRef(true), busyRef = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function create(event) {
    event.preventDefault()
    if (busyRef.current || !name.trim()) return
    busyRef.current = true; setBusy(true); setError('')
    try {
      const result = await roomChatRpc('create_staff', { p_name: name.trim() })
      if (alive.current) onCreated(result.room || result)
    } catch { if (alive.current) setError(labels.error) }
    finally { busyRef.current = false; if (alive.current) setBusy(false) }
  }
  return <section className="room-manager" aria-label={labels.newStaffRoom}><header><h2>{labels.newStaffRoom}</h2><button type="button" onClick={onClose} aria-label={labels.close} disabled={busy}><X size={18} aria-hidden="true" /></button></header><p>{labels.staffHint}</p>
    <form onSubmit={create}><label>{labels.roomName}<input autoFocus required value={name} maxLength={100} onChange={event => setName(event.target.value)} /></label>
      {error && <p className="room-chat__error" role="alert">{error}</p>}
      <button type="submit" className="room-chat__primary" disabled={busy || !name.trim()}>{busy ? labels.loading : labels.newStaffRoom}</button>
    </form>
  </section>
}

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

function AccountSummary({ account, user, profile, locale, labels }) {
  const [open, setOpen] = useState(() => stored('icue.room.account', 'open') !== 'closed')
  const fullName = profile?.full_name?.trim()
  const email = user?.email?.trim()
  const signedIn = user?.last_sign_in_at ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(user.last_sign_in_at)) : ''
  const rows = [[labels.fullName, fullName], [labels.email, email], [labels.role, account?.role], [labels.signedIn, signedIn]].filter(([, value]) => value)
  return <section className={`room-chat__identity${open ? ' room-chat__identity--open' : ''}`}>
    <button type="button" aria-expanded={open} aria-controls="room-account-details" onClick={() => setOpen(value => { const next = !value; remember('icue.room.account', next ? 'open' : 'closed'); return next })}><strong>{labels.myAccount}</strong><ChevronDown size={16} aria-hidden="true" /></button>
    {open && rows.length > 0 && <dl id="room-account-details">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
  </section>
}

function RoomWorkspace({ userId, user, profile, locale, labels }) {
  const [bootstrap, setBootstrap] = useState(null), [selectedId, setSelectedId] = useState(''), [threads, setThreads] = useState({}), [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true), [error, setError] = useState(false), [denied, setDenied] = useState(false), [revision, setRevision] = useState(0), [sending, setSending] = useState(null), [older, setOlder] = useState(false), [panel, setPanel] = useState(null)
  const [directory, setDirectory] = useState([]), [availability, setAvailability] = useState('available'), [presenceTick, setPresenceTick] = useState(0)
  const [sidebarWidth, setSidebarWidth] = useState(() => { const saved = Number(stored('icue.room.sidebar', '')); return saved >= sidebarLimits.min && saved <= sidebarLimits.max ? saved : sidebarLimits.start })
  const resizeSidebar = next => { const width = clampSidebar(next); setSidebarWidth(width); remember('icue.room.sidebar', String(width)) }
  const alive = useRef(true), selectedRef = useRef(selectedId), draftsRef = useRef(drafts), sendingRef = useRef(false), lastNetwork = useRef(0), viewRef = useRef(null), sendController = useRef(null), scrollRestore = useRef(null), availabilityRef = useRef('available')
  useEffect(() => { alive.current = true; return () => { alive.current = false; sendController.current?.abort() } }, [])
  useEffect(() => {
    if (!chatMemberRoles.has(bootstrap?.account?.role)) return undefined
    let disposed = false, timer = 0, current
    const stop = () => { clearTimeout(timer); timer = 0 }
    const beat = () => {
      stop()
      if (disposed || document.hidden) return null
      const controller = new AbortController()
      void roomChatRpc('presence', { p_status: availabilityRef.current }, { signal: controller.signal }).then(data => {
        if (!disposed && !controller.signal.aborted && Array.isArray(data?.members)) setDirectory(data.members)
      }).catch(() => {}).finally(() => {
        if (!disposed && !controller.signal.aborted && !document.hidden) timer = setTimeout(beat, 20000)
      })
      return controller
    }
    const resume = () => { current?.abort(); current = beat() }
    resume()
    document.addEventListener('visibilitychange', resume)
    return () => { disposed = true; stop(); current?.abort(); document.removeEventListener('visibilitychange', resume) }
  }, [bootstrap?.account?.role, presenceTick])
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
  const showDirectory = chatMemberRoles.has(bootstrap?.account?.role)
  const chooseStatus = next => {
    if (next === availabilityRef.current) return
    availabilityRef.current = next
    setAvailability(next)
    setPresenceTick(value => value + 1)
  }
  const roomButtons = bootstrap?.rooms.map(item => <button type="button" key={item.id} aria-pressed={item.id === selectedId} onClick={() => { setSelectedId(item.id); setPanel(null) }}>{roomMark(item, item.kind === 'members' ? 18 : 16)}<span><strong>{roomLabel(item, labels)}</strong><small>{roomDetail(item, labels)}</small></span></button>)
  const self = directory.find(person => person.id === userId)
  const people = showDirectory ? [directoryPerson(self || { id: userId, display_name: bootstrap.account?.display_name }, { fullName: profile?.full_name, email: user?.email, status: availability }), ...directory.filter(person => person.id !== userId).map(person => directoryPerson(person))] : []
  const createRoom = bootstrap?.can_manage ? <button type="button" aria-label={labels.newRoom} title={labels.newRoom} onClick={() => setPanel(panel === 'create' ? null : 'create')}><Plus size={18} aria-hidden="true" /></button> : null
  const createStaff = bootstrap?.can_manage ? <button type="button" aria-label={labels.newStaffRoom} title={labels.newStaffRoom} onClick={() => setPanel(panel === 'staff' ? null : 'staff')}><Users size={18} aria-hidden="true" /></button> : null
  return <>
    {loading && !bootstrap && <div className="room-chat__notice"><LatticeLoader label={labels.checking} /></div>}
    {error && <div className="room-chat__error" role="alert">{denied ? labels.denied : labels.error} <button type="button" onClick={() => setRevision(value => value + 1)}>{labels.retry}</button></div>}
    {bootstrap && <div className={`room-chat__workspace${panel ? ' room-chat__workspace--panel' : ''}`} style={{ '--room-sidebar': `${sidebarWidth}px` }}>
      <aside className={`room-chat__sidebar${showDirectory ? ' room-chat__sidebar--directory' : ''}`}>
        {showDirectory ? <><div className="room-chat__sidebar-heading"><h2>{labels.directory}</h2></div><div className="room-chat__status" role="group" aria-label={labels.setStatus}><button type="button" aria-pressed={availability === 'available'} onClick={() => chooseStatus('available')}>{labels.available}</button><button type="button" aria-pressed={availability === 'busy'} onClick={() => chooseStatus('busy')}>{labels.busy}</button></div><ul className="room-chat__members" aria-label={labels.directory}>{people.map(person => <li key={person.id}><span className="room-chat__presence" data-status={person.status} aria-hidden="true" /><span><strong>{person.name}</strong>{person.email ? <small>{person.email}</small> : null}<small>{labels[person.status] || labels.offline}</small></span></li>)}</ul></> : <><div className="room-chat__sidebar-heading"><h2>{labels.rooms}</h2>{createRoom}</div><nav aria-label={labels.rooms}>{roomButtons}</nav>{!bootstrap.rooms.length && <p>{labels.noRooms}</p>}</>}
        <AccountSummary account={bootstrap.account} user={user} profile={profile} locale={locale} labels={labels} />
        <SidebarResize width={sidebarWidth} onWidth={resizeSidebar} label={labels.resize} />
      </aside>
      <div className="room-chat__main">
      {room ? <section className="room-chat__thread" aria-label={room.name}><header className="room-chat__thread-heading">{showDirectory && bootstrap.rooms.length > 1 ? <nav aria-label={labels.rooms}>{roomButtons}</nav> : <div>{roomMark(room, room.kind === 'customers' ? 20 : 22)}<span><h2>{roomLabel(room, labels)}</h2><small>{room.archived ? labels.archived : room.kind === 'members' ? labels.title : room.kind === 'staff' ? labels.staffHint : labels.customerHint}</small></span></div>}{(showDirectory && bootstrap.can_manage || canManageRoom) && <div className="room-chat__thread-actions">{showDirectory && createStaff}{showDirectory && createRoom}{canManageRoom && <button type="button" aria-label={labels.manage} title={labels.manage} onClick={() => setPanel(panel === 'manage' ? null : 'manage')}><Settings2 size={19} aria-hidden="true" /></button>}</div>}</header>
        <div ref={viewRef} className="room-chat__messages" role="log" aria-label={labels.editor} aria-live="polite" aria-relevant="additions text">
          {current?.has_more && <button className="room-chat__earlier" type="button" disabled={older} onClick={loadEarlier}>{older ? labels.loading : labels.earlier}</button>}
          {!current ? <div className="room-chat__notice"><LatticeLoader label={labels.loading} compact /></div> : !current.messages.length ? <p className="room-chat__empty"><MessageSquare size={28} aria-hidden="true" />{labels.empty}</p> : current.messages.map(message => <RoomMessage key={message.id} roomId={room.id} userId={userId} message={message} labels={labels} locale={locale} archived={room.archived} onUpdated={next => setThreads(previous => ({ ...previous, [room.id]: { ...(previous[room.id] || emptyThread()), messages: mergeRoomMessages(previous[room.id]?.messages || [], [next]) } }))} />)}
        </div>
        {current && <RoomComposer key={room.id} roomId={room.id} draft={draft} onDraft={next => updateDraft(room.id, next)} onSend={send} sending={Boolean(sending)} labels={labels} archived={room.archived} />}
      </section> : <div className="room-chat__empty"><MessageSquare size={32} aria-hidden="true" /><p>{bootstrap.rooms.length ? labels.choose : labels.noRooms}</p></div>}</div>
      {panel === 'create' && bootstrap.can_manage && <CreateRoom labels={labels} onClose={() => setPanel(null)} onCreated={created => { if (created.id) setSelectedId(created.id); setPanel(null); setRevision(value => value + 1) }} />}
      {panel === 'staff' && bootstrap.can_manage && <CreateStaffRoom labels={labels} onClose={() => setPanel(null)} onCreated={created => { if (created.id) setSelectedId(created.id); setPanel(null); setRevision(value => value + 1) }} />}
      {panel === 'manage' && canManageRoom && <ManageRoom key={room.id} room={room} userId={userId} labels={labels} locale={locale} onClose={() => setPanel(null)} onChanged={() => setRevision(value => value + 1)} />}
    </div>}
  </>
}

export default function ChatRooms() {
  const { user, profile, loading } = useAuth(), { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage || i18n.language || 'vi', labels = roomChatCopy(locale)
  useDocumentTitle(labels.title)
  return <main className="room-chat" lang={locale}><div className="room-chat__shell"><header className="room-chat__header"><a className="room-chat__brand" href={`/?lang=${locale}`}><img src="/logoIcons/ICUE_Radial_Parcel_Dark_A_Transparent.svg" alt="" width="30" height="30" />ICUE</a><nav><Link to={`/portal?lang=${locale}`}>{labels.account}</Link><a href={`/?lang=${locale}`}><ArrowLeft size={15} aria-hidden="true" />{labels.back}</a><LanguageSwitcher /></nav></header>
    <div className="room-chat__title"><span><ShieldCheck size={18} aria-hidden="true" />ICUE</span><h1>{labels.title}</h1><p>{labels.intro}</p></div>
    {loading ? <div className="room-chat__notice"><LatticeLoader label={labels.checking} /></div> : !user ? <section className="room-chat__login"><LockKeyhole size={28} aria-hidden="true" /><h2>{labels.signIn}</h2><p>{labels.signInHint}</p><Link className="room-chat__primary" to={`/portal?next=chatrooms&lang=${locale}`}>{labels.signIn}</Link></section> : <RoomWorkspace key={user.id} userId={user.id} user={user} profile={profile} locale={locale} labels={labels} />}
    <p className="room-chat__privacy">{labels.privacy}</p>
  </div></main>
}
