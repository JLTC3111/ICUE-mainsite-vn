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

/** Normalize text nodes inside HTML (article body from CMS / translation APIs). */
export function normalizeHtmlUnicode(html) {
  const source = html ?? ''
  if (typeof source !== 'string' || !source.trim()) return source
  if (typeof DOMParser === 'undefined') return normalizeUnicode(source)

  const doc = new DOMParser().parseFromString(source, 'text/html')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.nodeValue) node.nodeValue = normalizeUnicode(node.nodeValue)
  }
  return doc.body.innerHTML
}
