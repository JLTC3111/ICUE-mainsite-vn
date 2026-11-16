export const ROOM_STICKERS = ['wave', 'celebrate', 'heart']
export const EMPTY_ROOM_DOCUMENT = { type: 'doc', content: [{ type: 'paragraph' }] }
// Colours and sizes must match icue_rooms.validate_document exactly.
export const ROOM_TEXT_COLORS = { red: '#b42318', orange: '#c4320a', amber: '#a15c07', green: '#067647', blue: '#175cd3', purple: '#6927da', pink: '#c11574', gray: '#475467' }
export const ROOM_FONT_SIZES = { small: '11px', large: '17px', huge: '22px' }
export const ROOM_LIST_DEPTH = 3
const simpleMarks = new Set(['bold', 'italic', 'underline', 'strike'])
const colors = new Set(Object.values(ROOM_TEXT_COLORS)), sizes = new Set(Object.values(ROOM_FONT_SIZES))
const lists = new Set(['bulletList', 'orderedList'])
const fail = (code = 'ROOM_DOCUMENT') => { throw new Error(code) }
const utf8Length = text => {
  let bytes = 0
  for (const char of text) { const code = char.codePointAt(0); bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4 }
  return bytes
}

// Unknown colours and sizes (for example from pasted text) are dropped; any other
// unexpected mark or node rejects the document.
function normalizeMarks(marks) {
  if (marks === undefined) return undefined
  if (!Array.isArray(marks) || marks.length > 5) fail()
  const seen = new Set(), result = []
  for (const mark of marks) {
    const type = mark?.type
    if (seen.has(type)) continue
    if (!simpleMarks.has(type) && type !== 'textStyle') fail()
    seen.add(type)
    if (type !== 'textStyle') { result.push({ type }); continue }
    const attrs = {}
    if (colors.has(mark.attrs?.color)) attrs.color = mark.attrs.color
    if (sizes.has(mark.attrs?.fontSize)) attrs.fontSize = mark.attrs.fontSize
    if (attrs.color || attrs.fontSize) result.push({ type, attrs })
  }
  return result.length ? result : undefined
}

function normalizeParagraph(block, state) {
  if (block.content !== undefined && !Array.isArray(block.content)) fail()
  const children = (block.content || []).map(child => {
    if (child?.type !== 'text' || typeof child.text !== 'string' || !child.text || ++state.texts > 1000) fail()
    state.length += child.text.length
    if (state.length > 4000) fail('ROOM_LENGTH')
    const marks = normalizeMarks(child.marks)
    return marks ? { type: 'text', text: child.text, marks } : { type: 'text', text: child.text }
  })
  return children.length ? { type: 'paragraph', content: children } : { type: 'paragraph' }
}

function normalizeList(block, state, depth) {
  if (depth >= ROOM_LIST_DEPTH || !Array.isArray(block.content) || !block.content.length || block.content.length > 100) fail()
  const content = block.content.map(item => {
    if (item?.type !== 'listItem' || !Array.isArray(item.content) || !item.content.length || item.content.length > 50 || item.content[0]?.type !== 'paragraph') fail()
    return { type: 'listItem', content: item.content.map(child => normalizeBlock(child, state, depth + 1, 'listItem')) }
  })
  const start = block.attrs?.start
  return block.type === 'orderedList' && Number.isInteger(start) && start > 1 && start <= 9999
    ? { type: 'orderedList', attrs: { start }, content }
    : { type: block.type, content }
}

function normalizeBlock(block, state, depth, parent) {
  if (++state.blocks > 500) fail()
  if (block?.type === 'sticker' && parent === 'doc' && ROOM_STICKERS.includes(block.attrs?.name)) return { type: 'sticker', attrs: { name: block.attrs.name } }
  if (block?.type === 'paragraph') return normalizeParagraph(block, state)
  if (lists.has(block?.type)) return normalizeList(block, state, depth)
  return fail()
}

// The browser keeps the same small document vocabulary as the database.
// Remote documents are rendered as React elements and never interpreted as HTML.
export function normalizeRoomDocument(document) {
  if (document?.type !== 'doc' || !Array.isArray(document.content) || document.content.length > 100) fail()
  const state = { length: 0, texts: 0, blocks: 0 }
  const content = document.content.map(block => normalizeBlock(block, state, 0, 'doc'))
  const result = { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
  // The database allows 64,000 bytes of stored JSON; leave room for its formatting.
  if (utf8Length(JSON.stringify(result)) > 48_000) fail()
  return result
}

const blockLines = block => block.type === 'paragraph'
  ? [(block.content || []).map(child => child.text || '').join('')]
  : lists.has(block.type) ? (block.content || []).flatMap(item => (item.content || []).flatMap(blockLines)) : []

export function roomDocumentText(document) {
  return (document?.content || []).flatMap(blockLines).join('\n')
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
