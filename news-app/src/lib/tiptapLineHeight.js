import { Extension } from '@tiptap/core'

// Paragraph / heading line-height control for the rich text editor.
export const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return { types: ['paragraph', 'heading'] }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight?.replace(/['"]+/g, '') || null,
            renderHTML: (attrs) => {
              if (!attrs.lineHeight) return {}
              return { style: `line-height: ${attrs.lineHeight}` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands, editor }) => {
          const activeType = this.options.types.find((type) => editor.isActive(type))
          const type = activeType || 'paragraph'
          return commands.updateAttributes(type, { lineHeight })
        },
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types.reduce(
            (ok, type) => commands.resetAttributes(type, 'lineHeight') || ok,
            false,
          ),
    }
  },
})
