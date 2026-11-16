import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'
import { roomChatCopy } from '../../news-app/src/lib/roomChatCopy.js'

const newsRequire = createRequire(new URL('../../news-app/package.json', import.meta.url))
const { Editor } = newsRequire('@tiptap/core')
const { StarterKit } = newsRequire('@tiptap/starter-kit')
const { Placeholder } = newsRequire('@tiptap/extension-placeholder')
const textStyle = newsRequire('@tiptap/extension-text-style')
const icons = createRequire(import.meta.url)('lucide-react')
const Null = () => null

test('Shift+Enter inserts a real Tiptap paragraph, Enter sends, and IME confirmation does neither', async t => {
  silenceRenderer(t)
  let editor, options, sends = 0
  const drafts = []
  const { default: RoomComposer } = await sourceModule('news-app/src/components/RoomComposer.jsx', {
    imports: {
      '@tiptap/react': {
        useEditor(next) {
          options = next
          // Use the actual extension schema and commands without a DOM view.
          editor ||= new Editor({ ...next, content: JSON.parse(JSON.stringify(next.content)), element: null, injectCSS: false })
          editor.setOptions({ ...next })
          return editor
        },
        EditorContent: Null,
      },
      // TipTap's plain-object checks require the host realm's Object prototype.
      '@tiptap/starter-kit': { default: { configure: options => StarterKit.configure(JSON.parse(JSON.stringify(options))) } },
      '@tiptap/extension-placeholder': { default: { configure: options => Placeholder.configure(JSON.parse(JSON.stringify(options))) } },
      '@tiptap/extension-text-style': textStyle,
      'lucide-react': icons,
      './RoomMessage': { RoomDocument: Null, RoomSticker: Null },
      '../lib/roomChat': { discardRoomFile: async () => {}, uploadRoomFile: async () => {}, validateRoomFile() {} },
    },
  })
  const draft = { document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }] }, files: [], sticker: null, pending: null }
  let renderer
  await act(async () => { renderer = create(React.createElement(RoomComposer, { roomId: 'room-one', draft, onDraft: next => drafts.push(next), onSend: () => sends++, labels: {}, sending: false, archived: false })) })
  t.after(async () => { await unmount(renderer); editor.destroy() })
  assert.equal(editor.extensionManager.extensions.some(extension => extension.name === 'hardBreak'), false)
  editor.commands.setTextSelection(6)
  let prevented = 0
  await act(async () => {
    assert.equal(options.editorProps.handleKeyDown(editor.view, { key: 'Enter', shiftKey: true, preventDefault() { prevented++ } }), true)
  })
  assert.equal(prevented, 1)
  assert.equal(sends, 0)
  assert.deepEqual(editor.getJSON(), { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
    { type: 'paragraph', content: [{ type: 'text', text: ' world' }] },
  ] })
  assert.equal(drafts.at(-1).document.content.length, 2)
  assert.equal(options.editorProps.handleKeyDown(editor.view, { key: 'Enter', shiftKey: false, preventDefault() { prevented++ } }), true)
  assert.equal(sends, 1)
  for (const composing of [{ isComposing: true }, { keyCode: 229 }]) {
    assert.equal(options.editorProps.handleKeyDown(editor.view, { key: 'Enter', shiftKey: true, ...composing, preventDefault() { prevented++ } }), false)
  }
  assert.equal(sends, 1)
  assert.equal(prevented, 2)
  assert.equal(editor.getJSON().content.length, 2)
})

test('editing a sent message saves in place and does not offer another upload', async t => {
  silenceRenderer(t)
  const labels = roomChatCopy('en')
  let editor
  const { default: RoomComposer } = await sourceModule('news-app/src/components/RoomComposer.jsx', {
    imports: {
      '@tiptap/react': {
        useEditor(next) {
          editor ||= new Editor({ ...next, content: JSON.parse(JSON.stringify(next.content)), element: null, injectCSS: false })
          editor.setOptions({ ...next })
          return editor
        },
        EditorContent: Null,
      },
      '@tiptap/starter-kit': { default: { configure: options => StarterKit.configure(JSON.parse(JSON.stringify(options))) } },
      '@tiptap/extension-placeholder': { default: { configure: options => Placeholder.configure(JSON.parse(JSON.stringify(options))) } },
      '@tiptap/extension-text-style': textStyle,
      'lucide-react': icons,
      './RoomMessage': { RoomDocument: Null, RoomSticker: Null },
      '../lib/roomChat': { discardRoomFile: async () => {}, uploadRoomFile: async () => {}, validateRoomFile() {} },
    },
  })
  const draft = { document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello room' }] }] }, stickers: [], files: [], sticker: null, pending: null }
  let renderer
  await act(async () => { renderer = create(React.createElement(RoomComposer, { roomId: 'room-one', draft, onDraft() {}, onSend() {}, sending: false, labels, editing: true, onCancel() {} })) })
  t.after(async () => { await unmount(renderer); editor.destroy() })
  const buttons = renderer.root.findAllByType('button')
  assert.equal(buttons.some(node => node.props['aria-label'] === labels.attach), false)
  assert.ok(buttons.some(node => node.props['aria-label'] === labels.saveEdit))
  assert.ok(buttons.some(node => node.props.children === labels.cancel))
})

test('a .jpg is accepted when the browser labels it image/jpg', async () => {
  const { validateRoomFile } = await sourceModule('news-app/src/lib/roomChat.js', {
    imports: { './supabase': { supabase: {} } },
  })
  for (const type of ['image/jpeg', 'image/jpg', 'image/pjpeg', '']) validateRoomFile({ name: 'photo.jpg', size: 1200, type })
  assert.throws(() => validateRoomFile({ name: 'photo.jpg', size: 1200, type: 'image/png' }), /ROOM_FILE_TYPE_SIZE/)
  assert.throws(() => validateRoomFile({ name: 'photo.jpg', size: 0, type: 'image/jpeg' }), /ROOM_FILE_TYPE_SIZE/)
})

async function formattingComposer(t, { storage = new Map() } = {}) {
  silenceRenderer(t)
  const labels = roomChatCopy('en')
  let editor
  const localStorage = { getItem: key => storage.has(key) ? storage.get(key) : null, setItem: (key, value) => storage.set(key, String(value)) }
  const listeners = new Map()
  const document = { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) }
  const { default: RoomComposer } = await sourceModule('news-app/src/components/RoomComposer.jsx', {
    globals: { localStorage, document, navigator: { platform: 'MacIntel' } },
    imports: {
      '@tiptap/react': {
        useEditor(next) {
          editor ||= new Editor({ ...next, content: JSON.parse(JSON.stringify(next.content)), element: null, injectCSS: false })
          editor.setOptions({ ...next })
          return editor
        },
        EditorContent: Null,
      },
      '@tiptap/starter-kit': { default: { configure: options => StarterKit.configure(JSON.parse(JSON.stringify(options))) } },
      '@tiptap/extension-placeholder': { default: { configure: options => Placeholder.configure(JSON.parse(JSON.stringify(options))) } },
      '@tiptap/extension-text-style': textStyle,
      'lucide-react': icons,
      './RoomMessage': { RoomDocument: Null, RoomSticker: Null },
      '../lib/roomChat': { discardRoomFile: async () => {}, uploadRoomFile: async () => {}, validateRoomFile() {} },
    },
  })
  const initial = { document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }] }, files: [], sticker: null, pending: null }
  function Harness() {
    const [draft, setDraft] = React.useState(initial)
    return React.createElement(RoomComposer, { roomId: 'room-one', draft, onDraft: setDraft, onSend() {}, sending: false, archived: false, labels })
  }
  let renderer
  await act(async () => { renderer = create(React.createElement(Harness)) })
  t.after(async () => { await unmount(renderer); editor.destroy() })
  const button = label => renderer.root.findAll(node => node.type === 'button' && (node.props['aria-label'] === label || node.props.children === label))[0]
  return {
    labels, storage, editor: () => editor, renderer, button,
    click: label => act(async () => button(label).props.onClick()),
    key: event => act(async () => renderer.root.findByType('form').props.onKeyDown({ preventDefault() {}, stopPropagation() {}, ...event })),
    formatBar: () => renderer.root.findAll(node => node.props.role === 'toolbar' && node.props['aria-label'] === labels.formatting),
    marks: () => editor.getJSON().content[0].content[0].marks || [],
  }
}

test('the formatting row applies palette colours, sizes, lists, clearing and undo on the real editor', async t => {
  const f = await formattingComposer(t)
  const { labels } = f
  assert.equal(f.formatBar().length, 1, 'Formatting row starts open')
  f.editor().commands.setTextSelection({ from: 1, to: 6 })
  await f.click(labels.bold)
  assert.deepEqual(f.marks().map(mark => mark.type), ['bold'])
  await f.click(labels.textSize)
  await f.click(labels.size_large)
  await f.click(labels.textColor)
  await f.click(labels.color_blue)
  const style = f.marks().find(mark => mark.type === 'textStyle')
  assert.equal(style.attrs.fontSize, '17px')
  assert.equal(style.attrs.color, '#175cd3')
  const { normalizeRoomDocument } = await import('../../news-app/src/lib/roomDocument.js')
  const normalized = normalizeRoomDocument(f.editor().getJSON()).content[0].content[0].marks
  assert.deepEqual([...normalized].sort((a, b) => a.type.localeCompare(b.type)), [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#175cd3', fontSize: '17px' } }])
  await f.click(labels.clearFormat)
  assert.deepEqual(f.marks(), [])
  await f.click(labels.bulletList)
  assert.equal(f.editor().getJSON().content[0].type, 'bulletList')
  assert.equal(f.button(labels.indent).props.disabled, true, 'A single item has nothing to nest under')
  assert.equal(f.button(labels.outdent).props.disabled, false)
  await f.click(labels.orderedList)
  assert.equal(f.editor().getJSON().content[0].type, 'orderedList')
  // A headless editor keeps no undo history; undo and redo are exercised in the browser.
  assert.ok(f.button(labels.undo) && f.button(labels.redo))
})

test('Cmd/Ctrl+Shift+X hides and restores the formatting row and remembers the choice; expand grows the editor', async t => {
  const f = await formattingComposer(t)
  const { labels } = f
  await f.key({ key: 'X', metaKey: true, shiftKey: true })
  assert.equal(f.formatBar().length, 0)
  assert.equal(f.storage.get('icue.room.formatting'), 'closed')
  assert.equal(f.button(labels.formatting).props['aria-pressed'], false)
  await f.key({ key: 'x', ctrlKey: true, shiftKey: true })
  assert.equal(f.formatBar().length, 1)
  assert.equal(f.storage.get('icue.room.formatting'), 'open')
  await f.key({ key: 'x', shiftKey: true })
  assert.equal(f.formatBar().length, 1, 'Shift+X alone types normally')
  await f.click(labels.expand)
  assert.ok(f.renderer.root.findByType('form').props.className.includes('room-composer--expanded'))
  await f.click(labels.collapse)
  assert.equal(f.renderer.root.findByType('form').props.className.includes('room-composer--expanded'), false)
  assert.ok(f.editor().extensionManager.extensions.find(extension => extension.name === 'placeholder').options.placeholder.includes('⌘ + Shift + X'))
})

test('a stored closed preference keeps the formatting row hidden', async t => {
  const f = await formattingComposer(t, { storage: new Map([['icue.room.formatting', 'closed']]) })
  assert.equal(f.formatBar().length, 0)
})

test('formatted messages render lists and palette styles, and never unlisted styles', async t => {
  silenceRenderer(t)
  const labels = roomChatCopy('en')
  const { RoomDocument } = await sourceModule('news-app/src/components/RoomMessage.jsx', {
    imports: { 'lucide-react': icons, '../lib/roomChat': { downloadRoomFile: async () => {}, roomChatRpc: async () => ({}) }, './RoomComposer': { default: Null } },
  })
  const p = (text, marks) => ({ type: 'paragraph', content: [{ type: 'text', text, ...(marks && { marks }) }] })
  const document = { type: 'doc', content: [
    p('Agenda', [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#b42318', fontSize: '22px' } }]),
    p('Sneaky', [{ type: 'textStyle', attrs: { color: 'red; background:url(https://example.invalid/x)', fontSize: '400px' } }]),
    { type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [p('Budget'), { type: 'bulletList', content: [{ type: 'listItem', content: [p('Q4')] }] }] }] },
  ] }
  let renderer
  await act(async () => { renderer = create(React.createElement(RoomDocument, { document, labels })) })
  t.after(() => unmount(renderer))
  const styled = renderer.root.findAll(node => node.type === 'span' && node.props.style)
  assert.deepEqual(JSON.parse(JSON.stringify(styled.map(node => node.props.style))), [{ color: '#b42318', fontSize: '22px' }])
  const output = JSON.stringify(renderer.toJSON())
  assert.equal(output.includes('url('), false)
  assert.equal(output.includes('400px'), false)
  assert.equal(renderer.root.findByType('ol').props.start, 3)
  assert.equal(renderer.root.findAllByType('li').length, 2)
  const nested = renderer.root.findByType('ul')
  assert.equal(nested.findAllByType('li').length, 1)
  assert.ok(JSON.stringify(renderer.toJSON()).includes('{"type":"ul","props":{},"children":[{"type":"li","props":{},"children":[{"type":"p","props":{},"children":[{"type":"span","props":{},"children":["Q4"]}]}]}]}'))
})
