import { supabase, STORAGE_BUCKETS } from './supabase'
import { fileExt, readMinutes, uniqueSlug } from './helpers'
import { normalizeDeep } from '@icue/text/normalizeUnicode'

const ARTICLE_SELECT = `
  id, slug, title, subtitle, content_html, content_json, cover_image_url,
  status, language, category, article_date, article_time, read_minutes, published_at,
  created_at, updated_at, author_id, author_name,
  author:profiles!articles_author_id_fkey ( id, display_name, full_name, avatar_url ),
  media:article_media ( id, kind, url, storage_path, poster_url, position )
`

function normalizeArticle(article) {
  return article ? normalizeDeep(article) : article
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
  let q = supabase
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (language) q = q.eq('language', language)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(normalizeArticle)
}

export async function fetchMyArticles(userId) {
  const { data, error } = await supabase
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('author_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(normalizeArticle)
}

export async function fetchArticleBySlug(slug) {
  const { data, error } = await supabase
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return normalizeArticle(data)
}

export async function fetchArticleById(id) {
  const { data, error } = await supabase
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return normalizeArticle(data)
}

// Persist media: upload any new files, then reconcile rows for the article.
async function syncMedia(articleId, userId, items, originalItems = []) {
  const keptIds = new Set(items.filter((m) => !m.isNew && m.dbId).map((m) => m.dbId))
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
      await supabase.from('article_media').insert({
        article_id: articleId,
        kind: m.kind,
        url,
        storage_path: path,
        position,
      })
    } else if (m.dbId) {
      await supabase.from('article_media').update({ position }).eq('id', m.dbId)
    }
  }
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
  }

  const { data, error } = await supabase.from('articles').insert(payload).select('id, slug').single()
  if (error) throw error

  await syncMedia(data.id, userId, items)
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

  await syncMedia(id, userId, items, originalItems)
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
