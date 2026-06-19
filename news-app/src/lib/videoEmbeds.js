// Detect YouTube / Vimeo URLs and turn them into responsive iframe embeds.

const PROVIDERS = [
  {
    id: 'youtube',
    test: (url) => /(?:youtube\.com|youtu\.be)/i.test(url),
    embedUrl(url) {
      try {
        const u = new URL(url)
        if (u.hostname === 'youtu.be') {
          const id = u.pathname.slice(1).split('/')[0]
          return id ? `https://www.youtube.com/embed/${id}` : null
        }
        const fromQuery = u.searchParams.get('v')
        if (fromQuery) return `https://www.youtube.com/embed/${fromQuery}`
        const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/)
        if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`
        const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/)
        if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`
      } catch { /* invalid */ }
      return null
    },
  },
  {
    id: 'vimeo',
    test: (url) => /vimeo\.com/i.test(url),
    embedUrl(url) {
      try {
        const u = new URL(url)
        const id = u.pathname.match(/\/(\d+)/)?.[1]
        return id ? `https://player.vimeo.com/video/${id}` : null
      } catch { /* invalid */ }
      return null
    },
  },
]

export function getVideoEmbed(rawUrl) {
  if (!rawUrl?.trim()) return null
  try {
    let url = rawUrl.trim()
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    for (const provider of PROVIDERS) {
      if (!provider.test(url)) continue
      const embedUrl = provider.embedUrl(url)
      if (embedUrl) return { provider: provider.id, embedUrl, originalUrl: url }
    }
  } catch { /* invalid url */ }
  return null
}

function makeEmbedFigure(doc, info) {
  const figure = doc.createElement('figure')
  figure.className = 'video-embed'
  figure.dataset.provider = info.provider

  const wrap = doc.createElement('div')
  wrap.className = 'video-embed__frame'

  const iframe = doc.createElement('iframe')
  iframe.src = info.embedUrl
  iframe.setAttribute('allowfullscreen', '')
  iframe.setAttribute('loading', 'lazy')
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  iframe.setAttribute('title', `${info.provider} video`)
  iframe.setAttribute(
    'allow',
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
  )

  wrap.appendChild(iframe)
  figure.appendChild(wrap)
  return figure
}

// Replace video links inside article HTML with embedded players.
export function embedVideosInHtml(html) {
  const source = (html ?? '').toString()
  if (!source.trim()) return source

  const doc = new DOMParser().parseFromString(source, 'text/html')

  doc.querySelectorAll('a[href]').forEach((anchor) => {
    const info = getVideoEmbed(anchor.getAttribute('href'))
    if (!info) return
    anchor.replaceWith(makeEmbedFigure(doc, info))
  })

  doc.querySelectorAll('p').forEach((p) => {
    if (p.querySelector('a, iframe, figure, video')) return
    const text = p.textContent?.trim()
    if (!text) return
    const match = text.match(/^(https?:\/\/\S+)$/i)
    if (!match) return
    const info = getVideoEmbed(match[1])
    if (!info) return
    p.replaceWith(makeEmbedFigure(doc, info))
  })

  return doc.body.innerHTML
}

// Collect unique external video URLs from article HTML (for a preview strip).
export function extractVideoLinks(html) {
  const found = new Map()
  if (!html?.trim()) return []

  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('a[href]').forEach((a) => {
    const info = getVideoEmbed(a.getAttribute('href'))
    if (info && !found.has(info.embedUrl)) found.set(info.embedUrl, info)
  })

  doc.querySelectorAll('p').forEach((p) => {
    const text = p.textContent?.trim()
    const match = text?.match(/^(https?:\/\/\S+)$/i)
    if (!match) return
    const info = getVideoEmbed(match[1])
    if (info && !found.has(info.embedUrl)) found.set(info.embedUrl, info)
  })

  return [...found.values()]
}
