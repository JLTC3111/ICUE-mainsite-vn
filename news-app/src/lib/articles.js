import { supabase, STORAGE_BUCKETS } from './supabase'
import { fileExt, readMinutes, uniqueSlug } from './helpers'
import { sanitizeArticleHtml, sanitizePlainText } from '@icue/text/sanitizeArticleHtml'
import { sanitizeSourcesForSave } from './articleSources'
import { articleStoragePath, cleanupArticleStorage } from './articleStorage'
import {
  resolveCoverComparisonForSave,
  enrichCoverComparisonForSave,
} from './mediaComparison'
import {
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

// Prepare uploads without touching any live database row. Article + gallery
// mutations happen in one RPC transaction only after all uploads succeed.
async function prepareMedia(userId, items, session) {
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
      kind: item.kind,
      url: uploaded?.url || item.url,
      storage_path: uploaded?.path || item.storage_path || null,
      poster_url: item.poster_url || null,
      info: item.info ? sanitizePlainText(item.info) : null,
      position: index + 1,
    })
  }

  return { rows, clientToDb }
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
  if (!userId) throw new Error('Sign in to save an article')
  saveSession.slug ||= uniqueSlug(form.title || 'draft')
  const { data: existing, error: readError } = await supabase.from('articles')
    .select('id').eq('id', saveSession.id).maybeSingle()
  if (readError) throw readError
  if (!existing) {
    const { error } = await supabase.from('articles').insert({
      id: saveSession.id,
      slug: saveSession.slug,
      title: sanitizePlainText((form.title || '').trim()),
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
  if (!userId) throw new Error('Sign in to save an article')
  const { data: owner, error: ownerError } = await supabase.from('articles')
    .select('author_id').eq('id', id).single()
  if (ownerError) throw ownerError
  if (!owner?.author_id) throw new Error('Article not found')
  // Admin edits use the article owner's folder. The owner can later remove
  // those assets under the same storage policy as their own uploads.
  const storageUserId = owner.author_id
  let coverUrl = form.coverImageUrl ?? null
  let coverAltUrl = form.coverImageAltUrl ?? null
  if (coverFile) {
    const { url } = await uploadArticleFile(saveSession, storageUserId, coverFile, 'covers')
    coverUrl = url
  }
  if (coverAltFile) {
    const { url } = await uploadArticleFile(saveSession, storageUserId, coverAltFile, 'covers')
    coverAltUrl = url
  }

  const payload = {
    title: sanitizePlainText((form.title || '').trim()),
    subtitle: form.subtitle?.trim() ? sanitizePlainText(form.subtitle.trim()) : null,
    author_name: form.author?.trim() ? sanitizePlainText(form.author.trim()) : null,
    content_html: sanitizeArticleHtml(form.contentHtml || ''),
    content_json: form.contentJson || null,
    cover_image_url: coverUrl,
    cover_image_alt_url: coverAltUrl,
    cover_storage_path: articleStoragePath(coverUrl),
    cover_alt_storage_path: articleStoragePath(coverAltUrl),
    cover_info: form.coverInfo?.trim() ? sanitizePlainText(form.coverInfo.trim()) : null,
    language: form.language || 'vi',
    category: form.category || 'general',
    article_date: form.date || null,
    article_time: form.time || null,
    read_minutes: readMinutes(form.contentHtml),
    sources: sanitizeSourcesForSave(form.sources),
  }
  if (status) payload.status = status
  const { rows, clientToDb } = await prepareMedia(storageUserId, items || [], saveSession)
  payload.cover_comparison = coverComparisonPayload(form.coverComparison, clientToDb, {
    coverUrl,
    coverAltUrl,
    editorImages: items,
  })
  const signature = JSON.stringify([id, payload, rows])
  if (saveSession.signature !== signature) {
    saveSession.signature = signature
    saveSession.saveId = crypto.randomUUID()
  }
  const { data, error } = await supabase.rpc('save_article', {
    p_id: id,
    p_save_id: saveSession.saveId,
    p_payload: payload,
    p_media: rows,
    p_expected_updated_at: saveSession.updatedAt || form.expectedUpdatedAt || null,
  })
  if (error) throw error
  saveSession.updatedAt = data.updated_at
  // The save has succeeded. Cleanup failures must not prompt users to replay
  // an already committed edit; the durable queue will retry independently.
  void cleanupArticleStorage().catch(() => {})
  return data
}

export async function deleteArticle(id) {
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) throw error
  void cleanupArticleStorage().catch(() => {})
}

// Map a DB media row to the editor's working item shape.
export function toEditorMedia(row) {
  return {
    id: row.id,
    dbId: row.id,
    kind: row.kind,
    url: row.url,
    storage_path: row.storage_path,
    poster_url: row.poster_url,
    info: row.info || '',
    isNew: false,
  }
}
