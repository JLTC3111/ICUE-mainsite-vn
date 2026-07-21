/** Client-safe translation helpers (no Node.js / server env dependencies). */

import { LOCALE_CODE_SET } from './localeCodes.js'

const VI_CHARS = /[ăâđêôơưàáảãạắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i

export function normalizeLang(code) {
  return String(code || '').split('-')[0].toLowerCase()
}

/** Guess content language from metadata + a short text sample (title/excerpt). */
export function inferSourceLanguage(articleLanguage, textSample = '') {
  const declared = normalizeLang(articleLanguage || '')
  const sample = String(textSample || '').trim()

  if (sample) {
    if (VI_CHARS.test(sample)) return 'vi'
    if (/[\uac00-\ud7af]/.test(sample)) return 'ko'
    if (/[\u3040-\u30ff]/.test(sample)) return 'ja'
  }

  if (declared) return declared
  return 'vi'
}

export function shouldTranslateArticle(articleLanguage, targetLocale, textSample = '') {
  const target = normalizeLang(targetLocale)
  if (!target || !LOCALE_CODE_SET.has(target)) return false
  const source = inferSourceLanguage(articleLanguage, textSample)
  return source !== target
}
