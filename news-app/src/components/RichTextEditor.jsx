import { useEffect, memo, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlignCenter,
  AlignLeft,
  Eraser,
  Highlighter as HighlighterIcon,
  Link as LinkIcon,
  Quote,
  Sparkles,
  Table2,
  TableProperties,
  X,
} from 'lucide-react'
import {
  ARTICLE_HIGHLIGHT_COLORS,
  ARTICLE_MAGIC_HIGHLIGHT_COLORS,
  ARTICLE_LINE_HEIGHTS,
  ARTICLE_TEXT_COLORS,
  sanitizeArticleHtml,
} from '@icue/text/sanitizeArticleHtml'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExt from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { LineHeight } from '../lib/tiptapLineHeight'
import { detectImportantPhraseRanges, IMPORTANT_PHRASE_STYLES } from '../lib/importantPhrases'
import { MagicHighlight, MagicUnderline } from '../lib/tiptapMagicHighlight'
import './RichTextEditor.css'

const ICON = { size: 16, strokeWidth: 2 }

const TEXT_COLOR_NAMES = {
  '#111316': 'Black',
  '#dc2626': 'Red',
  '#ea580c': 'Orange',
  '#059669': 'Green',
  '#2563eb': 'Blue',
  '#7c3aed': 'Purple',
  '#6b7280': 'Gray',
}

const HIGHLIGHT_COLOR_NAMES = {
  '#fef08a': 'Yellow',
  '#bbf7d0': 'Green',
  '#bfdbfe': 'Blue',
  '#fbcfe8': 'Pink',
  '#fed7aa': 'Orange',
}

const TEXT_COLORS = [...ARTICLE_TEXT_COLORS].map((value) => ({
  name: TEXT_COLOR_NAMES[value] || value,
  value,
}))

const HIGHLIGHT_COLORS = [...ARTICLE_HIGHLIGHT_COLORS].map((value) => ({
  name: HIGHLIGHT_COLOR_NAMES[value] || value,
  value,
}))

const LINE_HEIGHTS = [...ARTICLE_LINE_HEIGHTS].map((value) => ({
  label: value === '1' ? '1.0' : value,
  value,
}))

const extensions = (placeholder) => [
  StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
  MagicUnderline,
  LinkExt.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
  Image.configure({ inline: false, HTMLAttributes: { loading: 'lazy', decoding: 'async' } }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Color,
  MagicHighlight.configure({ multicolor: true }),
  LineHeight,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Placeholder.configure({ placeholder }),
]

function ToolbarButton({ active, onClick, label, children, disabled, className = '' }) {
  return (
    <button
      type="button"
      className={`rte-btn${className ? ` ${className}` : ''}${active ? ' is-active' : ''}`}
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

function RichTextEditor({ value, onChange, placeholder = 'Tell your story…', locale }) {
  const { t, i18n } = useTranslation()
  const highlightLocale = String(locale || i18n.resolvedLanguage || i18n.language || 'vi')
    .split('-')[0]
    .toLowerCase()
  const highlightT = useMemo(() => i18n.getFixedT(highlightLocale), [highlightLocale, i18n])
  const lastEmitted = useRef(value || '')
  const [smartHighlightMessage, setSmartHighlightMessage] = useState('')

  const editor = useEditor({
    extensions: extensions(placeholder),
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const raw = editor.getHTML()
      const html = sanitizeArticleHtml(raw)
      if (html !== raw) {
        lastEmitted.current = html
        editor.commands.setContent(html, { emitUpdate: false })
        onChange?.({ html, json: editor.getJSON() })
        return
      }
      lastEmitted.current = html
      onChange?.({ html, json: editor.getJSON() })
    },
    editorProps: {
      attributes: { class: 'rte-content', spellcheck: 'true' },
      transformPastedHTML: (html) => sanitizeArticleHtml(html),
      handleKeyDown: (_view, event) => {
        if (event.key !== 'Enter') return false
        event.preventDefault()
        if (event.shiftKey) return editor?.commands.setHardBreak() ?? false
        return editor?.commands.splitBlock() ?? false
      },
    },
  })

  useEffect(() => {
    if (!editor || value == null) return
    if (value === lastEmitted.current) return
    try {
      lastEmitted.current = value
      editor.commands.setContent(value, { emitUpdate: false })
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

  const toggleMagicUnderline = useCallback(() => {
    if (!editor) return
    if (editor.isActive('underline')) {
      editor.chain().focus().unsetUnderline().run()
      return
    }
    editor.chain().focus().unsetHighlight().setUnderline().run()
  }, [editor])

  const toggleMagicHighlight = useCallback((color) => {
    if (!editor) return
    if (editor.isActive('highlight', { color })) {
      editor.chain().focus().unsetHighlight().run()
      return
    }
    editor.chain().focus().unsetUnderline().setHighlight({ color }).run()
  }, [editor])

  const cleanFormatting = useCallback(() => {
    if (!editor) return
    const clean = sanitizeArticleHtml(editor.getHTML())
    lastEmitted.current = clean
    editor.commands.setContent(clean, { emitUpdate: false })
    onChange?.({ html: clean, json: editor.getJSON() })
  }, [editor, onChange])

  const highlightImportantPhrases = useCallback(() => {
    if (!editor) return

    const candidates = []
    editor.state.doc.descendants((node, position) => {
      if (!node.isTextblock || node.type.name === 'codeBlock' || node.type.name === 'heading') return

      // Build a block string while counting inline atoms as one document
      // position. This keeps ranges accurate when existing marks split text.
      let blockText = ''
      node.forEach((child) => {
        if (child.isText) blockText += child.text
        else if (child.type.name === 'hardBreak') blockText += '\n'
        else blockText += ' '.repeat(child.nodeSize)
      })

      for (const range of detectImportantPhraseRanges(blockText)) {
        candidates.push({
          ...range,
          from: position + 1 + range.start,
          to: position + 1 + range.end,
        })
      }

      return false
    })

    const selected = candidates
      .sort((a, b) => b.score - a.score || a.from - b.from)
      .slice(0, 12)
      .sort((a, b) => a.from - b.from)

    if (!selected.length) {
      setSmartHighlightMessage(highlightT('editor.smartHighlightNone'))
      return
    }

    const { schema } = editor.state
    let transaction = editor.state.tr
    let highlightIndex = 0
    for (const range of selected) {
      const style = IMPORTANT_PHRASE_STYLES[range.kind]
      // Reset both annotation marks before applying exactly one treatment.
      if (schema.marks.highlight) {
        transaction = transaction.removeMark(range.from, range.to, schema.marks.highlight)
      }
      if (schema.marks.underline) {
        transaction = transaction.removeMark(range.from, range.to, schema.marks.underline)
      }
      if (style.bold && schema.marks.bold) {
        transaction = transaction.addMark(range.from, range.to, schema.marks.bold.create())
      }
      if (style.italic && schema.marks.italic) {
        transaction = transaction.addMark(range.from, range.to, schema.marks.italic.create())
      }
      if (style.color && schema.marks.textStyle) {
        transaction = transaction.addMark(range.from, range.to, schema.marks.textStyle.create({ color: style.color }))
      }
      if (style.underline && schema.marks.underline) {
        transaction = transaction.addMark(range.from, range.to, schema.marks.underline.create())
      } else if (style.highlight && schema.marks.highlight) {
        const highlightColor = ARTICLE_MAGIC_HIGHLIGHT_COLORS[
          highlightIndex % ARTICLE_MAGIC_HIGHLIGHT_COLORS.length
        ]
        highlightIndex += 1
        transaction = transaction.addMark(
          range.from,
          range.to,
          schema.marks.highlight.create({ color: highlightColor }),
        )
      }
    }

    editor.view.dispatch(transaction)
    editor.commands.focus()
    setSmartHighlightMessage(highlightT('editor.smartHighlightDone', { count: selected.length }))
  }, [editor, highlightT])

  const activeHighlight = editor?.getAttributes('highlight').color
  const activeColor = editor?.getAttributes('textStyle').color
  const inTable = editor?.isActive('table')

  if (!editor) return <div className="rte rte--loading"><span className="spin" style={{ borderColor: '#ddd', borderTopColor: '#111' }} /></div>

  return (
    <div className="rte" lang={highlightLocale}>
      <div
        className="rte-toolbar rte-toolbar--magic"
        role="toolbar"
        aria-label={`Magic UI — ${highlightT('editor.smartHighlight')}`}
      >
        <span className="rte-magic-brand" aria-hidden="true">
          <Sparkles {...ICON} />
          <span>Magic UI</span>
        </span>
        <ToolbarButton
          className="rte-btn--smart"
          label={`Magic UI — ${highlightT('editor.smartHighlight')}`}
          onClick={highlightImportantPhrases}
        >
          <HighlighterIcon {...ICON} aria-hidden />
          <span>{highlightT('editor.smartHighlight')}</span>
        </ToolbarButton>
        {smartHighlightMessage && (
          <span className="rte-smart-status" role="status">{smartHighlightMessage}</span>
        )}
      </div>

      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>i</i></ToolbarButton>
        <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={toggleMagicUnderline}><u>U</u></ToolbarButton>
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
              onClick={() => toggleMagicHighlight(c.value)}
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
        <ToolbarButton
          label={t('editor.cleanFormatting')}
          onClick={cleanFormatting}
        >
          <Eraser {...ICON} />
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
