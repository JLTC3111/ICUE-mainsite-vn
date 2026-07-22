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
