import { normalizeUnicode } from './normalizeUnicode.js'

/** Keep in sync with RichTextEditor palette values. */
export const ARTICLE_TEXT_COLORS = new Set([
  '#111316',
  '#dc2626',
  '#ea580c',
  '#059669',
  '#2563eb',
  '#7c3aed',
  '#6b7280',
])

export const ARTICLE_MAGIC_HIGHLIGHT_COLORS = Object.freeze([
  '#bfdbfe',
  '#bbf7d0',
  '#fed7aa',
  '#fef08a',
])

export const ARTICLE_HIGHLIGHT_COLORS = new Set([
  ...ARTICLE_MAGIC_HIGHLIGHT_COLORS,
  '#fbcfe8',
])

export const ARTICLE_LINE_HEIGHTS = new Set(['1', '1.25', '1.5', '1.75', '2'])

const BLOCK_TAGS = new Set([
  'P', 'H2', 'H3', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY',
  'TR', 'TH', 'TD', 'FIGURE', 'DIV', 'HR', 'BR', 'IMG', 'A',
])

const ALLOWED_TAGS = new Set([
  ...BLOCK_TAGS,
  'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SPAN', 'MARK', 'SUP', 'SUB',
])

const STRIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'META', 'LINK', 'BASE', 'XML', 'O:P', 'FONT',
  'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT',
  'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'OPTION',
])

const BLOCK_ALIGN_TAGS = new Set(['P', 'H2', 'H3', 'BLOCKQUOTE', 'LI', 'TD', 'TH', 'DIV'])

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

const ALLOWED_ATTRIBUTES = Object.freeze({
  A: new Set(['href', 'title', 'target', 'rel']),
  IMG: new Set(['src', 'alt', 'title', 'loading', 'decoding', 'width', 'height']),
  MARK: new Set(['data-color']),
  OL: new Set(['start']),
  LI: new Set(['value']),
  TH: new Set(['colspan', 'rowspan', 'scope']),
  TD: new Set(['colspan', 'rowspan']),
})

const ALLOWED_REL_TOKENS = new Set(['noopener', 'noreferrer', 'nofollow', 'ugc', 'sponsored'])

function sanitizePlainText(value) {
  if (typeof value !== 'string') return value
  return normalizeUnicode(value)
}

function normalizeColor(value) {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  if (trimmed.startsWith('rgb')) return trimmed
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
    }
    return trimmed
  }
  return trimmed
}

function parseStyle(styleText) {
  const styles = {}
  if (!styleText) return styles

  for (const declaration of styleText.split(';')) {
    const trimmed = declaration.trim()
    if (!trimmed) continue
    const colon = trimmed.indexOf(':')
    if (colon === -1) continue
    const property = trimmed.slice(0, colon).trim().toLowerCase()
    const value = trimmed.slice(colon + 1).trim()
    if (!property || !value) continue
    styles[property] = value
  }
  return styles
}

function serializeStyle(styles) {
  const parts = Object.entries(styles).map(([key, value]) => `${key}: ${value}`)
  return parts.length ? parts.join('; ') : ''
}

function isBlockedStyleProperty(property) {
  const key = property.toLowerCase()
  if (key.startsWith('mso-') || key.startsWith('-webkit-') || key.startsWith('-ms-')) return true
  return [
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'font-variant',
    'letter-spacing',
    'word-spacing',
    'text-indent',
    'text-transform',
    'vertical-align',
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'background',
    'background-image',
    'opacity',
    'white-space',
    'word-break',
    'line-break',
  ].includes(key)
}

function pickAllowedStyles(styles, tagName) {
  const kept = {}
  const isBlock = BLOCK_ALIGN_TAGS.has(tagName)

  for (const [property, rawValue] of Object.entries(styles)) {
    if (isBlockedStyleProperty(property)) continue

    const value = rawValue.trim()
    const lowerProp = property.toLowerCase()

    if (lowerProp === 'color') {
      const color = normalizeColor(value)
      if (color && ARTICLE_TEXT_COLORS.has(color)) kept.color = color
      continue
    }

    if (lowerProp === 'background-color' || lowerProp === 'background') {
      const color = normalizeColor(value)
      if (color && ARTICLE_HIGHLIGHT_COLORS.has(color)) kept['background-color'] = color
      continue
    }

    if (lowerProp === 'line-height' && isBlock) {
      const normalized = value.replace(/['"]/g, '').replace(/\s*px\s*$/, '')
      if (ARTICLE_LINE_HEIGHTS.has(normalized)) kept['line-height'] = normalized
      continue
    }

    if (lowerProp === 'text-align' && isBlock) {
      const align = value.toLowerCase()
      if (align === 'left' || align === 'center' || align === 'right') {
        kept['text-align'] = align
      }
    }
  }

  return kept
}

function cleanStyleAttribute(styleText, tagName) {
  return serializeStyle(pickAllowedStyles(parseStyle(styleText), tagName))
}

function decodeUrlEntities(value) {
  const named = { colon: ':', tab: '\t', newline: '\n' }
  return String(value ?? '')
    .replace(/&#x([0-9a-f]+);?/gi, (match, hex) => {
      try {
        const codePoint = Number.parseInt(hex, 16)
        return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match
      } catch {
        return match
      }
    })
    .replace(/&#([0-9]+);?/g, (match, decimal) => {
      try {
        const codePoint = Number.parseInt(decimal, 10)
        return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match
      } catch {
        return match
      }
    })
    .replace(/&(colon|tab|newline);?/gi, (match, entity) => named[entity.toLowerCase()] ?? match)
}

function hasAllowedUrlScheme(value, kind) {
  const decoded = decodeUrlEntities(value).trim()
  if (!decoded) return false

  // Browsers ignore ASCII controls and whitespace in protocol names. Remove
  // them before checking so values such as "java&#x09;script:" cannot bypass
  // the scheme allowlist.
  const protocolProbe = decoded.replace(/[\u0000-\u0020\u007f-\u009f\s]+/gu, '')
  const scheme = protocolProbe.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase()
  if (!scheme) return true
  if (kind === 'image') return scheme === 'http' || scheme === 'https'
  return scheme === 'http' || scheme === 'https' || scheme === 'mailto' || scheme === 'tel'
}

function normalizeRel(value) {
  return [...new Set(String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => ALLOWED_REL_TOKENS.has(token)))]
}

function cleanAttributeValue(name, rawValue) {
  const value = String(rawValue ?? '')

  if (name === 'href') return hasAllowedUrlScheme(value, 'link') ? value.trim() : null
  if (name === 'src') return hasAllowedUrlScheme(value, 'image') ? value.trim() : null
  if (name === 'target') return value === '_blank' || value === '_self' ? value : null
  if (name === 'rel') {
    const rel = normalizeRel(value).join(' ')
    return rel || null
  }
  if (name === 'data-color') {
    const color = normalizeColor(value)
    return color && ARTICLE_HIGHLIGHT_COLORS.has(color) ? color : null
  }
  if (name === 'loading') return value === 'lazy' || value === 'eager' ? value : null
  if (name === 'decoding') return ['async', 'sync', 'auto'].includes(value) ? value : null
  if (name === 'scope') return ['row', 'col', 'rowgroup', 'colgroup'].includes(value) ? value : null
  if (name === 'width' || name === 'height') return /^\d{1,5}$/.test(value) ? value : null
  if (name === 'colspan' || name === 'rowspan') return /^\d{1,3}$/.test(value) ? value : null
  if (name === 'start' || name === 'value') return /^-?\d{1,9}$/.test(value) ? value : null

  // href/src and structural attributes are handled above. The remaining
  // allowlisted values are inert text attributes such as title and alt.
  return value
}

function sanitizeAttributeEntries(tagName, entries) {
  const tag = tagName.toUpperCase()
  const allowedForTag = ALLOWED_ATTRIBUTES[tag] || new Set()
  const kept = new Map()
  const seen = new Set()

  for (const [rawName, rawValue] of entries) {
    const name = String(rawName || '').toLowerCase()
    if (!name || seen.has(name)) continue
    seen.add(name)

    if (name === 'style') {
      const style = cleanStyleAttribute(rawValue, tag)
      if (style) kept.set('style', style)
      continue
    }
    if (!allowedForTag.has(name)) continue

    const cleaned = cleanAttributeValue(name, rawValue)
    if (cleaned !== null) kept.set(name, cleaned)
  }

  if (tag === 'A' && kept.get('target') === '_blank') {
    const rel = new Set(normalizeRel(kept.get('rel')))
    rel.add('noopener')
    rel.add('noreferrer')
    kept.set('rel', [...rel].join(' '))
  }

  return kept
}

function cleanElementAttributes(element) {
  const tag = element.tagName?.toUpperCase()
  if (!tag) return

  const entries = [...element.attributes].map((attr) => [attr.name, attr.value])
  const kept = sanitizeAttributeEntries(tag, entries)
  for (const attr of [...element.attributes]) element.removeAttribute(attr.name)
  for (const [name, value] of kept) element.setAttribute(name, value)
}

function unwrapElement(element) {
  const parent = element.parentNode
  if (!parent) return
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element)
  }
  parent.removeChild(element)
}

function normalizeTextNodes(root) {
  const walker = root.ownerDocument.createTreeWalker(root, 4)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.nodeValue) node.nodeValue = sanitizePlainText(node.nodeValue)
  }
}

function sanitizeNodeTree(root) {
  const doc = root.ownerDocument || root
  const body = root.nodeType === Node.DOCUMENT_NODE ? root.body : root

  const walker = doc.createTreeWalker(body, 1)
  const toProcess = []
  while (walker.nextNode()) toProcess.push(walker.currentNode)

  for (const element of toProcess) {
    const tag = element.tagName?.toUpperCase()

    if (element.namespaceURI && element.namespaceURI !== HTML_NAMESPACE) {
      element.remove()
      continue
    }

    if (STRIP_TAGS.has(tag)) {
      element.remove()
      continue
    }

    if (!ALLOWED_TAGS.has(tag)) {
      unwrapElement(element)
      continue
    }

    cleanElementAttributes(element)

    // Empty formatting spans carry no semantics, but an unstyled <mark> is a
    // valid legacy highlight and must survive for the Magic UI reader upgrade.
    if (tag === 'SPAN') {
      const hasAttrs = element.attributes.length > 0
      const hasOnlyText = element.childNodes.length === 1 && element.firstChild?.nodeType === Node.TEXT_NODE
      if (!hasAttrs && hasOnlyText) {
        unwrapElement(element)
      }
    }

    if (tag === 'B') {
      const strong = doc.createElement('strong')
      strong.innerHTML = element.innerHTML
      element.replaceWith(strong)
    } else if (tag === 'I') {
      const em = doc.createElement('em')
      em.innerHTML = element.innerHTML
      element.replaceWith(em)
    }
  }

  normalizeTextNodes(body)
  return body
}

function parseSanitizeRoot(html) {
  const wrapped = `<div data-sanitize-root>${html ?? ''}</div>`
  const doc = new DOMParser().parseFromString(wrapped, 'text/html')
  return doc.querySelector('[data-sanitize-root]')
}

function parseFallbackAttributes(attrs) {
  const entries = []
  const attributePattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  for (const match of attrs.matchAll(attributePattern)) {
    entries.push([match[1], match[2] ?? match[3] ?? match[4] ?? ''])
  }
  return entries
}

function escapeFallbackAttribute(value) {
  return String(value)
    .replace(/&(?!(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);)/gi, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function cleanFallbackAttributes(tagName, attrs) {
  const kept = sanitizeAttributeEntries(tagName, parseFallbackAttributes(attrs))
  return [...kept]
    .map(([name, value]) => ` ${name}="${escapeFallbackAttribute(value)}"`)
    .join('')
}

/** Regex fallback when DOMParser is unavailable (Node translate functions). */
function sanitizeArticleHtmlFallback(html) {
  const source = html ?? ''
  if (typeof source !== 'string' || !source.trim()) return source

  let out = source.replace(/<!--[\s\S]*?-->/g, '')
  out = out.replace(/<![^>]*>|<\?[^>]*>/g, '')

  for (const tag of STRIP_TAGS) {
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(
      new RegExp(`<${escapedTag}\\b[^>]*>[\\s\\S]*?<\\/${escapedTag}\\s*>`, 'gi'),
      '',
    )
  }

  out = out.replace(/<\s*(\/?)\s*([a-z][a-z0-9:-]*)\b([^>]*)>/gi, (match, closing, tag, attrs) => {
    const upper = tag.toUpperCase()
    if (STRIP_TAGS.has(upper)) return ''
    if (!ALLOWED_TAGS.has(upper)) return ''

    const outputTag = upper === 'B' ? 'strong' : upper === 'I' ? 'em' : tag.toLowerCase()
    if (closing) return `</${outputTag}>`
    return `<${outputTag}${cleanFallbackAttributes(upper, attrs)}>`
  })

  return sanitizePlainText(out)
}

function sanitizeArticleHtml(html) {
  const source = html ?? ''
  if (typeof source !== 'string' || !source.trim()) return source

  if (typeof DOMParser === 'undefined') {
    return sanitizeArticleHtmlFallback(source)
  }

  const root = parseSanitizeRoot(source)
  if (!root) return sanitizeArticleHtmlFallback(source)

  sanitizeNodeTree(root)
  return root.innerHTML
}

export {
  sanitizeArticleHtml,
  sanitizeArticleHtmlFallback,
  sanitizePlainText,
}
