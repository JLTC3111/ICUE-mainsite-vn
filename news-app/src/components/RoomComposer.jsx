import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { ALargeSmall, ArrowUp, Baseline, Eraser, IndentDecrease, IndentIncrease, List, ListOrdered, Maximize2, Minimize2, Paperclip, Redo2, Smile, Type, Undo2, X } from 'lucide-react'
import { RoomDocument, RoomSticker } from './RoomMessage'
import { EMPTY_ROOM_DOCUMENT, ROOM_FONT_SIZES, ROOM_LIST_DEPTH, ROOM_STICKERS, ROOM_TEXT_COLORS, normalizeRoomDocument, roomDocumentHasContent, roomDocumentText } from '../lib/roomDocument'
import { discardRoomFile, uploadRoomFile, validateRoomFile } from '../lib/roomChat'

const FORMATTING_KEY = 'icue.room.formatting'
const SIZES = [['small', ROOM_FONT_SIZES.small], ['normal', null], ['large', ROOM_FONT_SIZES.large], ['huge', ROOM_FONT_SIZES.huge]]
const isShortcut = event => (event.metaKey || event.ctrlKey) && event.shiftKey && event.key?.toLowerCase() === 'x'
const shortcutKey = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '') ? '⌘' : 'Ctrl'
const formattingPreference = () => {
  try { return typeof localStorage === 'undefined' || localStorage.getItem(FORMATTING_KEY) !== 'closed' } catch { return true }
}
const rememberFormatting = open => {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(FORMATTING_KEY, open ? 'open' : 'closed') } catch { /* Keep the choice for this visit when storage is blocked. */ }
}
const listDepth = editor => {
  const { $from } = editor.state.selection
  let depth = 0
  for (let level = $from.depth; level > 0; level--) if (['bulletList', 'orderedList'].includes($from.node(level).type.name)) depth++
  return depth
}

export default function RoomComposer({ roomId, draft, onDraft, onSend, sending, labels, archived, editing = false, onCancel }) {
  const [stickersOpen, setStickersOpen] = useState(false), [upload, setUpload] = useState(null), [error, setError] = useState('')
  const [formatting, setFormatting] = useState(formattingPreference), [expanded, setExpanded] = useState(false), [menu, setMenu] = useState(null)
  const fileInput = useRef(null), uploadController = useRef(null), alive = useRef(true), editorBox = useRef(null)
  const latest = useRef({ draft, onDraft, onSend, sending, archived, upload, editing })
  useEffect(() => { latest.current = { draft, onDraft, onSend, sending, archived, upload, editing } }, [draft, onDraft, onSend, sending, archived, upload, editing])
  useEffect(() => { alive.current = true; return () => { alive.current = false; uploadController.current?.abort() } }, [])
  useEffect(() => {
    if (!menu) return undefined
    const close = event => { if (!event.target?.closest?.('.room-composer__menu-anchor')) setMenu(null) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu])
  const pending = draft.pending
  const placeholder = labels.formatHint ? labels.formatHint.replace('{key}', shortcutKey()) : labels.editor
  const editor = useEditor({
    extensions: [StarterKit.configure({ blockquote: false, code: false, codeBlock: false, heading: false, horizontalRule: false, link: false, hardBreak: false }), TextStyle, Color, FontSize, Placeholder.configure({ placeholder })],
    content: draft.document || EMPTY_ROOM_DOCUMENT,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      const document = editor.getJSON()
      latest.current.onDraft({ ...latest.current.draft, document })
      try { normalizeRoomDocument(document); setError('') }
      catch (cause) { setError(cause?.message === 'ROOM_LENGTH' ? 'tooLong' : 'tooComplex') }
    },
    editorProps: {
      attributes: { class: 'room-composer__input', role: 'textbox', 'aria-multiline': 'true', 'aria-label': labels.editor },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Tab' && !event.shiftKey && editor && listDepth(editor) >= ROOM_LIST_DEPTH) { event.preventDefault(); return true }
        if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) return false
        if (event.shiftKey) { event.preventDefault(); return editor ? editor.commands.splitListItem('listItem') || editor.commands.splitBlock() : false }
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
  const locked = !editor || Boolean(pending || sending || archived)
  const run = command => { if (editor) command(editor.chain().focus()).run(); setMenu(null) }
  const toggleFormatting = () => setFormatting(value => { rememberFormatting(!value); return !value })
  const depth = editor ? listDepth(editor) : 0
  const style = editor?.getAttributes('textStyle') || {}
  const tool = (key, label, icon, { active, disabled, onClick, ...rest }) => <button key={key} type="button" aria-label={label} title={label} aria-pressed={active === undefined ? undefined : Boolean(active)} disabled={locked || disabled} onMouseDown={event => event.preventDefault()} onClick={onClick} {...rest}>{icon}</button>
  const marks = [['bold', <b key="b">B</b>], ['italic', <i key="i">I</i>], ['underline', <u key="u">U</u>], ['strike', <s key="s">S</s>]]
  return <form className={`room-composer${expanded ? ' room-composer--expanded' : ''}`} onSubmit={event => { event.preventDefault(); if (canSend) onSend() }}
    onKeyDown={event => { if (isShortcut(event)) { event.preventDefault(); toggleFormatting(); setMenu(null) } else if (event.key === 'Escape' && menu) { event.stopPropagation(); setMenu(null) } }}>
    {pending && <div className="room-composer__pending"><p role="status">{labels.failed}</p><RoomDocument document={pending.document} labels={labels} /></div>}
    {error && <p className="room-chat__error" role="alert">{labels[error]} <button type="button" onClick={() => setError('')}>{labels.close}</button></p>}
    <div className="room-composer__toolbar" role="toolbar" aria-label={labels.editor}>
      <button type="button" aria-label={labels.stickers} title={labels.stickers} aria-expanded={stickersOpen} disabled={Boolean(pending || sending || archived)} onClick={() => setStickersOpen(value => !value)}><Smile size={19} aria-hidden="true" /></button>
      {!editing && <button type="button" aria-label={labels.attach} title={labels.attach} disabled={Boolean(upload || pending || sending || archived || draft.files?.length >= 5)} onClick={() => fileInput.current?.click()}><Paperclip size={19} aria-hidden="true" /></button>}
      {!editing && <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,.mp4" multiple hidden onChange={chooseFiles} />}
      <button type="button" className="room-composer__format-toggle" aria-label={labels.formatting} title={`${labels.formatting} (${shortcutKey()} + Shift + X)`} aria-pressed={formatting} aria-controls={`room-format-${roomId}${editing ? '-edit' : ''}`} onClick={() => { toggleFormatting(); setMenu(null) }}><Type size={19} aria-hidden="true" /></button>
      <span />
    </div>
    {stickersOpen && <div className="room-composer__stickers" role="group" aria-label={labels.stickers}>{ROOM_STICKERS.map(name => <button type="button" key={name} onClick={() => { onDraft(editing ? { ...draft, stickers: [...(draft.stickers || []), name] } : { ...draft, sticker: name }); setStickersOpen(false) }} aria-label={labels[name]}><RoomSticker name={name} label={labels[name]} /></button>)}</div>}
    <div className="room-composer__editor" ref={editorBox}><EditorContent editor={editor} /></div>
    {formatting && <div className="room-composer__format" id={`room-format-${roomId}${editing ? '-edit' : ''}`} role="toolbar" aria-label={labels.formatting}>
      {marks.map(([mark, icon]) => tool(mark, labels[mark], icon, { active: editor?.isActive(mark), onClick: () => run(chain => chain.toggleMark(mark)) }))}
      <span className="room-composer__menu-anchor">
        {tool('size', labels.textSize, <ALargeSmall size={18} aria-hidden="true" />, { active: Boolean(style.fontSize), 'aria-haspopup': 'true', 'aria-expanded': menu === 'size', onClick: () => setMenu(value => value === 'size' ? null : 'size') })}
        {menu === 'size' && <div className="room-composer__menu" role="group" aria-label={labels.textSize}>{SIZES.map(([name, size]) => <button key={name} type="button" className={`room-composer__size room-composer__size--${name}`} aria-pressed={(style.fontSize || null) === size} onMouseDown={event => event.preventDefault()} onClick={() => run(chain => size ? chain.setFontSize(size) : chain.unsetFontSize())}>{labels[`size_${name}`]}</button>)}</div>}
      </span>
      <span className="room-composer__menu-anchor">
        {tool('color', labels.textColor, <Baseline size={18} aria-hidden="true" style={style.color ? { color: style.color } : undefined} />, { active: Boolean(style.color), 'aria-haspopup': 'true', 'aria-expanded': menu === 'color', onClick: () => setMenu(value => value === 'color' ? null : 'color') })}
        {menu === 'color' && <div className="room-composer__menu room-composer__menu--colors" role="group" aria-label={labels.textColor}>
          <button type="button" className="room-composer__swatch room-composer__swatch--default" aria-label={labels.colorDefault} title={labels.colorDefault} aria-pressed={!style.color} onMouseDown={event => event.preventDefault()} onClick={() => run(chain => chain.unsetColor())} />
          {Object.entries(ROOM_TEXT_COLORS).map(([name, color]) => <button key={name} type="button" className="room-composer__swatch" style={{ background: color }} aria-label={labels[`color_${name}`]} title={labels[`color_${name}`]} aria-pressed={style.color === color} onMouseDown={event => event.preventDefault()} onClick={() => run(chain => chain.setColor(color))} />)}
        </div>}
      </span>
      {tool('clear', labels.clearFormat, <Eraser size={18} aria-hidden="true" />, { onClick: () => run(chain => chain.unsetAllMarks().clearNodes()) })}
      <i className="room-composer__divider" aria-hidden="true" />
      {tool('bullet', labels.bulletList, <List size={18} aria-hidden="true" />, { active: editor?.isActive('bulletList'), onClick: () => run(chain => chain.toggleBulletList()) })}
      {tool('ordered', labels.orderedList, <ListOrdered size={18} aria-hidden="true" />, { active: editor?.isActive('orderedList'), onClick: () => run(chain => chain.toggleOrderedList()) })}
      {tool('indent', labels.indent, <IndentIncrease size={18} aria-hidden="true" />, { disabled: !editor || depth === 0 || depth >= ROOM_LIST_DEPTH || !editor.can().sinkListItem('listItem'), onClick: () => run(chain => chain.sinkListItem('listItem')) })}
      {tool('outdent', labels.outdent, <IndentDecrease size={18} aria-hidden="true" />, { disabled: !editor || depth === 0 || !editor.can().liftListItem('listItem'), onClick: () => run(chain => chain.liftListItem('listItem')) })}
      <i className="room-composer__divider" aria-hidden="true" />
      {tool('undo', labels.undo, <Undo2 size={18} aria-hidden="true" />, { disabled: !editor?.can().undo(), onClick: () => run(chain => chain.undo()) })}
      {tool('redo', labels.redo, <Redo2 size={18} aria-hidden="true" />, { disabled: !editor?.can().redo(), onClick: () => run(chain => chain.redo()) })}
      <span />
      <button type="button" aria-label={expanded ? labels.collapse : labels.expand} title={expanded ? labels.collapse : labels.expand} aria-pressed={expanded} onClick={() => { if (editorBox.current) editorBox.current.style.height = ''; setExpanded(value => !value) }}>{expanded ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}</button>
    </div>}
    {draft.sticker && !pending && !editing && <div className="room-composer__sticker"><RoomSticker name={draft.sticker} label={labels[draft.sticker]} /><button type="button" aria-label={labels.remove} disabled={Boolean(sending || archived)} onClick={() => onDraft({ ...draft, sticker: null })}><X size={16} aria-hidden="true" /></button></div>}
    {editing && draft.stickers?.map((name, index) => <div className="room-composer__sticker" key={`${name}-${index}`}><RoomSticker name={name} label={labels[name]} /><button type="button" aria-label={labels.remove} disabled={Boolean(sending)} onClick={() => onDraft({ ...draft, stickers: draft.stickers.filter((_, item) => item !== index) })}><X size={16} aria-hidden="true" /></button></div>)}
    {!editing && draft.files?.length > 0 && <div className="room-composer__files">{draft.files.map(file => <span key={file.id}><span>{file.name}</span><button type="button" disabled={Boolean(pending || sending || archived)} aria-label={`${labels.remove}: ${file.name}`} onClick={() => removeFile(file)}><X size={14} aria-hidden="true" /></button></span>)}</div>}
    {!editing && upload && <div className="room-composer__upload" role="status"><span>{labels.uploading}: {upload}</span><button type="button" onClick={() => uploadController.current?.abort()}>{labels.cancelUpload}</button></div>}
    <footer><small>{labels.keyboard}<span>{length}/4,000 {labels.count}</span></small>{editing && <button type="button" onClick={onCancel} disabled={Boolean(sending)}>{labels.cancel}</button>}<button className="room-chat__primary room-composer__send" type="submit" disabled={!canSend} aria-label={submitLabel}><ArrowUp size={20} aria-hidden="true" />{submitLabel}</button></footer>
    {!editing && <p className="room-composer__limits">{labels.files}</p>}
  </form>
}
