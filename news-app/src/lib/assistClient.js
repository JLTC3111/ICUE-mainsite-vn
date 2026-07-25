/**
 * Assist client facade — Gemini wiring stays behind this until rebranded later.
 */
export { askGeminiAssist as askAssist } from './geminiAssist'

/** Server error codes (backend still uses gemini_* names for now). */
export const ASSIST_ERROR = {
  notConfigured: 'gemini_not_configured',
}
