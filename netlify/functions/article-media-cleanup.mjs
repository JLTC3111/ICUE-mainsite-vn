import { withDeadline } from '../../shared/resilience/requests.js'

// Scheduled functions cannot be invoked through their public URL.
export const config = { schedule: '*/15 * * * *' }

export default async function cleanup() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Article cleanup requires Functions-only Supabase service credentials')
  const base = new URL(url).origin
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
  const request = (endpoint, body, signal) => fetch(`${base}${endpoint}`, {
    method: 'POST', headers, body: JSON.stringify(body), signal,
  })
  await withDeadline(async signal => {
    const pending = await request('/rest/v1/rpc/pending_article_storage_cleanup', {}, signal)
    if (!pending.ok) throw new Error(`Cleanup queue read failed (${pending.status})`)
    const rows = await pending.json()
    const paths = []
    const external = []
    for (const row of rows) {
      const expected = `${base}/storage/v1/object/public/article-media/${row.path}`
      // Old covers may be external URLs: never delete a local file for those.
      if (row.source_url === expected && !row.path.split('/').includes('..')) paths.push(row.path)
      else external.push(row.path)
    }
    if (paths.length) {
      const response = await fetch(`${base}/storage/v1/object/article-media`, {
        method: 'DELETE', headers, body: JSON.stringify({ prefixes: paths }), signal,
      })
      if (!response.ok) throw new Error(`Article storage removal failed (${response.status})`)
      // Service-role removal is authoritative, including objects already gone
      // when a prior successful removal lost its response.
      await response.arrayBuffer()
    }
    const complete = [...paths, ...external]
    if (complete.length) {
      const finished = await request('/rest/v1/rpc/finish_article_storage_cleanup', { p_paths: complete }, signal)
      if (!finished.ok) throw new Error(`Cleanup acknowledgement failed (${finished.status})`)
      await finished.arrayBuffer()
    }
  }, { timeoutMs: 25_000 })
}
