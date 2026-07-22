// Detect YouTube / Vimeo URLs and turn them into embed placeholders or players.

function parseYoutubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('/')[0] || null
    }
    const fromQuery = u.searchParams.get('v')
    if (fromQuery) return fromQuery
    const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/)
    if (embedMatch) return embedMatch[1]
    const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/)
    if (shortsMatch) return shortsMatch[1]
  } catch {
    /* invalid */
  }
  return null
}

function youtubeThumbnail(videoId) {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null
}

const PROVIDERS = [
  {
    id: 'youtube',
    test: (url) => /(?:youtube\.com|youtu\.be)/i.test(url),
    videoId(url) {
      return parseYoutubeId(url)
    },
    embedUrl(url) {
      const id = parseYoutubeId(url)
      return id ? `https://www.youtube.com/embed/${id}` : null
    },
    thumbnailUrl(url) {
      return youtubeThumbnail(parseYoutubeId(url))
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
      } catch {
        /* invalid */
      }
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
      if (!embedUrl) continue
      const videoId = provider.videoId?.(url) ?? null
      const thumbnailUrl = provider.thumbnailUrl?.(url) ?? null
      return {
        provider: provider.id,
        embedUrl,
        originalUrl: url,
        videoId,
        thumbnailUrl,
      }
    }
  } catch {
    /* invalid url */
  }
  return null
}

function makeInlineEmbedFigure(doc, info) {
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

function makeDialogEmbedFigure(doc, info, label = '') {
  const figure = doc.createElement('figure')
  figure.className = 'video-embed video-embed--dialog'
  figure.dataset.provider = info.provider
  figure.dataset.embedUrl = info.embedUrl
  figure.dataset.thumbUrl = info.thumbnailUrl
  if (info.videoId) figure.dataset.videoId = info.videoId
  if (label) figure.dataset.thumbAlt = label

  const img = doc.createElement('img')
  img.src = info.thumbnailUrl
  img.alt = label || 'YouTube video'
  img.className = 'video-embed__fallback-thumb'
  img.setAttribute('loading', 'lazy')
  img.setAttribute('decoding', 'async')
  figure.appendChild(img)

  return figure
}

function makeEmbedFigure(doc, info, label = '') {
  if (info.provider === 'youtube' && info.thumbnailUrl) {
    return makeDialogEmbedFigure(doc, info, label)
  }
  return makeInlineEmbedFigure(doc, info)
}

function labelFromAnchor(anchor) {
  const text = anchor.textContent?.trim()
  if (!text || /^https?:\/\//i.test(text)) return 'YouTube video'
  return text
}

function replaceNodeWithEmbed(doc, node, info, label) {
  node.replaceWith(makeEmbedFigure(doc, info, label))
}

function replaceAnchorWithEmbed(doc, anchor, info) {
  const label = labelFromAnchor(anchor)
  const parent = anchor.parentElement

  if (parent?.tagName === 'P') {
    const paragraphText = parent.textContent?.replace(/\s+/g, ' ').trim()
    const anchorText = anchor.textContent?.replace(/\s+/g, ' ').trim()
    const href = anchor.getAttribute('href')?.trim()
    const onlyLink = paragraphText === anchorText
      || paragraphText === href
      || parent.querySelectorAll('a').length === 1

    if (onlyLink) {
      parent.replaceWith(makeEmbedFigure(doc, info, label))
      return
    }
  }

  replaceNodeWithEmbed(doc, anchor, info, label)
}

function upgradeLegacyYoutubeIframe(doc, iframe) {
  const src = iframe.getAttribute('src') || ''
  const match = src.match(/\/embed\/([^/?&]+)/i)
  if (!match) return false

  const videoId = match[1]
  const info = {
    provider: 'youtube',
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    thumbnailUrl: youtubeThumbnail(videoId),
    videoId,
  }

  const replacement = makeDialogEmbedFigure(doc, info, 'YouTube video')
  const figure = iframe.closest('figure.video-embed')
  if (figure) figure.replaceWith(replacement)
  else iframe.replaceWith(replacement)
  return true
}

// Replace video links inside article HTML with embed placeholders or players.
export function embedVideosInHtml(html) {
  const source = (html ?? '').toString()
  if (!source.trim()) return source

  const doc = new DOMParser().parseFromString(source, 'text/html')

  doc.querySelectorAll('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]').forEach((iframe) => {
    upgradeLegacyYoutubeIframe(doc, iframe)
  })

  doc.querySelectorAll('a[href]').forEach((anchor) => {
    const info = getVideoEmbed(anchor.getAttribute('href'))
    if (!info) return
    replaceAnchorWithEmbed(doc, anchor, info)
  })

  doc.querySelectorAll('p, li, blockquote').forEach((node) => {
    if (node.querySelector('a, iframe, figure, video, img')) return
    const text = node.textContent?.trim()
    if (!text) return
    const match = text.match(/^(https?:\/\/\S+)$/i)
    if (!match) return
    const info = getVideoEmbed(match[1])
    if (!info) return
    node.replaceWith(makeEmbedFigure(doc, info, 'YouTube video'))
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

export { youtubeThumbnail, parseYoutubeId }
