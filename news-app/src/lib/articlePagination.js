/** Minimum word count before auto-pagination kicks in. */
export const ARTICLE_PAGE_MIN_WORDS = 1200

/** Target words per page when auto-splitting. */
export const ARTICLE_WORDS_PER_PAGE = 850

function countWords(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length
}

function pageHasMeaningfulContent(html) {
  const source = String(html ?? '')
  if (!source.trim()) return false
  if (countWords(source.replace(/<[^>]+>/g, ' ')) > 0) return true
  return /video-embed|iframe|<img\b/i.test(source)
}

function countWordsInNode(node) {
  if (!node) return 0
  if (node.nodeType === Node.TEXT_NODE) return countWords(node.textContent)
  if (node.nodeType !== Node.ELEMENT_NODE) return 0
  let total = 0
  node.childNodes.forEach((child) => {
    total += countWordsInNode(child)
  })
  return total
}

function isPageBreak(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return false
  if (node.dataset?.pageBreak !== undefined) return true
  if (node.classList?.contains('page-break')) return true
  if (node.tagName === 'HR' && node.getAttribute('data-page-break') !== null) return true
  return false
}

function serializeNodes(nodes) {
  if (!nodes.length) return ''
  if (typeof document === 'undefined') return ''
  const container = document.createElement('div')
  nodes.forEach((node) => container.appendChild(node.cloneNode(true)))
  return container.innerHTML
}

function splitByManualBreaks(children) {
  const pages = []
  let bucket = []

  for (const node of children) {
    if (isPageBreak(node)) {
      if (bucket.length) pages.push(serializeNodes(bucket))
      bucket = []
      continue
    }
    bucket.push(node)
  }

  if (bucket.length) pages.push(serializeNodes(bucket))
  return pages.filter((page) => pageHasMeaningfulContent(page))
}

function autoSplitChildren(children) {
  const pages = []
  let bucket = []
  let bucketWords = 0

  for (const node of children) {
    if (isPageBreak(node)) continue

    const nodeWords = countWordsInNode(node)
    if (bucketWords > 0 && bucketWords + nodeWords > ARTICLE_WORDS_PER_PAGE) {
      pages.push(serializeNodes(bucket))
      bucket = [node]
      bucketWords = nodeWords
    } else {
      bucket.push(node)
      bucketWords += nodeWords
    }
  }

  if (bucket.length) pages.push(serializeNodes(bucket))
  return pages.filter(Boolean)
}

/** Split article HTML into ordered page chunks for multipage reading. */
export function paginateArticleHtml(html) {
  const source = String(html ?? '').trim()
  if (!source) return ['']

  if (typeof document === 'undefined') return [source]

  const doc = new DOMParser().parseFromString(source, 'text/html')
  const children = [...doc.body.childNodes].filter(
    (node) => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
  )

  if (!children.length) return [source]

  const manualPages = splitByManualBreaks(children)
  if (manualPages.length > 1) return manualPages

  const totalWords = countWords(doc.body.textContent)
  if (totalWords < ARTICLE_PAGE_MIN_WORDS) return [source]

  const autoPages = autoSplitChildren(children)
  return autoPages.length > 1 ? autoPages : [source]
}

export function countArticleWords(html) {
  if (typeof document === 'undefined') {
    return countWords(String(html ?? '').replace(/<[^>]+>/g, ' '))
  }
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html')
  return countWords(doc.body.textContent)
}
