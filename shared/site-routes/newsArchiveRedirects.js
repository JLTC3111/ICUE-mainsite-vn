/** Legacy news-archive URLs that now enter the native React routes. */

export const NEWS_ARCHIVE_LIST_REDIRECTS = {
  '/src/pages/News.html': '/news-archive',
  '/legacy/pages/News.html': '/news-archive',
  '/legacy-embed/pages/News.html': '/news-archive',
  '/news-archive/': '/news-archive',
}

export const NEWS_ARCHIVE_ARTICLE_PATHS = [
  '/src/pages/article_template.html',
  '/legacy/pages/article_template.html',
  '/legacy-embed/pages/article_template.html',
]

export function newsArchiveArticlePath(id) {
  return `/news-archive/${id}`
}

export function resolveNewsArchiveRedirect(pathname, search = '') {
  if (NEWS_ARCHIVE_LIST_REDIRECTS[pathname]) {
    return NEWS_ARCHIVE_LIST_REDIRECTS[pathname]
  }

  if (!NEWS_ARCHIVE_ARTICLE_PATHS.includes(pathname)) return null

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const id = String(params.get('id') || '').trim()
  if (/^\d+$/.test(id)) return newsArchiveArticlePath(id)
  return '/news-archive'
}
