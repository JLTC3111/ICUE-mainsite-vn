const DROP_CAP_MIN_LENGTH = 72
const CHAPTER_LABEL_RE = /^chapter\s+\d+/i

function plainText(node) {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function applyArticleDropCap(container, { enabled = true } = {}) {
  if (!container || !enabled) return

  container.querySelectorAll('.article-dropcap').forEach((node) => {
    node.classList.remove('article-dropcap')
  })

  const lang = container.closest('[lang]')?.getAttribute('lang')
    || document.documentElement.lang
    || ''
  if (lang.startsWith('vi')) return

  const paragraphs = container.querySelectorAll(':scope > p')
  for (const paragraph of paragraphs) {
    const text = plainText(paragraph)
    if (!text) continue
    if (text.length < DROP_CAP_MIN_LENGTH) continue
    if (CHAPTER_LABEL_RE.test(text) && text.length < 48) continue
    paragraph.classList.add('article-dropcap')
    return
  }
}
