import { isCategory, categoryColor } from './categories'

const PLACEHOLDER_COVER = `${import.meta.env.BASE_URL}favicon.svg`

const BENTO_SPANS = [
  { cols: 1, rows: 1 },
  { cols: 2, rows: 1 },
  { cols: 1, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 2, rows: 2 },
  { cols: 1, rows: 1 },
]

function hashSeed(value, index) {
  return (value || String(index)).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

export function bentoLayout(slug, index, total) {
  const seed = hashSeed(slug, index)

  if (total <= 2) {
    return { cols: 2, rows: 1 }
  }

  if (total === 3) {
    return [
      { cols: 2, rows: 2 },
      { cols: 1, rows: 1 },
      { cols: 1, rows: 2 },
    ][index % 3]
  }

  return BENTO_SPANS[seed % BENTO_SPANS.length]
}

export function buildBentoItems(articles, normalizeUnicode, titleTranslations = {}, isTitlePending = () => false) {
  return articles.map((article, index) => {
    const titlePending = isTitlePending(article.id)
    const title = titlePending
      ? ''
      : (titleTranslations[article.id] || normalizeUnicode(article.title))
    return {
      id: article.slug || article.id || String(index),
      articleId: article.id,
      slug: article.slug,
      language: article.language,
      img: article.cover_image_url || PLACEHOLDER_COVER,
      title,
      titlePending,
      category:
        isCategory(article.category) && article.category !== 'general'
          ? article.category
          : null,
      date: article.published_at || article.article_date || '',
      viewCount: article.view_count ?? 0,
    }
  })
}

export function withBentoLayout(items) {
  return items.map((item, index) => {
    const { cols, rows } = bentoLayout(item.slug, index, items.length)
    return {
      ...item,
      spanCols: cols,
      spanRows: rows,
    }
  })
}

export { PLACEHOLDER_COVER, categoryColor }

export function chunkBentoItems(items, pageSize) {
  const slides = []
  for (let i = 0; i < items.length; i += pageSize) {
    slides.push(items.slice(i, i + pageSize))
  }
  return slides
}
