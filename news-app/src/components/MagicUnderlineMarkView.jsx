import { MarkViewContent } from '@tiptap/react'
import { Highlighter, MAGIC_UNDERLINE_COLOR } from '@/registry/magicui/highlighter'

/** Render semantic underline marks as an orange Rough Notation annotation. */
export default function MagicUnderlineMarkView() {
  return (
    <Highlighter
      action="underline"
      color={MAGIC_UNDERLINE_COLOR}
      strokeWidth={2.25}
      animationDuration={420}
      iterations={2}
      padding={1}
    >
      <MarkViewContent />
    </Highlighter>
  )
}
