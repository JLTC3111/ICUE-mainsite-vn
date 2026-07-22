import { supabase, STORAGE_BUCKETS } from './supabase'
import { fileExt, readMinutes, uniqueSlug } from './helpers'
import { normalizeDeep, normalizeHtmlUnicode } from '@icue/text/normalizeUnicode'
import { normalizeSources, sanitizeSourcesForSave } from './articleSources'
import {
  normalizeMediaComparison,
  resolveMediaComparisonForSave,
} from './mediaComparison'

const ARTICLE_SELECT = `
  id, slug, title, subtitle, content_html, content_json, cover_image_url,
  status, language, category, article_date, article_time, read_minutes, published_at,
  view_count, created_at, updated_at, author_id, author_name, sources, media_comparison,
  author:profiles!articles_author_id_fkey ( id, display_name, full_name, avatar_url ),
  media:article_media ( id, kind, url, storage_path, poster_url, position )
`

const ARTICLE_SELECT_LEGACY = `
  id, slug, title, subtitle, content_html, content_json, cover_image_url,
  status, language, category, article_date, article_time, read_minutes, published_at,
  created_at, updated_at, author_id, author_name, sources, media_comparison,
  author:profiles!articles_author_id_fkey ( id, display_name, full_name, avatar_url ),
  media:article_media ( id, kind, url, storage_path, poster_url, position )
`

function isMissingViewCount(error) {
  const msg = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return error?.code === '42703' || msg.includes('view_count')
}

function isMissingSources(error) {
  const msg = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return error?.code === '42703' || msg.includes('sources')
}

function isMissingMediaComparison(error) {
  const msg = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return error?.code === '42703' || msg.includes('media_comparison')
}

const ARTICLE_SELECT_NO_MEDIA_COMPARISON = `
  id, slug, title, subtitle, content_html, content_json, cover_image_url,
  status, language, category, article_date, article_time, read_minutes, published_at,
  view_count, created_at, updated_at, author_id, author_name, sources,
  author:profiles!articles_author_id_fkey ( id, display_name, full_name, avatar_url ),
  media:article_media ( id, kind, url, storage_path, poster_url, position )
`

const ARTICLE_SELECT_LEGACY_NO_MEDIA_COMPARISON = `
  id, slug, title, subtitle, content_html, content_json, cover_image_url,
  status, language, category, article_date, article_time, read_minutes, published_at,
  created_at, updated_at, author_id, author_name, sources,
  author:profiles!articles_author_id_fkey ( id, display_name, full_name, avatar_url ),
  media:article_media ( id, kind, url, storage_path, poster_url, position )
`

const ARTICLE_SELECT_NO_SOURCES = `
  id, slug, title, subtitle, content_html, content_json, cover_image_url,
  status, language, category, article_date, article_time, read_minutes, published_at,
  view_count, created_at, updated_at, author_id, author_name,
  author:profiles!articles_author_id_fkey ( id, display_name, full_name, avatar_url ),
  media:article_media ( id, kind, url, storage_path, poster_url, position )
`

const ARTICLE_SELECT_LEGACY_NO_SOURCES = `
  id, slug, title, subtitle, content_html, content_json, cover_image_url,
  status, language, category, article_date, article_time, read_minutes, published_at,
  created_at, updated_at, author_id, author_name,
  author:profiles!articles_author_id_fkey ( id, display_name, full_name, avatar_url ),
  media:article_media ( id, kind, url, storage_path, poster_url, position )
`

async function runArticleSelect(runQuery) {
  let { data, error } = await runQuery(ARTICLE_SELECT)
  if (error && isMissingViewCount(error)) {
    ;({ data, error } = await runQuery(ARTICLE_SELECT_LEGACY))
  }
  if (error && isMissingSources(error)) {
    ;({ data, error } = await runQuery(ARTICLE_SELECT_NO_SOURCES))
    if (error && isMissingViewCount(error)) {
      ;({ data, error } = await runQuery(ARTICLE_SELECT_LEGACY_NO_SOURCES))
    }
  }
  if (error && isMissingMediaComparison(error)) {
    ;({ data, error } = await runQuery(ARTICLE_SELECT_NO_MEDIA_COMPARISON))
    if (error && isMissingViewCount(error)) {
      ;({ data, error } = await runQuery(ARTICLE_SELECT_LEGACY_NO_MEDIA_COMPARISON))
    }
    if (error && isMissingSources(error)) {
      ;({ data, error } = await runQuery(ARTICLE_SELECT_LEGACY_NO_SOURCES))
    }
  }
  if (error) throw error
  return data
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
  normalized.media_comparison = normalizeMediaComparison(normalized.media_comparison)
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

async function saveMediaComparison(articleId, comparison, clientToDb) {
  const resolved = resolveMediaComparisonForSave(comparison, clientToDb)
  const { error } = await supabase
    .from('articles')
    .update({ media_comparison: resolved })
    .eq('id', articleId)
  if (error && !isMissingMediaComparison(error)) throw error
}

// Create a brand-new article (Component 2).
export async function createArticle({ form, items, coverFile, userId, status }) {
  let coverUrl = form.coverImageUrl || null
  if (coverFile) {
    const { url } = await uploadFile(STORAGE_BUCKETS.media, userId, coverFile, 'covers')
    coverUrl = url
  }

  const payload = {
    slug: uniqueSlug(form.title),
    title: form.title.trim(),
    subtitle: form.subtitle?.trim() || null,
    content_html: form.contentHtml || '',
    content_json: form.contentJson || null,
    cover_image_url: coverUrl,
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
  await saveMediaComparison(data.id, form.mediaComparison, clientToDb)
  return data
}

// Update an existing article (Component 3).
export async function updateArticle({ id, form, items, originalItems, coverFile, userId, status }) {
  let coverUrl = form.coverImageUrl ?? null
  if (coverFile) {
    const { url } = await uploadFile(STORAGE_BUCKETS.media, userId, coverFile, 'covers')
    coverUrl = url
  }

  const payload = {
    title: form.title.trim(),
    subtitle: form.subtitle?.trim() || null,
    author_name: form.author?.trim() || null,
    content_html: form.contentHtml || '',
    content_json: form.contentJson || null,
    cover_image_url: coverUrl,
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
  await saveMediaComparison(id, form.mediaComparison, clientToDb)
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
