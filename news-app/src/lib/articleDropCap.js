const DROP_CAP_MIN_LENGTH = 72

/** Chapter / section labels in EN + VI (and similar short headings). */
const CHAPTER_LABEL_RE = /^(?:chapter|chương|chuong|phần|phan|part|section)\s*[\dIVXLC]+(?:[.:)\-–—]\s*)?/i

function plainText(node) {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function isChapterLabel(text) {
  if (!text) return false
  if (CHAPTER_LABEL_RE.test(text)) return true
  if (text.length <= 24 && /^(?:chương|chuong|chapter|phần|phan)\b/i.test(text)) return true
  return false
}

function isLabelOrSubtitleParagraph(paragraph, text) {
  if (!text) return true
  if (isChapterLabel(text)) return true
  if (text.length < DROP_CAP_MIN_LENGTH) return true

  // TipTap often wraps subtitles as p > span > strong (not direct p > strong).
  const strong = paragraph.querySelector(':scope strong')
  if (strong && plainText(strong) === text) return true

  const em = paragraph.querySelector(':scope em')
  if (em && plainText(em) === text && !paragraph.querySelector(':scope strong')) return true

  const strongOnly = paragraph.querySelector(':scope > strong:only-child')
  if (strongOnly && plainText(strongOnly) === text) return true

  return false
}

function isDropCapCandidate(paragraph, text) {
  if (!text || text.length < DROP_CAP_MIN_LENGTH) return false
  if (isLabelOrSubtitleParagraph(paragraph, text)) return false
  return true
}

export function shouldMarkParagraphAsDropCap(paragraph) {
  return isDropCapCandidate(paragraph, plainText(paragraph))
}

/** Mark the first eligible body paragraph in an HTML fragment (declarative — survives React re-renders). */
export function markDropCapInHtml(html, { enabled = true } = {}) {
  if (!html) return html
  if (typeof document === 'undefined') return html

  const doc = new DOMParser().parseFromString(`<div data-dropcap-root>${html}</div>`, 'text/html')
  const container = doc.querySelector('[data-dropcap-root]')
  if (!container) return html

  container.querySelectorAll('.article-dropcap').forEach((node) => {
    node.classList.remove('article-dropcap')
  })

  if (!enabled) return container.innerHTML

  const paragraphs = container.querySelectorAll(':scope > p')
  for (const paragraph of paragraphs) {
    const text = plainText(paragraph)
    if (!isDropCapCandidate(paragraph, text)) continue
    paragraph.classList.add('article-dropcap')
    break
  }

  return container.innerHTML
}

/** Imperative helper — prefer markDropCapInHtml when React owns the DOM. */
export function applyArticleDropCap(container, { enabled = true } = {}) {
  if (!container) return

  container.querySelectorAll('.article-dropcap').forEach((node) => {
    node.classList.remove('article-dropcap')
  })

  if (!enabled) return

  const paragraphs = container.querySelectorAll(':scope > p')
  for (const paragraph of paragraphs) {
    const text = plainText(paragraph)
    if (!isDropCapCandidate(paragraph, text)) continue
    paragraph.classList.add('article-dropcap')
    return
  }
}
