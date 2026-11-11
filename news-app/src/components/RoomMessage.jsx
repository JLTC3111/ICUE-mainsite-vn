import { useEffect, useRef, useState } from 'react'
import { Download, FileImage, Film, X } from 'lucide-react'
import { normalizeRoomDocument, roomDocumentHasContent, ROOM_STICKERS } from '../lib/roomDocument'
import { downloadRoomFile, roomChatRpc } from '../lib/roomChat'
import RoomComposer from './RoomComposer'

const EDIT_WINDOW = 48 * 60 * 60 * 1000
const DELETE_WINDOW = 24 * 60 * 60 * 1000
const editDocument = message => {
  const blocks = message.document?.content || []
  const paragraphs = blocks.filter(block => block.type !== 'sticker')
  return {
    document: { type: 'doc', content: paragraphs.length ? paragraphs : [{ type: 'paragraph' }] },
    stickers: blocks.filter(block => block.type === 'sticker' && ROOM_STICKERS.includes(block.attrs?.name)).map(block => block.attrs.name),
    sticker: null,
    files: [],
    pending: null,
  }
}

export function RoomSticker({ name, label }) {
  return <svg className={`room-sticker room-sticker--${name}`} viewBox="0 0 80 80" width="64" height="64" role="img" aria-label={label}>
    {name === 'wave' ? <g className="room-sticker__motion" fill="none" stroke="#bf8541" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"><path fill="#f5ce86" d="m24 43-5-17q-1-5 3-6t6 4l5 15-2-23q0-6 4-6t5 6l2 22 3-23q1-5 5-4t4 6l-2 23 6-15q2-4 6-2t2 6l-9 24q-6 18-20 15-12-2-15-12l-9-11q-3-5 1-7t7 2l6 6" /><path d="m8 16-3-5m9 3-1-7m51 41 6 1m-8 7 6 3" /></g>
      : name === 'heart' ? <g className="room-sticker__motion"><path fill="#da6984" d="M40 65 15 42C-2 26 22 5 40 25 58 5 82 26 65 42Z"/><path d="M20 27q4-5 9-2" fill="none" stroke="#ffdbdf" strokeLinecap="round" strokeWidth="4"/><circle cx="66" cy="14" r="4" fill="#e7aa73"/></g>
        : <g className="room-sticker__motion"><path d="m16 65 10-35 23 23Z" fill="#e0ad62" stroke="#b38443" strokeWidth="2"/><path d="m26 35 18 19m-23-3 11 10" stroke="#edce94" strokeWidth="5"/><path d="m38 25 7-13m11 25 13-5M28 21l-3-8m34 6 5-7m-8 46 9 7" stroke="#68ac9c" strokeLinecap="round" strokeWidth="4"/><circle cx="52" cy="27" r="4" fill="#d77b91"/><circle cx="15" cy="25" r="3" fill="#7d97bf"/><circle cx="64" cy="49" r="3" fill="#7d97bf"/></g>}
  </svg>
}

export function RoomDocument({ document, labels }) {
  let safe
  try { safe = normalizeRoomDocument(document) } catch { return null }
  return safe.content.map((block, index) => block.type === 'sticker'
    ? <RoomSticker key={index} name={block.attrs.name} label={labels[block.attrs.name]} />
    : <p key={index}>{(block.content || []).map((child, i) => {
      let value = child.text
      for (const mark of child.marks || []) {
        if (mark.type === 'bold') value = <strong key="bold">{value}</strong>
        if (mark.type === 'italic') value = <em key="italic">{value}</em>
        if (mark.type === 'underline') value = <u key="underline">{value}</u>
        if (mark.type === 'strike') value = <s key="strike">{value}</s>
      }
      return <span key={i}>{value}</span>
    })}</p>)
}

export default function RoomMessage({ message, roomId, userId, locale, labels, archived = false, onUpdated }) {
  const [busy, setBusy] = useState(null), [error, setError] = useState(false), [editing, setEditing] = useState(false), [editDraft, setEditDraft] = useState(null), [confirm, setConfirm] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const controller = useRef(null), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort() } }, [])
  const own = message.user_id === userId
  const deleted = Boolean(message.deleted_at)
  const sentAt = new Date(message.created_at).getTime()
  const age = now - sentAt
  useEffect(() => {
    if (!own || deleted || archived || !Number.isFinite(sentAt)) return undefined
    const next = [sentAt + DELETE_WINDOW, sentAt + EDIT_WINDOW].find(limit => limit > Date.now())
    if (!next) return undefined
    const timer = setTimeout(() => setNow(Date.now()), Math.min(next - Date.now() + 50, 2 ** 31 - 1))
    return () => clearTimeout(timer)
  }, [own, deleted, archived, sentAt, now])
  const canEdit = own && !deleted && !archived && age < EDIT_WINDOW && roomDocumentHasContent(message.document)
  const canDelete = own && !deleted && !archived && age < DELETE_WINDOW
  async function download(file) {
    if (busy) return
    setBusy(file.id); setError(false)
    controller.current = new AbortController()
    try { await downloadRoomFile(roomId, file, { signal: controller.current.signal }) } catch { if (alive.current) setError(true) } finally { if (alive.current) setBusy(null) }
  }
  async function change(name, args) {
    if (busy) return
    setBusy(name); setError(false)
    try {
      const data = await roomChatRpc(name, { p_room_id: roomId, ...args })
      if (!data?.message) throw new Error('ROOM_RESPONSE')
      onUpdated?.(data.message)
      if (alive.current) { setEditing(false); setConfirm(null) }
    } catch (cause) {
      if (alive.current) setError(cause?.code === '22023' ? 'expired' : 'error')
    } finally { if (alive.current) setBusy(null) }
  }
  function saveEdit() {
    let document
    try {
      document = normalizeRoomDocument({ type: 'doc', content: [...(editDraft?.document?.content || []).filter(block => block.type !== 'sticker'), ...(editDraft?.stickers || []).map(name => ({ type: 'sticker', attrs: { name } }))] })
    } catch { setError('error'); return }
    if (!roomDocumentHasContent(document)) return
    void change('edit', { p_message_id: message.id, p_document: document })
  }
  return <article className={`room-message${own ? ' room-message--self' : ''}`}>
    <header><strong>{message.display_name}</strong><time dateTime={message.created_at}>{new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(message.created_at))}</time>{message.edited_at && !deleted && <span className="room-message__edited">{labels.edited}</span>}</header>
    {editing ? <RoomComposer roomId={roomId} draft={editDraft} onDraft={setEditDraft} onSend={saveEdit} sending={busy === 'edit'} labels={labels} editing onCancel={() => { setEditing(false); setError(false) }} /> : <div className="room-message__body">{deleted ? <p className="room-message__notice">{labels.deleted}</p> : <RoomDocument document={message.document} labels={labels} />}</div>}
    {!editing && message.files?.length > 0 && <div className="room-message__files">{message.files.map(file => <div className="room-message__file" key={file.id}>{confirm === file.id ? <p className="room-message__confirm">{labels.confirmDeleteFile} <button type="button" onClick={() => change('delete_file', { p_file: file.id })} disabled={Boolean(busy)}>{labels.deleteFile}</button> <button type="button" onClick={() => setConfirm(null)} disabled={Boolean(busy)}>{labels.cancel}</button></p> : <><button className="room-message__download" type="button" onClick={() => download(file)} disabled={Boolean(busy)} aria-label={`${labels.download}: ${file.name}`}>
      {file.mime === 'video/mp4' ? <Film size={20} aria-hidden="true" /> : <FileImage size={20} aria-hidden="true" />}<span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><Download size={16} aria-hidden="true" />
    </button>{canDelete && <button className="room-message__file-delete" type="button" aria-label={`${labels.deleteFile}: ${file.name}`} disabled={Boolean(busy)} onClick={() => setConfirm(file.id)}><X size={14} aria-hidden="true" /></button>}</>}</div>)}</div>}
    {!editing && confirm === 'message' && <p className="room-message__confirm">{labels.confirmDelete} <button type="button" onClick={() => change('delete', { p_message_id: message.id })} disabled={Boolean(busy)}>{labels.deleteMessage}</button> <button type="button" onClick={() => setConfirm(null)} disabled={Boolean(busy)}>{labels.cancel}</button></p>}
    {!editing && confirm !== 'message' && (canEdit || canDelete) && <div className="room-message__actions">{canEdit && <button type="button" onClick={() => { setEditDraft(editDocument(message)); setEditing(true); setError(false) }} disabled={Boolean(busy)}>{labels.edit}</button>}{canDelete && <button type="button" onClick={() => setConfirm('message')} disabled={Boolean(busy)}>{labels.deleteMessage}</button>}</div>}
    {error && <p className="room-chat__error" role="alert">{labels[error] || labels.error} <button type="button" onClick={() => setError(false)}>{labels.close}</button></p>}
  </article>
}
