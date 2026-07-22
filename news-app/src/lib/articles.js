import { supabase, STORAGE_BUCKETS } from './supabase'
import { fileExt, readMinutes, uniqueSlug } from './helpers'
import { normalizeDeep, normalizeHtmlUnicode } from '@icue/text/normalizeUnicode'
import { normalizeSources, sanitizeSourcesForSave } from './articleSources'
import {
  normalizeMediaComparisonField,
  normalizeCoverComparisonField,
  resolveCoverComparisonForSave,
  enrichCoverComparisonForSave,
} from './mediaComparison'

// cover_comparison requires migration 20260722160000_article_cover_comparison.sql on Supabase.
const ARTICLE_SELECT = `
  id, slug, title, subtitle, content_html, content_json, cover_image_url, cover_image_alt_url,
  status, language, category, article_date, article_time, read_minutes, published_at,
  view_count, created_at, updated_at, author_id, author_name, sources, media_comparison, cover_comparison,
  author:profiles!articles_author_id_fkey ( id, display_name, full_name, avatar_url ),
  media:article_media ( id, kind, url, storage_path, poster_url, position )
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

function isMissingMediaComparison(error) {
  const missing = getMissingColumn(error)
  return missing === 'media_comparison' || missing === 'cover_comparison'
}

async function runArticleSelect(runQuery) {
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

function normalizeArticle(article) {
  if (!article) return article
  const normalized = normalizeDeep(article)
  if (normalized.content_html) {
    normalized.content_html = normalizeHtmlUnicode(normalized.content_html)
  }
  const views = Number(normalized.view_count)
  normalized.view_count = Number.isFinite(views) ? Math.max(0, Math.floor(views)) : 0
  normalized.sources = normalizeSources(normalized.sources)
  normalized.media_comparison = normalizeMediaComparisonField(normalized.media_comparison)
  normalized.cover_comparison = normalizeCoverComparisonField(normalized.cover_comparison)
  return normalized
}

// Upload a single File to a public bucket under the user's folder. Returns
// { url, path }. Storage RLS requires the first path segment to be the user id.
export async function uploadFile(bucket, userId, file, subdir = 'media') {
  const path = `${userId}/${subdir}/${crypto.randomUUID()}.${fileExt(file.name)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function uploadAvatar(userId, file) {
  return uploadFile(STORAGE_BUCKETS.avatars, userId, file, 'avatar')
}

export async function fetchPublishedArticles({ limit = 24, language } = {}) {
  const data = await runArticleSelect((select) => {
    let q = supabase
      .from('articles')
      .select(select)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (language) q = q.eq('language', language)
    return q
  })
  return (data ?? []).map(normalizeArticle)
}

export async function fetchMyArticles(userId) {
  const data = await runArticleSelect((select) =>
    supabase
      .from('articles')
      .select(select)
      .eq('author_id', userId)
      .order('updated_at', { ascending: false }),
  )
  return (data ?? []).map(normalizeArticle)
}

export async function fetchArticleBySlug(slug) {
  const data = await runArticleSelect((select) =>
    supabase.from('articles').select(select).eq('slug', slug).maybeSingle(),
  )
  return normalizeArticle(data)
}

export async function fetchArticleById(id) {
  const data = await runArticleSelect((select) =>
    supabase.from('articles').select(select).eq('id', id).maybeSingle(),
  )
  return normalizeArticle(data)
}

// Persist media: upload any new files, then reconcile rows for the article.
async function syncMedia(articleId, userId, items, originalItems = []) {
  const keptIds = new Set(items.filter((m) => !m.isNew && m.dbId).map((m) => m.dbId))
  const clientToDb = new Map()
  // Delete removed rows (+ their storage objects)
  const toDelete = originalItems.filter((m) => m.dbId && !keptIds.has(m.dbId))
  if (toDelete.length) {
    await supabase.from('article_media').delete().in('id', toDelete.map((m) => m.dbId))
    const paths = toDelete.map((m) => m.storage_path).filter(Boolean)
    if (paths.length) await supabase.storage.from(STORAGE_BUCKETS.media).remove(paths)
  }

  // Insert new items (preserving order via position)
  let position = 0
  for (const m of items) {
    position += 1
    if (m.isNew && m.file) {
      const { url, path } = await uploadFile(STORAGE_BUCKETS.media, userId, m.file)
      const { data, error } = await supabase
        .from('article_media')
        .insert({
          article_id: articleId,
          kind: m.kind,
          url,
          storage_path: path,
          position,
        })
        .select('id')
        .single()
      if (error) throw error
      clientToDb.set(m.id, data.id)
    } else if (m.dbId) {
      clientToDb.set(m.id, m.dbId)
      await supabase.from('article_media').update({ position }).eq('id', m.dbId)
    }
  }

  return clientToDb
}

async function saveCoverComparison(
  articleId,
  comparison,
  clientToDb,
  { coverUrl, coverAltUrl, editorImages },
) {
  const resolved = resolveCoverComparisonForSave(
    comparison,
    clientToDb,
    Boolean(coverUrl),
    Boolean(coverAltUrl),
  )
  const payload = enrichCoverComparisonForSave(
    resolved,
    coverUrl,
    coverAltUrl,
    editorImages,
    clientToDb,
  )
  const { error } = await supabase
    .from('articles')
    .update({ cover_comparison: payload })
    .eq('id', articleId)
  if (error && !isMissingMediaComparison(error)) throw error
}

// Create a brand-new article (Component 2).
export async function createArticle({ form, items, coverFile, coverAltFile, userId, status }) {
  let coverUrl = form.coverImageUrl || null
  let coverAltUrl = form.coverImageAltUrl || null
  if (coverFile) {
    const { url } = await uploadFile(STORAGE_BUCKETS.media, userId, coverFile, 'covers')
    coverUrl = url
  }
  if (coverAltFile) {
    const { url } = await uploadFile(STORAGE_BUCKETS.media, userId, coverAltFile, 'covers')
    coverAltUrl = url
  }

  const payload = {
    slug: uniqueSlug(form.title),
    title: form.title.trim(),
    subtitle: form.subtitle?.trim() || null,
    content_html: form.contentHtml || '',
    content_json: form.contentJson || null,
    cover_image_url: coverUrl,
    cover_image_alt_url: coverAltUrl,
    author_id: userId,
    author_name: form.author?.trim() || null,
    status,
    language: form.language || 'vi',
    category: form.category || 'general',
    article_date: form.date || null,
    article_time: form.time || null,
    read_minutes: readMinutes(form.contentHtml),
    published_at: status === 'published' ? new Date().toISOString() : null,
    sources: sanitizeSourcesForSave(form.sources),
  }

  const { data, error } = await supabase.from('articles').insert(payload).select('id, slug').single()
  if (error) throw error

  const clientToDb = await syncMedia(data.id, userId, items)
  await saveCoverComparison(data.id, form.coverComparison, clientToDb, {
    coverUrl,
    coverAltUrl,
    editorImages: items,
  })
  return data
}

// Update an existing article (Component 3).
export async function updateArticle({ id, form, items, originalItems, coverFile, coverAltFile, userId, status }) {
  let coverUrl = form.coverImageUrl ?? null
  let coverAltUrl = form.coverImageAltUrl ?? null
  if (coverFile) {
    const { url } = await uploadFile(STORAGE_BUCKETS.media, userId, coverFile, 'covers')
    coverUrl = url
  }
  if (coverAltFile) {
    const { url } = await uploadFile(STORAGE_BUCKETS.media, userId, coverAltFile, 'covers')
    coverAltUrl = url
  }

  const payload = {
    title: form.title.trim(),
    subtitle: form.subtitle?.trim() || null,
    author_name: form.author?.trim() || null,
    content_html: form.contentHtml || '',
    content_json: form.contentJson || null,
    cover_image_url: coverUrl,
    cover_image_alt_url: coverAltUrl,
    language: form.language || 'vi',
    category: form.category || 'general',
    article_date: form.date || null,
    article_time: form.time || null,
    read_minutes: readMinutes(form.contentHtml),
    sources: sanitizeSourcesForSave(form.sources),
  }
  if (status) {
    payload.status = status
    if (status === 'published') payload.published_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('articles')
    .update(payload)
    .eq('id', id)
    .select('id, slug')
    .single()
  if (error) throw error

  const clientToDb = await syncMedia(id, userId, items, originalItems)
  await saveCoverComparison(id, form.coverComparison, clientToDb, {
    coverUrl,
    coverAltUrl,
    editorImages: items,
  })
  return data
}

export async function deleteArticle(id) {
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) throw error
}

// Map a DB media row to the editor's working item shape.
export function toEditorMedia(row) {
  return {
    id: row.id,
    dbId: row.id,
    kind: row.kind,
    url: row.url,
    storage_path: row.storage_path,
    isNew: false,
  }
}
