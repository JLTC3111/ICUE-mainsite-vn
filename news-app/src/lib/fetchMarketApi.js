/** Fetch JSON from our market proxy; rejects HTML SPA fallthrough responses. */
export async function fetchMarketApi(url) {
  const res = await fetch(url)
  const contentType = res.headers.get('content-type') || ''
  if (!res.ok || !contentType.includes('application/json')) {
    throw new Error('market api unavailable')
  }
  const data = await res.json()
  if (!Array.isArray(data) || !data.length) {
    throw new Error('market api empty')
  }
  return data
}
