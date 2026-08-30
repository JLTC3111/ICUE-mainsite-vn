import { normalizeDeep, normalizeHtmlUnicode } from '@icue/text/normalizeUnicode'
import { sanitizeArticleHtml } from '@icue/text/sanitizeArticleHtml'
import { normalizeSources } from './articleSources'
import {
  normalizeMediaComparisonField,
  normalizeCoverComparisonField,
} from './mediaComparison'

// cover_comparison requires migration 20260722160000_article_cover_comparison.sql on Supabase.
const ARTICLE_SELECT = `
  id, slug, title, subtitle, content_html, content_json, cover_image_url, cover_image_alt_url, cover_info,
  status, language, category, article_date, article_time, read_minutes, published_at,
  view_count, created_at, updated_at, author_id, author_name, sources, media_comparison, cover_comparison,
  author:profiles!articles_author_id_fkey ( id, display_name, full_name, avatar_url ),
  media:article_media ( id, kind, url, storage_path, poster_url, info, position )
`

const MISSING_COLUMNS_KEY = 'icue:articles:missing-columns:v3'

function getKnownMissingColumns() {
  if (typeof sessionStorage === 'undefined') return new Set()
  try {
    return new Set(JSON.parse(sessionStorage.getItem(MISSING_COLUMNS_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function markColumnMissing(column) {
  if (typeof sessionStorage === 'undefined') return
  const missing = getKnownMissingColumns()
  missing.add(column)
  sessionStorage.setItem(MISSING_COLUMNS_KEY, JSON.stringify([...missing]))
}

function buildArticleSelect() {
  let select = ARTICLE_SELECT.trim()
  for (const column of getKnownMissingColumns()) {
    select = stripColumn(select, column)
  }
  return select
}

const SCHEMA_COLUMN_ALIASES = {
  cover_comparison: ['cover_comparison'],
  cover_image_alt_url: ['cover_image_alt_url', 'cover image alt url'],
  media_comparison: ['media_comparison'],
  view_count: ['view_count'],
  sources: ['sources'],
  poster_url: ['poster_url'],
  info: ['info'],
}

function isSchemaColumnError(error) {
  const code = error?.code
  return code === '42703' || code === 'PGRST204'
}

function getMissingColumn(error) {
  const msg = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  for (const [column, aliases] of Object.entries(SCHEMA_COLUMN_ALIASES)) {
    if (aliases.some((alias) => msg.includes(alias))) return column
  }
  return null
}

function stripColumn(select, column) {
  return select
    .replace(new RegExp(`,\\s*${column}\\b`, 'g'), '')
    .replace(new RegExp(`\\b${column}\\s*,`, 'g'), '')
}

export function isMissingMediaComparison(error) {
  const missing = getMissingColumn(error)
  return missing === 'media_comparison' || missing === 'cover_comparison'
}

export async function runArticleSelect(runQuery) {
  let select = buildArticleSelect()

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await runQuery(select)
    if (!error) return data

    const missing = getMissingColumn(error)
    if (!missing || !isSchemaColumnError(error)) throw error

    markColumnMissing(missing)
    const nextSelect = stripColumn(select, missing)
    if (nextSelect === select) throw error
    select = nextSelect
  }

  throw new Error('Article select exceeded schema fallback attempts')
}

export function normalizeArticle(article) {
  if (!article) return article
  const normalized = normalizeDeep(article)
  if (normalized.content_html) {
    normalized.content_html = normalizeHtmlUnicode(sanitizeArticleHtml(normalized.content_html))
  }
  const views = Number(normalized.view_count)
  normalized.view_count = Number.isFinite(views) ? Math.max(0, Math.floor(views)) : 0
  normalized.sources = normalizeSources(normalized.sources)
  normalized.media_comparison = normalizeMediaComparisonField(normalized.media_comparison)
  normalized.cover_comparison = normalizeCoverComparisonField(normalized.cover_comparison)
  return normalized
}
