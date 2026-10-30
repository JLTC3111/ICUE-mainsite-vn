/** Plain body copy for front-page previews; article HTML remains untouched. */
export function articleBodyPreview(html, maxLength = 520, repeatedHeadings = []) {
  const source = String(html || '')
    .replace(/<(script|style|figure|figcaption|iframe|video|audio|table|h[1-6])\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|li|blockquote|section)>/gi, tag => `${tag}\n`)
  const Parser = typeof DOMParser === 'function' ? DOMParser
    : typeof document !== 'undefined' ? document.defaultView?.DOMParser : null
  let text
  if (Parser) text = new Parser().parseFromString(source, 'text/html').body.textContent || ''
  else text = source.replace(/<[^>]*>/g, ' ').replace(/&(nbsp|amp|lt|gt|quot|apos);/gi, (_, entity) => ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity.toLowerCase()])
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim()
  const headings = repeatedHeadings.map(normalize).filter(Boolean)
  const lines = text.split(/\n+/).map(normalize).filter(Boolean)
  while (lines.length && headings.includes(lines[0])) lines.shift()
  text = normalize(lines.join(' '))
  // Some editors store the title and standfirst in one paragraph. Remove
  // that exact repeated pair while preserving ordinary introductory prose.
  if (headings.length > 1 && text.startsWith(headings.join(' '))) text = text.slice(headings.join(' ').length).trim()
  const characters = Array.from(text)
  if (characters.length <= maxLength) return text
  const clipped = characters.slice(0, maxLength).join('')
  const boundary = clipped.lastIndexOf(' ')
  return `${(boundary > maxLength * 0.7 ? clipped.slice(0, boundary) : clipped).trimEnd()}…`
}
