import { supabase, STORAGE_BUCKETS } from './supabase'

// Only our own bucket URLs identify deletable files. External cover URLs never
// authorize deletion of a similarly named object in the newsroom bucket.
export function articleStoragePath(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const marker = `/storage/v1/object/public/${STORAGE_BUCKETS.media}/`
    const start = parsed.pathname.indexOf(marker)
    if (start !== 0 || parsed.search || parsed.hash) return null
    const path = decodeURIComponent(parsed.pathname.slice(marker.length))
    if (!path || path.split('/').includes('..')) return null
    const canonical = supabase.storage.from(STORAGE_BUCKETS.media).getPublicUrl(path).data.publicUrl
    return new URL(canonical).href === parsed.href ? path : null
  } catch {
    return null
  }
}

// Cleanup is committed to a queue with the article mutation. Failed removals
// remain pending for the scheduled service worker or the next explicit save.
export async function cleanupArticleStorage() {
  const { data: candidates, error } = await supabase.rpc('pending_article_storage_cleanup')
  if (error) throw error
  const paths = (candidates || [])
    .filter(row => articleStoragePath(row.source_url) === row.path)
    .map(row => row.path)
  if (!paths.length) return
  const { data: removed, error: removeError } = await supabase.storage.from(STORAGE_BUCKETS.media).remove(paths)
  if (removeError) throw removeError
  // RLS can silently filter a remove request. Acknowledge only confirmed files;
  // the service worker also handles objects already gone after a lost response.
  const confirmed = (removed || []).map(row => row.name).filter(name => paths.includes(name))
  if (confirmed.length) {
    const { error: finishError } = await supabase.rpc('finish_article_storage_cleanup', { p_paths: confirmed })
    if (finishError) throw finishError
  }
}
