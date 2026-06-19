// On-demand machine translation for articles.
//
// Uses Google's free, key-less `gtx` translate endpoint with automatic source
// language detection (sl=auto), so an article written in ANY language can be
// translated into the reader's chosen language. Nothing here runs until the
// reader explicitly clicks the Translate button and picks a language.
//
// HTML content is translated by walking only the text nodes of the parsed
// document, so headings, bold/italic, links, images and embedded media keep
// their structure — we only swap the human-readable text.

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single'

// gtx rejects very long `q` values; keep each request comfortably under the limit.
const MAX_CHARS = 1800
const CONCURRENCY = 6

// Translated results are memoised per (target language + source text) so toggling
// between languages or re-opening a translation is instant and avoids extra calls.
const cache = new Map()

function cacheKey(target, text) {
  return `${target}::${text}`
}

async function requestTranslation(text, target) {
  const url = `${ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(
    target,
  )}&dt=t&q=${encodeURIComponent(text)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Translate request failed (${res.status})`)

  const data = await res.json()
  // Shape: [ [ [translatedChunk, originalChunk, ...], ... ], ... ]
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Unexpected translate response')
  }
  return data[0].map((seg) => (seg && seg[0]) || '').join('')
}

// Split long strings on sentence/whitespace boundaries so we never exceed MAX_CHARS.
function splitForRequest(text) {
  if (text.length <= MAX_CHARS) return [text]
  const parts = []
  let remaining = text
  while (remaining.length > MAX_CHARS) {
    let cut = remaining.lastIndexOf(' ', MAX_CHARS)
    if (cut <= 0) cut = MAX_CHARS
    parts.push(remaining.slice(0, cut))
    remaining = remaining.slice(cut)
  }
  if (remaining) parts.push(remaining)
  return parts
}

export async function translateText(text, target) {
  const source = (text ?? '').toString()
  if (!source.trim()) return source

  const key = cacheKey(target, source)
  if (cache.has(key)) return cache.get(key)

  const chunks = splitForRequest(source)
  const translatedChunks = await Promise.all(
    chunks.map((chunk) => requestTranslation(chunk, target)),
  )
  const result = translatedChunks.join('')
  cache.set(key, result)
  return result
}

// Run async tasks with a bounded number of in-flight requests.
async function mapWithLimit(items, limit, task) {
  const results = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const current = index++
      results[current] = await task(items[current], current)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return results
}

export async function translateHtml(html, target) {
  const source = (html ?? '').toString()
  if (!source.trim()) return source

  const key = cacheKey(`html:${target}`, source)
  if (cache.has(key)) return cache.get(key)

  const doc = new DOMParser().parseFromString(source, 'text/html')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)

  const textNodes = []
  while (walker.nextNode()) {
    const node = walker.currentNode
    const parentTag = node.parentNode?.nodeName?.toLowerCase()
    if (parentTag === 'script' || parentTag === 'style') continue
    if (node.nodeValue && node.nodeValue.trim()) textNodes.push(node)
  }

  await mapWithLimit(textNodes, CONCURRENCY, async (node) => {
    try {
      const original = node.nodeValue
      // Preserve leading/trailing whitespace that the editor relies on.
      const leading = original.match(/^\s*/)?.[0] ?? ''
      const trailing = original.match(/\s*$/)?.[0] ?? ''
      const translated = await translateText(original.trim(), target)
      node.nodeValue = `${leading}${translated}${trailing}`
    } catch {
      // Leave the original text in place if a single node fails to translate.
    }
  })

  const result = doc.body.innerHTML
  cache.set(key, result)
  return result
}

// Translate the parts of an article that a reader actually sees.
export async function translateArticle(article, target) {
  const [title, subtitle, content_html] = await Promise.all([
    translateText(article.title || '', target),
    article.subtitle ? translateText(article.subtitle, target) : '',
    translateHtml(article.content_html || '', target),
  ])
  return { title, subtitle, content_html }
}
