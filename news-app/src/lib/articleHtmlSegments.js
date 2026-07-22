function readFigureMeta(figureHtml) {
  if (typeof document === 'undefined') return null
  const doc = new DOMParser().parseFromString(figureHtml, 'text/html')
  const fig = doc.querySelector('figure.video-embed--dialog')
  if (!fig) return null

  const embedUrl = fig.getAttribute('data-embed-url') || fig.dataset.embedUrl
  const thumbUrl = fig.getAttribute('data-thumb-url') || fig.dataset.thumbUrl
  if (!embedUrl || !thumbUrl) return null

  return {
    embedUrl,
    thumbUrl,
    thumbAlt: fig.getAttribute('data-thumb-alt') || fig.dataset.thumbAlt || 'YouTube video',
  }
}

/** Split processed article HTML into static HTML chunks and YouTube dialog video slots. */
export function splitArticleHtmlSegments(html) {
  const source = String(html ?? '')
  if (!source.trim()) return [{ kind: 'html', html: '' }]
  if (!source.includes('video-embed--dialog')) return [{ kind: 'html', html: source }]

  const segments = []
  let lastIndex = 0
  const figureRe = /<figure\b(?=[^>]*\bvideo-embed--dialog\b)[^>]*>[\s\S]*?<\/figure>/gi

  for (const match of source.matchAll(figureRe)) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'html', html: source.slice(lastIndex, match.index) })
    }

    const meta = readFigureMeta(match[0])
    if (meta) {
      segments.push({ kind: 'video', ...meta })
    } else {
      segments.push({ kind: 'html', html: match[0] })
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < source.length) {
    segments.push({ kind: 'html', html: source.slice(lastIndex) })
  }

  return segments.length ? segments : [{ kind: 'html', html: source }]
}

export function embedUrlWithAutoplay(embedUrl) {
  if (!embedUrl) return ''
  const join = embedUrl.includes('?') ? '&' : '?'
  return `${embedUrl}${join}autoplay=1&rel=0`
}
