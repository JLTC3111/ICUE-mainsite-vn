const INDEXES = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'Nasdaq' },
  { symbol: '^DJI', label: 'Dow Jones' },
  { symbol: '^GDAXI', label: 'DAX' },
  { symbol: 'GC=F', label: 'Gold' },
  { symbol: 'SI=F', label: 'Silver' },
  { symbol: 'CL=F', label: 'Oil' },
]

async function fetchQuote({ symbol, label }) {
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
}

exports.handler = async (event = {}) => {
  if (event.queryStringParameters?.scope === 'vn') {
    return require('./market-quotes-vn').handler(event)
  }

  try {
    const results = await Promise.allSettled(INDEXES.map(fetchQuote))
    const data = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value)

    if (!data.length) {
      return { statusCode: 502, body: JSON.stringify({ error: 'unavailable' }) }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    }
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'unavailable' }) }
  }
}
