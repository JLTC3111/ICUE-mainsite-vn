/** Index symbols fetched via our /api/market-quotes proxy (avoids browser CORS). */
export const MARKET_INDEXES = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'Nasdaq' },
  { symbol: '^DJI', label: 'Dow Jones' },
  { symbol: '^GDAXI', label: 'DAX' },
]

export async function fetchYahooQuotes(indexes = MARKET_INDEXES) {
  const results = await Promise.allSettled(
    indexes.map(async ({ symbol, label }) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ICUE-Newsroom/1.0)' },
      })
      if (!res.ok) throw new Error(`quote ${symbol}`)
      const json = await res.json()
      const meta = json?.chart?.result?.[0]?.meta
      if (!meta) throw new Error(`no meta ${symbol}`)
      const price = meta.regularMarketPrice ?? meta.previousClose
      const prev = meta.chartPreviousClose ?? meta.previousClose ?? price
      const changePct = prev ? ((price - prev) / prev) * 100 : 0
      return {
        symbol,
        label: label || meta.shortName || symbol,
        price,
        changePct,
      }
    }),
  )

  const data = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)

  if (!data.length) throw new Error('market data unavailable')
  return data
}
