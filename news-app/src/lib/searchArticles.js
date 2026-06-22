import { plainExcerpt } from './helpers'
import { isCategory } from './categories'
import i18n, { SUPPORTED_LANGUAGES } from './i18n'

function categoryLabels(slug) {
  return SUPPORTED_LANGUAGES.map(({ code }) =>
    i18n.getResource(code, 'translation', `categories.${slug}`, { defaultValue: '' }),
  )
}

/** Build a lowercase haystack that spans article fields and all locale category labels. */
export function articleSearchHaystack(article) {
  const cat = isCategory(article.category) && article.category !== 'general' ? article.category : null
  const parts = [
    article.title,
    article.subtitle,
    article.author_name,
    article.slug,
    plainExcerpt(article.content_html, 12000),
  ]
  if (cat) {
    parts.push(cat, ...categoryLabels(cat))
  }
  return parts.filter(Boolean).join(' ').toLowerCase()
}

/** Filter articles by keyword(s). Matches across all languages — not limited to UI locale. */
export function searchArticles(articles, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return articles
  const terms = q.split(/\s+/).filter(Boolean)
  return articles.filter((article) => {
    const haystack = articleSearchHaystack(article)
    return terms.every((term) => haystack.includes(term))
  })
}
