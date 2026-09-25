/** Retrieval metadata is shared by the live reaction and transcript avatars. */
export function responseExpression(meta) {
  if (meta?.source === 'error') return 'error'
  if (['fallback', 'clarification', 'unsupported'].includes(meta?.source)) return 'confused'
  return 'happy'
}

// Pixel paths, not font glyphs: identical in all six locales and without a font download.
const pixels = {
  prompt: ['10000', '11000', '01100', '00110', '01100', '11000', '10000'],
  caret: ['00100', '01110', '11011', '10001'],
  question: ['01110', '11011', '00011', '00110', '00100', '00000', '00100'],
  bang: ['11', '11', '11', '11', '00', '11'],
  cross: ['10001', '11011', '01110', '11011', '10001'],
  dash: ['11111', '11111'],
}

export const GLYPH_PATHS = Object.fromEntries(Object.entries(pixels).map(([name, rows]) => [
  name,
  rows.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === '1'
    ? [`M${x} ${y}h1v1h-1z`]
    : [])).join(''),
]))

export const MASCOT_STATES = ['idle', 'greeting', 'curious', 'thinking', 'speaking', 'happy', 'confused', 'error', 'sleeping']
export const REACTION_MS = 1800
