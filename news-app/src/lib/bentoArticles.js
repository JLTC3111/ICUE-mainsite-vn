import { isCategory, categoryColor } from './categories'
import { resolveArticleCoverComparison } from './mediaComparison'
import {
  bentoLayout,
  withBentoLayout,
  chunkBentoItems,
  resolveBentoSpans,
} from './bentoLayout'

const PLACEHOLDER_COVER = `${import.meta.env.BASE_URL}favicon.svg`

export function buildBentoItems(
  articles,
  normalizeUnicode,
  titleTranslations = {},
  isTitlePending = () => false,
  subtitleTranslations = {},
) {
  return articles.map((article, index) => {
    const titlePending = isTitlePending(article.id)
    const title = titlePending
      ? ''
      : (titleTranslations[article.id] || normalizeUnicode(article.title))
    const comparison = resolveArticleCoverComparison(article)
    const coverUrl = article.cover_image_url || comparison?.before?.url || null

    return {
      id: article.slug || article.id || String(index),
      articleId: article.id,
      slug: article.slug,
      language: article.language,
      img: coverUrl || PLACEHOLDER_COVER,
      comparison,
      title,
      subtitle: normalizeUnicode(subtitleTranslations[article.id] || article.subtitle || ''),
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

export { PLACEHOLDER_COVER, categoryColor, bentoLayout, withBentoLayout, chunkBentoItems, resolveBentoSpans }
