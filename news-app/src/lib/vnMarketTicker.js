import { fetchMarketApi } from './fetchMarketApi'

const CACHE_KEY = 'icue_vn_market_quotes'
const CACHE_MS = 60 * 1000

const API_URL = `${import.meta.env.BASE_URL}api/market-quotes-vn`

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_MS) return null
    return data
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
  } catch { /* quota */ }
}

export async function fetchVnMarketQuotes() {
  const cached = readCache()
  if (cached?.length) return cached

  try {
    data = await fetchMarketApi(API_URL)
  } catch {
    if (cached) return cached
    throw new Error('vn market unavailable')
  }

  writeCache(data)
  return data
}
