/** Server-safe Unicode normalization (no shared/ imports — Netlify functions run as root CJS). */

export function normalizeUnicode(value) {
  if (typeof value !== 'string') return value
  return value.normalize('NFC')
}

export function normalizeHtmlUnicode(html) {
  const source = html ?? ''
  if (typeof source !== 'string' || !source.trim()) return source
  return normalizeUnicode(source)
}
