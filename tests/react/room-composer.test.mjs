import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'
import { roomChatCopy } from '../../news-app/src/lib/roomChatCopy.js'

const newsRequire = createRequire(new URL('../../news-app/package.json', import.meta.url))
const { Editor } = newsRequire('@tiptap/core')
const { StarterKit } = newsRequire('@tiptap/starter-kit')
const { Placeholder } = newsRequire('@tiptap/extension-placeholder')
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
