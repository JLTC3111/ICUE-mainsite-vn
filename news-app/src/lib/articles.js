import { supabase, STORAGE_BUCKETS } from './supabase'
import { fileExt, readMinutes, uniqueSlug } from './helpers'
import { sanitizeArticleHtml, sanitizePlainText } from '@icue/text/sanitizeArticleHtml'
import { sanitizeSourcesForSave } from './articleSources'
import {
  resolveCoverComparisonForSave,
  enrichCoverComparisonForSave,
} from './mediaComparison'
import {
  isMissingMediaComparison,
  normalizeArticle,
  runArticleSelect,
} from './articleReadModel'

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

/**
 * Articles for the dashboard.
 *
 * Admins pass `includeAll` to list everyone's articles, since RLS already lets
 * them edit any article — without this they had the permission but no way to
 * reach another author's work. Authors always see only their own.
 */
export async function fetchMyArticles(userId, { includeAll = false, signal } = {}) {
  const data = await runArticleSelect((select) => {
    const query = supabase.from('articles').select(select)
    return (includeAll ? query : query.eq('author_id', userId))
      .order('updated_at', { ascending: false })
      .abortSignal(signal)
  })
  return (data ?? []).map(normalizeArticle)
}

export async function fetchArticleBySlug(slug, { signal } = {}) {
  const data = await runArticleSelect((select) =>
    supabase.from('articles').select(select).eq('slug', slug).maybeSingle().abortSignal(signal),
  )
  return normalizeArticle(data)
}

export async function fetchArticleById(id, { signal } = {}) {
  const data = await runArticleSelect((select) =>
    supabase.from('articles').select(select).eq('id', id).maybeSingle().abortSignal(signal),
  )
  return normalizeArticle(data)
}

// One session per editor. Retain identities even when a request commits at the
// server but its response is lost, so a manual retry resumes the same save.
export function createArticleSaveSession() {
  return { id: crypto.randomUUID(), slug: null, uploads: new WeakMap(), mediaIds: new Map() }
}

async function uploadArticleFile(session, userId, file, subdir = 'media') {
  let saved = session.uploads.get(file)
  if (!saved) {
    saved = { path: `${userId}/${subdir}/${crypto.randomUUID()}.${fileExt(file.name)}` }
    session.uploads.set(file, saved)
  }
  if (!saved.url) {
    const bucket = supabase.storage.from(STORAGE_BUCKETS.media)
    const { error } = await bucket.upload(saved.path, file, {
      cacheControl: '31536000',
      upsert: true,
      contentType: file.type || undefined,
    })
    if (error) throw error
    saved.url = bucket.getPublicUrl(saved.path).data.publicUrl
  }
  return saved
}

// Read the current rows on each attempt: the previous request may have saved
// some of them before losing connectivity. Upload files before removing rows.
async function syncMedia(articleId, userId, items, session) {
  const { data: current, error: readError } = await supabase.from('article_media')
    .select('id, storage_path').eq('article_id', articleId)
  if (readError) throw readError
  const existingIds = new Set((current || []).map((row) => row.id))
  const rows = []
  const clientToDb = new Map()

  for (const [index, item] of items.entries()) {
    let id = item.dbId
    let uploaded
    if (item.isNew && item.file) {
      if (!session.mediaIds.has(item.id)) session.mediaIds.set(item.id, crypto.randomUUID())
      id = session.mediaIds.get(item.id)
      uploaded = await uploadArticleFile(session, userId, item.file)
    }
    if (!id) continue
    clientToDb.set(item.id, id)
    rows.push({
      id,
      article_id: articleId,
      info: item.info || null,
      position: index + 1,
      ...(uploaded ? { kind: item.kind, url: uploaded.url, storage_path: uploaded.path } : {}),
    })
  }

  const keptIds = new Set(rows.map((row) => row.id))
  const toDelete = (current || []).filter((row) => !keptIds.has(row.id))
  if (toDelete.length) {
    const { error: deleteError } = await supabase.from('article_media').delete()
      .eq('article_id', articleId).in('id', toDelete.map((row) => row.id))
    if (deleteError) throw deleteError
  }

  for (const row of rows) {
    // Avoid INSERT ... ON CONFLICT: the media-cap BEFORE INSERT trigger also
    // runs for conflicts and would reject retries of a full gallery.
    const query = existingIds.has(row.id)
      ? supabase.from('article_media').update(row).eq('id', row.id).eq('article_id', articleId)
      : supabase.from('article_media').insert(row)
    const { error } = await query
    if (error) throw error
  }

  const paths = toDelete.map((row) => row.storage_path).filter(Boolean)
  if (paths.length) await supabase.storage.from(STORAGE_BUCKETS.media).remove(paths)
  return clientToDb
}

function coverComparisonPayload(
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
  return enrichCoverComparisonForSave(
    resolved,
    coverUrl,
    coverAltUrl,
    editorImages,
    clientToDb,
  )
}

// Create a brand-new article (Component 2).
export async function createArticle({ form, items, coverFile, coverAltFile, userId, status, saveSession = createArticleSaveSession() }) {
  saveSession.slug ||= uniqueSlug(form.title)
  const { data: existing, error: readError } = await supabase.from('articles')
    .select('id').eq('id', saveSession.id).maybeSingle()
  if (readError) throw readError
  if (!existing) {
    const { error } = await supabase.from('articles').insert({
      id: saveSession.id,
      slug: saveSession.slug,
      title: sanitizePlainText(form.title.trim()),
      content_html: sanitizeArticleHtml(form.contentHtml || ''),
      author_id: userId,
      status: 'draft',
    })
    if (error) throw error
  }
  return updateArticle({
    id: saveSession.id, form, items, coverFile, coverAltFile, userId, status, saveSession,
  })
}

// Update an existing article (Component 3).
export async function updateArticle({ id, form, items, coverFile, coverAltFile, userId, status, saveSession = createArticleSaveSession() }) {
  let coverUrl = form.coverImageUrl ?? null
  let coverAltUrl = form.coverImageAltUrl ?? null
  if (coverFile) {
    const { url } = await uploadArticleFile(saveSession, userId, coverFile, 'covers')
    coverUrl = url
  }
  if (coverAltFile) {
    const { url } = await uploadArticleFile(saveSession, userId, coverAltFile, 'covers')
    coverAltUrl = url
  }

  const payload = {
    title: sanitizePlainText(form.title.trim()),
    subtitle: form.subtitle?.trim() ? sanitizePlainText(form.subtitle.trim()) : null,
    author_name: form.author?.trim() ? sanitizePlainText(form.author.trim()) : null,
    content_html: sanitizeArticleHtml(form.contentHtml || ''),
    content_json: form.contentJson || null,
    cover_image_url: coverUrl,
    cover_image_alt_url: coverAltUrl,
    cover_info: form.coverInfo?.trim() ? sanitizePlainText(form.coverInfo.trim()) : null,
    language: form.language || 'vi',
    category: form.category || 'general',
    article_date: form.date || null,
    article_time: form.time || null,
    read_minutes: readMinutes(form.contentHtml),
    sources: sanitizeSourcesForSave(form.sources),
  }
  if (status) {
    payload.status = status
    // Only stamp published_at on first publish — never overwrite on later updates.
    if (status === 'published') {
      const { data: existing, error: existingError } = await supabase
        .from('articles')
        .select('published_at')
        .eq('id', id)
        .single()
      if (existingError) throw existingError
      if (!existing?.published_at) {
        payload.published_at = new Date().toISOString()
      }
    }
  }

  const clientToDb = await syncMedia(id, userId, items, saveSession)
  payload.cover_comparison = coverComparisonPayload(form.coverComparison, clientToDb, {
    coverUrl,
    coverAltUrl,
    editorImages: items,
  })
  // Publication is the final database write, after every media upload and row
  // succeeds. A failed save leaves a new article private and safe to retry.
  const save = () => supabase.from('articles').update(payload).eq('id', id).select('id, slug').single()
  let { data, error } = await save()
  if (error && isMissingMediaComparison(error)) {
    delete payload.cover_comparison
    ;({ data, error } = await save())
  }
  if (error) throw error
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
    info: row.info || '',
    isNew: false,
  }
}
