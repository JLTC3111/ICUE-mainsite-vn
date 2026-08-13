import { MarkViewContent } from '@tiptap/react'
import { Highlighter } from '@/registry/magicui/highlighter'

/**
 * Draw every TipTap highlight mark with Magic UI while leaving its content
 * editable. Persisted <mark> elements remain the semantic storage format.
 */
export default function MagicHighlightMarkView({ mark }) {
  const color = mark.attrs.color || '#bbf7d0'

  return (
    <Highlighter
      action="highlight"
      color={color}
      animationDuration={420}
      iterations={2}
      padding={1}
    >
      <MarkViewContent />
    </Highlighter>
  )
}
