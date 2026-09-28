/** Retrieval metadata selects the live mascot's response reaction. */
export function responseExpression(meta) {
  if (meta?.source === 'error') return 'error'
  if (['fallback', 'clarification', 'unsupported'].includes(meta?.source)) return 'confused'
  return 'happy'
}

/** Only authored guidance gets a bulb; failed/uncertain replies never celebrate. */
export function responseEffect(meta) {
  if (responseExpression(meta) !== 'happy') return 'none'
  if (meta?.source === 'faq' || ['documents_required', 'policies', 'faq'].includes(meta?.intentId)) return 'book'
  if (meta?.source === 'intent' && ['planning_design', 'process_steps', 'green_sustainability', 'request_proposal', 'internship', 'recruitment'].includes(meta.intentId)) return 'bulb'
  return ['intent', 'quick_topic'].includes(meta?.source) ? 'hearts' : 'none'
}

/** Body language follows the active task, including independently composed props. */
export function mascotPose(expression, effect) {
  if (['sleeping', 'coffee', 'listening', 'error', 'excited', 'handoff'].includes(expression)) return expression
  if (effect === 'coffee') return 'coffee'
  if (effect === 'music') return 'listening'
  if (effect === 'book' || expression === 'reading') return 'reading'
  if (effect === 'bulb' || expression === 'idea') return 'idea'
  if (expression === 'happy') return effect === 'hearts' ? 'affection' : 'happy'
  if (['thinking', 'curious', 'confused'].includes(expression)) return 'thinking'
  return 'idle'
}

// Pixel paths, not font glyphs: identical in all six locales and without a font download.
const pixels = {
  prompt: ['10000', '11000', '01100', '00110', '01100', '11000', '10000'],
  caret: ['00100', '01110', '11011', '10001'],
  question: ['01110', '11011', '00011', '00110', '00100', '00000', '00100'],
  bang: ['11', '11', '11', '11', '00', '11'],
  cross: ['10001', '11011', '01110', '11011', '10001'],
  dash: ['11111', '11111'],
  arrow: ['0001000', '0001100', '1111110', '1111111', '1111110', '0001100', '0001000'],
}

export const GLYPH_PATHS = Object.fromEntries(Object.entries(pixels).map(([name, rows]) => [
  name,
  rows.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === '1'
    ? [`M${x} ${y}h1v1h-1z`]
    : [])).join(''),
]))

export const MASCOT_STATES = ['idle', 'greeting', 'excited', 'curious', 'thinking', 'speaking', 'happy', 'reading', 'idea', 'handoff', 'confused', 'error', 'coffee', 'listening', 'sleeping']
export const MASCOT_EFFECTS = ['none', 'sparkles', 'book', 'coffee', 'music', 'bulb', 'hearts', 'zzz']
export const EXCITED_MS = 650
export const REACTION_MS = 1800
export const COFFEE_AFTER_MS = 60_000
export const SLEEP_AFTER_MS = 120_000
