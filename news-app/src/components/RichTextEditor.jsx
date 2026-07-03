import { useEffect, memo, useCallback, useRef } from 'react'
import {
  AlignCenter,
  AlignLeft,
  Link as LinkIcon,
  Quote,
  Table2,
  TableProperties,
  X,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExt from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { LineHeight } from '../lib/tiptapLineHeight'
import './RichTextEditor.css'

const ICON = { size: 16, strokeWidth: 2 }

const TEXT_COLORS = [
  { name: 'Black', value: '#111316' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Green', value: '#059669' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Gray', value: '#6b7280' },
]

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' },
]

const LINE_HEIGHTS = [
  { label: '1.0', value: '1' },
  { label: '1.25', value: '1.25' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2.0', value: '2' },
]

const extensions = (placeholder) => [
  StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
  Underline,
  LinkExt.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
  Image.configure({ inline: false, HTMLAttributes: { loading: 'lazy', decoding: 'async' } }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  LineHeight,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Placeholder.configure({ placeholder }),
]

function ToolbarButton({ active, onClick, label, children, disabled }) {
  return (
    <button
      type="button"
      className={`rte-btn ${active ? 'is-active' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

function RichTextEditor({ value, onChange, placeholder = 'Tell your story…' }) {
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

  useEffect(() => {
    if (!editor || value == null) return
    if (value === lastEmitted.current) return
    try {
      lastEmitted.current = value
      editor.commands.setContent(value, false)
    } catch {
      /* editor not ready */
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

  const activeHighlight = editor?.getAttributes('highlight').color
  const activeColor = editor?.getAttributes('textStyle').color
  const inTable = editor?.isActive('table')

  if (!editor) return <div className="rte rte--loading"><span className="spin" style={{ borderColor: '#ddd', borderTopColor: '#111' }} /></div>

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>i</i></ToolbarButton>
        <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon {...ICON} />
        </ToolbarButton>
        <span className="rte-sep" />
        <div className="rte-colors" role="group" aria-label="Text color">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`rte-textcolor${activeColor === c.value ? ' is-active' : ''}`}
              style={{ '--text-color': c.value }}
              title={`Text ${c.name}`}
              aria-label={`Text ${c.name}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setColor(c.value).run()}
            >
              A
            </button>
          ))}
          <button
            type="button"
            className="rte-btn rte-btn--clear"
            title="Reset text color"
            aria-label="Reset text color"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().unsetColor().run()}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <span className="rte-sep" />
        <div className="rte-highlight" role="group" aria-label="Highlight">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`rte-swatch${activeHighlight === c.value ? ' is-active' : ''}`}
              style={{ '--swatch': c.value }}
              title={`Highlight ${c.name}`}
              aria-label={`Highlight ${c.name}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
            />
          ))}
          <button
            type="button"
            className="rte-btn rte-btn--clear"
            title="Remove highlight"
            aria-label="Remove highlight"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().unsetHighlight().run()}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <span className="rte-sep" />
        <ToolbarButton label="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>T</ToolbarButton>
        <ToolbarButton label="Subheading" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><small>T</small></ToolbarButton>
        <ToolbarButton label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote {...ICON} />
        </ToolbarButton>
        <span className="rte-sep" />
        <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolbarButton>
        <span className="rte-sep" />
        <ToolbarButton label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft {...ICON} />
        </ToolbarButton>
        <ToolbarButton label="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter {...ICON} />
        </ToolbarButton>
        <span className="rte-sep" />
        <label className="rte-lineheight" title="Line spacing">
          <span className="visually-hidden">Line spacing</span>
          <select
            value={editor.getAttributes('paragraph').lineHeight || editor.getAttributes('heading').lineHeight || ''}
            onChange={(e) => {
              const val = e.target.value
              if (val) editor.chain().focus().setLineHeight(val).run()
              else editor.chain().focus().unsetLineHeight().run()
            }}
          >
            <option value="">↕</option>
            {LINE_HEIGHTS.map((lh) => (
              <option key={lh.value} value={lh.value}>{lh.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="rte-toolbar rte-toolbar--table" role="toolbar" aria-label="Table">
        <ToolbarButton
          label="Insert table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <Table2 {...ICON} />
        </ToolbarButton>
        <ToolbarButton label="Add row" disabled={!inTable} onClick={() => editor.chain().focus().addRowAfter().run()}>+R</ToolbarButton>
        <ToolbarButton label="Add column" disabled={!inTable} onClick={() => editor.chain().focus().addColumnAfter().run()}>+C</ToolbarButton>
        <ToolbarButton label="Delete row" disabled={!inTable} onClick={() => editor.chain().focus().deleteRow().run()}>−R</ToolbarButton>
        <ToolbarButton label="Delete column" disabled={!inTable} onClick={() => editor.chain().focus().deleteColumn().run()}>−C</ToolbarButton>
        <ToolbarButton label="Delete table" disabled={!inTable} onClick={() => editor.chain().focus().deleteTable().run()}>
          <TableProperties {...ICON} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}

export default memo(RichTextEditor)
