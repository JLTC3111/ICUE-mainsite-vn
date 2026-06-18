import { useEffect, memo, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExt from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import './RichTextEditor.css'

const extensions = (placeholder) => [
  // StarterKit v3 already bundles Link + Underline, so disable them here to
  // avoid duplicate-extension schema corruption, then add our configured ones.
  StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
  Underline,
  LinkExt.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
  Image.configure({ inline: false, HTMLAttributes: { loading: 'lazy', decoding: 'async' } }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Placeholder.configure({ placeholder }),
]

function ToolbarButton({ active, onClick, label, children }) {
  return (
    <button
      type="button"
      className={`rte-btn ${active ? 'is-active' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

function RichTextEditor({ value, onChange, placeholder = 'Tell your story…' }) {
  // Tracks the HTML the editor itself last emitted, so the sync effect below
  // can tell an *external* value change (article load) apart from our own
  // keystroke-driven updates — preventing a setContent loop that resets the
  // caret on every character typed.
  const lastEmitted = useRef(value || '')

  const editor = useEditor({
    extensions: extensions(placeholder),
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      lastEmitted.current = html
      onChange?.({ html, json: editor.getJSON() })
    },
    editorProps: {
      attributes: { class: 'rte-content', spellcheck: 'true' },
    },
  })

  // Only push value into the editor when it changed externally (e.g. an article
  // finished loading on the edit page), never on our own emitted updates.
  useEffect(() => {
    if (!editor || value == null) return
    if (value === lastEmitted.current) return
    try {
      lastEmitted.current = value
      editor.commands.setContent(value, false)
    } catch {
      /* editor not ready for serialization yet; ignore */
    }
  }, [editor, value])

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return <div className="rte rte--loading"><span className="spin" style={{ borderColor: '#ddd', borderTopColor: '#111' }} /></div>

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>i</i></ToolbarButton>
        <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>🔗</ToolbarButton>
        <span className="rte-sep" />
        <ToolbarButton label="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>T</ToolbarButton>
        <ToolbarButton label="Subheading" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><small>T</small></ToolbarButton>
        <ToolbarButton label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolbarButton>
        <span className="rte-sep" />
        <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolbarButton>
        <span className="rte-sep" />
        <ToolbarButton label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>⯇</ToolbarButton>
        <ToolbarButton label="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>≡</ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

export default memo(RichTextEditor)
