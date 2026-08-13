import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import { ReactMarkViewRenderer } from '@tiptap/react'
import MagicHighlightMarkView from '../components/MagicHighlightMarkView'
import MagicUnderlineMarkView from '../components/MagicUnderlineMarkView'

/**
 * TipTap's regular highlight schema/commands with Magic UI as its only visual
 * renderer. Existing and newly-authored <mark> elements therefore share the
 * same editor behavior without a legacy rendering flag.
 */
export const MagicHighlight = Highlight.extend({
  addMarkView() {
    return ReactMarkViewRenderer(MagicHighlightMarkView, {
      as: 'span',
      className: 'rte-magic-highlight-mark',
    })
  },
})

/** Semantic <u> storage with Magic UI's orange underline in the editor. */
export const MagicUnderline = Underline.extend({
  addMarkView() {
    return ReactMarkViewRenderer(MagicUnderlineMarkView, {
      as: 'span',
      className: 'rte-magic-underline-mark',
    })
  },

  addKeyboardShortcuts() {
    return {
      'Mod-u': () => {
        if (this.editor.isActive('underline')) {
          return this.editor.commands.unsetUnderline()
        }
        return this.editor.chain().unsetHighlight().setUnderline().run()
      },
    }
  },
})
