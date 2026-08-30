import { normalizeArticle, runArticleSelect } from './articleReadModel'
import { publicSelect } from './publicSupabase'

export async function fetchPublishedArticles({ limit = 24, language } = {}) {
  const safeLimit = Math.min(120, Math.max(1, Number(limit) || 24))
  const data = await runArticleSelect((select) => publicSelect('articles', {
    select,
    status: 'eq.published',
    order: 'published_at.desc.nullslast',
    limit: safeLimit,
    ...(language ? { language: `eq.${language}` } : {}),
  }))

  return (data ?? []).map(normalizeArticle)
}
