/** Normalize to NFC so precomposed Vietnamese diacritics render correctly on Windows. */
export function normalizeUnicode(value) {
  if (typeof value !== 'string') return value
  return value.normalize('NFC')
}

export function normalizeDeep(value) {
  if (typeof value === 'string') return normalizeUnicode(value)
  if (Array.isArray(value)) return value.map(normalizeDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normalizeDeep(v)]),
    )
  }
  return value
}
