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

const STRIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'XML', 'O:P', 'FONT'])

const BLOCK_ALIGN_TAGS = new Set(['P', 'H2', 'H3', 'BLOCKQUOTE', 'LI', 'TD', 'TH', 'DIV'])

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

function cleanElementAttributes(element) {
  const tag = element.tagName
  if (!tag) return

  const serialized = cleanStyleAttribute(element.getAttribute('style') || '', tag)

  for (const attr of [...element.attributes]) {
    const name = attr.name.toLowerCase()
    if (name === 'style' || name === 'class' || name === 'lang' || name === 'face' || name === 'size') {
      element.removeAttribute(attr.name)
    }
    if (name === 'data-magic-highlight' || name.startsWith('on') || name.startsWith('data-pm-')) {
      element.removeAttribute(attr.name)
    }
  }

  if (serialized) element.setAttribute('style', serialized)
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
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.nodeValue) node.nodeValue = sanitizePlainText(node.nodeValue)
  }
}

function sanitizeNodeTree(root) {
  const doc = root.ownerDocument || root
  const body = root.nodeType === Node.DOCUMENT_NODE ? root.body : root

  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT)
  const toProcess = []
  while (walker.nextNode()) toProcess.push(walker.currentNode)

  for (const element of toProcess) {
    const tag = element.tagName

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

function cleanFallbackAttributes(tagName, attrs) {
  const upper = tagName.toUpperCase()
  let cleaned = attrs
    .replace(/\sclass=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\slang=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\sface=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\ssize=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\son[a-z]+=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\sdata-pm-[a-z-]+=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\sdata-magic-highlight(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, '')

  cleaned = cleaned.replace(/\sstyle=(?:"([^"]*)"|'([^']*)')/gi, (match, dbl, sgl) => {
    const styleText = dbl ?? sgl ?? ''
    const kept = cleanStyleAttribute(styleText, upper)
    return kept ? ` style="${kept}"` : ''
  })

  return cleaned
}

/** Regex fallback when DOMParser is unavailable (Node translate functions). */
function sanitizeArticleHtmlFallback(html) {
  const source = html ?? ''
  if (typeof source !== 'string' || !source.trim()) return source

  let out = source
  out = out.replace(/<\/?(?:o:p|xml|meta|link|style|script|font)\b[^>]*>/gi, '')

  out = out.replace(/<([a-z0-9]+)\b([^>]*)>/gi, (match, tag, attrs) => {
    const upper = tag.toUpperCase()
    if (STRIP_TAGS.has(upper)) return ''
    if (!ALLOWED_TAGS.has(upper)) return match
    return `<${tag}${cleanFallbackAttributes(tag, attrs)}>`
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
  if (!root) return source

  sanitizeNodeTree(root)
  return root.innerHTML
}

export {
  sanitizeArticleHtml,
  sanitizeArticleHtmlFallback,
  sanitizePlainText,
}
