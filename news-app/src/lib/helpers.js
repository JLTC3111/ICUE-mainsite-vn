// Small dependency-free helpers shared across pages.

import { normalizeHtmlUnicode, normalizeUnicode } from '@icue/text/normalizeUnicode'
import { sanitizeArticleHtml, sanitizePlainText } from '@icue/text/sanitizeArticleHtml'

export function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (đ handled below)
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function uniqueSlug(title) {
  const base = slugify(title) || 'bai-viet'
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

// Estimate read time from HTML (~200 wpm).
export function readMinutes(html) {
  const text = (html || '').replace(/<[^>]*>/g, ' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export function formatDate(value, locale = 'vi') {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

/** Publish / display date for an article (server stamp, else author form date). */
export function articlePublishDate(article) {
  return article?.published_at || article?.article_date || null
}

/**
 * Last-edited timestamp. Uses updated_at once view increments no longer touch it.
 * Returns null when the article has not been meaningfully edited after publish.
 */
export function articleEditedDate(article, { minDiffMs = 60_000 } = {}) {
  if (!article?.updated_at) return null
  const published = articlePublishDate(article)
  if (!published) return article.updated_at
  const pubMs = new Date(published).getTime()
  const editMs = new Date(article.updated_at).getTime()
  if (!Number.isFinite(pubMs) || !Number.isFinite(editMs)) return null
  if (editMs - pubMs < minDiffMs) return null
  return article.updated_at
}

export function formatDateTime(value, locale = 'vi') {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

const RELATIVE_DIVISIONS = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
]

/** "3 minutes ago" in the active UI locale. Empty string on bad input. */
export function formatRelativeTime(value, locale = 'vi') {
  if (!value) return ''
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms)) return ''
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    let delta = (ms - Date.now()) / 1000
    for (const { amount, unit } of RELATIVE_DIVISIONS) {
      if (Math.abs(delta) < amount) return rtf.format(Math.round(delta), unit)
      delta /= amount
    }
    return rtf.format(Math.round(delta), 'year')
  } catch {
    return formatDate(value, locale)
  }
}

export function plainExcerpt(html, max = 160) {
  const text = normalizeUnicode(
    (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  )
  return text.length > max ? `${text.slice(0, max).trim()}…` : text
}

export { normalizeHtmlUnicode, normalizeUnicode, sanitizeArticleHtml, sanitizePlainText }

export const fileExt = (name = '') => {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : 'bin'
}
