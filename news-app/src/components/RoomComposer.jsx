import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { ArrowUp, Paperclip, X, Smile } from 'lucide-react'
import { RoomDocument, RoomSticker } from './RoomMessage'
import { EMPTY_ROOM_DOCUMENT, ROOM_STICKERS, normalizeRoomDocument, roomDocumentHasContent, roomDocumentText } from '../lib/roomDocument'
import { discardRoomFile, uploadRoomFile, validateRoomFile } from '../lib/roomChat'

export default function RoomComposer({ roomId, draft, onDraft, onSend, sending, labels, archived, editing = false, onCancel }) {
  const [stickersOpen, setStickersOpen] = useState(false), [upload, setUpload] = useState(null), [error, setError] = useState('')
  const fileInput = useRef(null), uploadController = useRef(null), alive = useRef(true)
  const latest = useRef({ draft, onDraft, onSend, sending, archived, upload, editing })
  useEffect(() => { latest.current = { draft, onDraft, onSend, sending, archived, upload, editing } }, [draft, onDraft, onSend, sending, archived, upload, editing])
  useEffect(() => { alive.current = true; return () => { alive.current = false; uploadController.current?.abort() } }, [])
  const pending = draft.pending
  const editor = useEditor({
    extensions: [StarterKit.configure({ blockquote: false, bulletList: false, code: false, codeBlock: false, heading: false, horizontalRule: false, listItem: false, listKeymap: false, orderedList: false, link: false, hardBreak: false }), Placeholder.configure({ placeholder: labels.editor })],
    content: draft.document || EMPTY_ROOM_DOCUMENT,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      const document = editor.getJSON()
      latest.current.onDraft({ ...latest.current.draft, document })
      try { normalizeRoomDocument(document); setError('') }
      catch { setError('tooLong') }
    },
    editorProps: {
      attributes: { class: 'room-composer__input', role: 'textbox', 'aria-multiline': 'true', 'aria-label': labels.editor },
      handleKeyDown: (_view, event) => {
        if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) return false
        if (event.shiftKey) { event.preventDefault(); return editor?.commands.splitBlock() ?? false }
        event.preventDefault()
        const current = latest.current
        const text = roomDocumentText(current.draft.document)
        const ready = !current.editing || roomDocumentHasContent(current.draft.document) || current.draft.stickers?.length
        if (!current.sending && !current.archived && !current.upload && text.length <= 4000 && ready) current.onSend()
        return true
      },
      handlePaste: (_view, event) => {
        // Keep pasted files in the explicit, verified upload flow.
        if (event.clipboardData?.files?.length) { event.preventDefault(); return true }
        return false
      },
    },
  })
  useEffect(() => { editor?.setEditable(!pending && !sending && !archived) }, [editor, pending, sending, archived])
  useEffect(() => {
    if (!editor) return
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(draft.document || EMPTY_ROOM_DOCUMENT)) editor.commands.setContent(draft.document || EMPTY_ROOM_DOCUMENT, { emitUpdate: false })
  }, [editor, draft.document])

  async function chooseFiles(event) {
    const files = [...event.target.files]
    event.target.value = ''
    if (editing || upload || pending || archived || files.length === 0) return
    if (files.length + (draft.files?.length || 0) > 5) { setError('maxFiles'); return }
    for (const file of files) { try { validateRoomFile(file) } catch { setError('badFile'); return } }
    setError('')
    const controller = new AbortController()
    uploadController.current = controller
    for (const file of files) {
      if (controller.signal.aborted) break
      setUpload(file.name)
      try {
        const ready = await uploadRoomFile(roomId, file, crypto.randomUUID(), { signal: controller.signal })
        if (!alive.current || controller.signal.aborted) { void discardRoomFile(roomId, ready.id).catch(() => {}); break }
        const current = latest.current
        current.onDraft({ ...current.draft, files: [...(current.draft.files || []), ready] })
      } catch { if (alive.current && !controller.signal.aborted) setError('badFile'); break }
    }
    if (alive.current) setUpload(null)
  }
  async function removeFile(file) {
    if (pending || sending) return
    try {
      await discardRoomFile(roomId, file.id)
      if (alive.current) onDraft({ ...latest.current.draft, files: latest.current.draft.files.filter(item => item.id !== file.id) })
    } catch { if (alive.current) setError('error') }
  }
  const length = roomDocumentText(draft.document).length
  const canSend = editing
    ? !sending && length <= 4000 && (roomDocumentHasContent(draft.document) || draft.stickers?.length)
    : !archived && !upload && !sending && length <= 4000 && (pending || roomDocumentHasContent(draft.document) || draft.sticker || draft.files?.length)
  const submitLabel = editing ? (sending ? labels.sending : labels.saveEdit) : sending ? labels.sending : pending ? labels.retry : labels.send
  return <form className="room-composer" onSubmit={event => { event.preventDefault(); if (canSend) onSend() }}>
    {pending && <div className="room-composer__pending"><p role="status">{labels.failed}</p><RoomDocument document={pending.document} labels={labels} /></div>}
    {error && <p className="room-chat__error" role="alert">{labels[error]} <button type="button" onClick={() => setError('')}>{labels.close}</button></p>}
    <div className="room-composer__toolbar" role="toolbar" aria-label={labels.editor}>
      {['bold', 'italic', 'underline', 'strike'].map(mark => <button key={mark} type="button" aria-label={labels[mark]} title={labels[mark]} aria-pressed={editor?.isActive(mark) || false} disabled={!editor || Boolean(pending || sending || archived)} onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().toggleMark(mark).run()}>{mark === 'bold' ? <b>B</b> : mark === 'italic' ? <i>I</i> : mark === 'underline' ? <u>U</u> : <s>S</s>}</button>)}
      <span />
      <button type="button" aria-label={labels.stickers} title={labels.stickers} aria-expanded={stickersOpen} disabled={Boolean(pending || sending || archived)} onClick={() => setStickersOpen(value => !value)}><Smile size={19} aria-hidden="true" /></button>
      {!editing && <button type="button" aria-label={labels.attach} title={labels.attach} disabled={Boolean(upload || pending || sending || archived || draft.files?.length >= 5)} onClick={() => fileInput.current?.click()}><Paperclip size={19} aria-hidden="true" /></button>}
      {!editing && <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,.mp4" multiple hidden onChange={chooseFiles} />}
    </div>
    {stickersOpen && <div className="room-composer__stickers" role="group" aria-label={labels.stickers}>{ROOM_STICKERS.map(name => <button type="button" key={name} onClick={() => { onDraft(editing ? { ...draft, stickers: [...(draft.stickers || []), name] } : { ...draft, sticker: name }); setStickersOpen(false) }} aria-label={labels[name]}><RoomSticker name={name} label={labels[name]} /></button>)}</div>}
    <EditorContent editor={editor} />
    {draft.sticker && !pending && !editing && <div className="room-composer__sticker"><RoomSticker name={draft.sticker} label={labels[draft.sticker]} /><button type="button" aria-label={labels.remove} disabled={Boolean(sending || archived)} onClick={() => onDraft({ ...draft, sticker: null })}><X size={16} aria-hidden="true" /></button></div>}
    {editing && draft.stickers?.map((name, index) => <div className="room-composer__sticker" key={`${name}-${index}`}><RoomSticker name={name} label={labels[name]} /><button type="button" aria-label={labels.remove} disabled={Boolean(sending)} onClick={() => onDraft({ ...draft, stickers: draft.stickers.filter((_, item) => item !== index) })}><X size={16} aria-hidden="true" /></button></div>)}
    {!editing && draft.files?.length > 0 && <div className="room-composer__files">{draft.files.map(file => <span key={file.id}><span>{file.name}</span><button type="button" disabled={Boolean(pending || sending || archived)} aria-label={`${labels.remove}: ${file.name}`} onClick={() => removeFile(file)}><X size={14} aria-hidden="true" /></button></span>)}</div>}
    {!editing && upload && <div className="room-composer__upload" role="status"><span>{labels.uploading}: {upload}</span><button type="button" onClick={() => uploadController.current?.abort()}>{labels.cancelUpload}</button></div>}
    <footer><small>{labels.keyboard}<span>{length}/4,000 {labels.count}</span></small>{editing && <button type="button" onClick={onCancel} disabled={Boolean(sending)}>{labels.cancel}</button>}<button className="room-chat__primary room-composer__send" type="submit" disabled={!canSend} aria-label={submitLabel}><ArrowUp size={20} aria-hidden="true" />{submitLabel}</button></footer>
    {!editing && <p className="room-composer__limits">{labels.files}</p>}
  </form>
}
