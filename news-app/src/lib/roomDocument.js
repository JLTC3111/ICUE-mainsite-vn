export const ROOM_STICKERS = ['wave', 'celebrate', 'heart']
export const EMPTY_ROOM_DOCUMENT = { type: 'doc', content: [{ type: 'paragraph' }] }
const marks = new Set(['bold', 'italic', 'underline', 'strike'])

// The browser keeps the same small document vocabulary as the database.
// Remote documents are rendered as React text and never interpreted as HTML.
export function normalizeRoomDocument(document) {
  if (document?.type !== 'doc' || !Array.isArray(document.content) || document.content.length > 100) throw new Error('ROOM_DOCUMENT')
  let length = 0
  const content = document.content.map(block => {
    if (block?.type === 'sticker' && ROOM_STICKERS.includes(block.attrs?.name)) return { type: 'sticker', attrs: { name: block.attrs.name } }
    if (block?.type !== 'paragraph' || (block.content !== undefined && !Array.isArray(block.content))) throw new Error('ROOM_DOCUMENT')
    const children = (block.content || []).map(child => {
      if (child?.type !== 'text' || typeof child.text !== 'string' || !child.text) throw new Error('ROOM_DOCUMENT')
      length += child.text.length
      if (length > 4000) throw new Error('ROOM_LENGTH')
      const result = { type: 'text', text: child.text }
      if (child.marks?.length) {
        if (!Array.isArray(child.marks) || child.marks.length > 4 || child.marks.some(mark => !marks.has(mark?.type))) throw new Error('ROOM_DOCUMENT')
        result.marks = [...new Set(child.marks.map(mark => mark.type))].map(type => ({ type }))
      }
      return result
    })
    return children.length ? { type: 'paragraph', content: children } : { type: 'paragraph' }
  })
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

export function roomDocumentText(document) {
  return (document?.content || []).map(block => block.type === 'paragraph' ? (block.content || []).map(child => child.text || '').join('') : '').join('\n')
}

export function roomDocumentHasContent(document) {
  return Boolean(roomDocumentText(document).trim() || document?.content?.some(block => block.type === 'sticker' && ROOM_STICKERS.includes(block.attrs?.name)))
}

export function mergeRoomMessages(previous, incoming) {
  const byId = new Map(previous.map(message => [String(message.id), message]))
  for (const message of incoming) byId.set(String(message.id), message)
  return [...byId.values()].sort((a, b) => {
    const first = BigInt(a.id), second = BigInt(b.id)
    return first < second ? -1 : first > second ? 1 : 0
  })
}

export function applyRoomSnapshot(previous, snapshot, older = false) {
  if (!Array.isArray(snapshot?.messages) || snapshot.messages.some(message => !/^\d+$/.test(String(message.id)))) throw new Error('ROOM_RESPONSE')
  const gap = !older && previous.messages.length > 0 && snapshot.messages.length >= 50 && !snapshot.messages.some(message => previous.messages.some(old => String(old.id) === String(message.id)))
  return { messages: mergeRoomMessages(gap ? [] : previous.messages, snapshot.messages), has_more: older || gap || !previous.messages.length ? Boolean(snapshot.has_more) : previous.has_more }
}
