const VN_INDEX_CODES = {
  10: { symbol: 'VNINDEX', label: 'VN-Index', exchange: 'HOSE' },
  11: { symbol: 'VN30', label: 'VN30', exchange: 'HOSE' },
  '02': { symbol: 'HNX', label: 'HNX', exchange: 'HNX' },
  '03': { symbol: 'UPCOM', label: 'UPCOM', exchange: 'UPCOM' },
}

const VN_STOCK_TICKERS = [
  { symbol: 'FPT', label: 'FPT', exchange: 'HOSE' },
  { symbol: 'VCB', label: 'VCB', exchange: 'HOSE' },
  { symbol: 'HPG', label: 'HPG', exchange: 'HOSE' },
  { symbol: 'VNM', label: 'VNM', exchange: 'HOSE' },
  { symbol: 'VIC', label: 'VIC', exchange: 'HOSE' },
  { symbol: 'SSI', label: 'SSI', exchange: 'HOSE' },
  { symbol: 'SHS', label: 'SHS', exchange: 'HNX' },
  { symbol: 'PVS', label: 'PVS', exchange: 'HNX' },
  { symbol: 'VEA', label: 'VEA', exchange: 'UPCOM' },
  { symbol: 'BVS', label: 'BVS', exchange: 'UPCOM' },
]

const VPS_INDEX_URL = 'https://bgapidatafeed.vps.com.vn/getlistindexdetail'
const VPS_STOCK_URL = 'https://bgapidatafeed.vps.com.vn/getliststockdata'
const SSI_STOCK_URL = 'https://iboard-query.ssi.com.vn/stock/exchange'
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ICUE-Newsroom/1.0)' }

function parseOt(ot, cIndex, oIndex) {
  const parts = String(ot || '').split('|')
  let changePct = parseFloat(String(parts[1]).replace('%', '')) || 0
  if (cIndex < oIndex) changePct = -Math.abs(changePct)
  return changePct
}

function normalizeIndexRow(row) {
  const meta = VN_INDEX_CODES[String(row.mc)] || VN_INDEX_CODES[row.mc]
  if (!meta) return null
  const open = Number(row.oIndex) || 0
  const price = Number(row.cIndex) || open
  const high = Number(row.hIndex ?? row.highIndex ?? row.high) || Math.max(open, price)
  const low = Number(row.lIndex ?? row.lowIndex ?? row.low) || Math.min(open, price)
  return {
    kind: 'index',
    symbol: meta.symbol,
    label: meta.label,
    exchange: meta.exchange,
    price,
    open,
    high,
    low,
    changePct: parseOt(row.ot, price, open),
    volume: Number(row.vol) || 0,
    value: Number(row.value) || 0,
    updatedAt: row.time || null,
    priceScale: 1,
  }
}

function vpsStockToQuote(item, meta) {
  const scale = 1000
  const ref = (Number(item.r) || 0) * scale
  let price = (Number(item.lastPrice) || 0) * scale
  const open = (Number(item.openPrice) || 0) * scale
  const high = (Number(item.highPrice) || 0) * scale
  const low = (Number(item.lowPrice) || 0) * scale
  if (!price && ref) price = ref
  return {
    kind: 'stock',
    symbol: meta.symbol,
    label: meta.label,
    exchange: meta.exchange,
    price,
    open: open || ref,
    high: high || price,
    low: low || price,
    changePct: ref ? ((price - ref) / ref) * 100 : 0,
    volume: Number(item.lot) || 0,
    value: 0,
    updatedAt: item.time || null,
    priceScale: scale,
  }
}

function ssiRowToQuote(row) {
  const meta = VN_STOCK_TICKERS.find((t) => t.symbol === row.stockSymbol)
  if (!meta) return null
  const price = Number(row.matchedPrice) || Number(row.refPrice) || 0
  return {
    kind: 'stock',
    symbol: meta.symbol,
    label: meta.label,
    exchange: meta.exchange,
    price,
    open: Number(row.openPrice) || price,
    high: Number(row.highest) || price,
    low: Number(row.lowest) || price,
    changePct: Number(row.priceChangePercent) || 0,
    volume: Number(row.nmTotalTradedQty) || 0,
    value: Number(row.nmTotalTradedValue) || 0,
    updatedAt: row.tradingDate || null,
    priceScale: 1,
  }
}

async function fetchVpsIndexes() {
  const codes = Object.keys(VN_INDEX_CODES).join(',')
  const res = await fetch(`${VPS_INDEX_URL}/${codes}`, { headers: UA })
  if (!res.ok) throw new Error('vps indexes')
  const json = await res.json()
  if (!Array.isArray(json)) throw new Error('vps indexes shape')
  return json.map(normalizeIndexRow).filter(Boolean)
}

async function fetchVpsStocks() {
  const res = await fetch(
    `${VPS_STOCK_URL}/${VN_STOCK_TICKERS.map((t) => t.symbol).join(',')}`,
    { headers: UA },
  )
  if (!res.ok) throw new Error('vps stocks')
  const json = await res.json()
  if (!Array.isArray(json)) throw new Error('vps stocks shape')
  const bySym = Object.fromEntries(VN_STOCK_TICKERS.map((t) => [t.symbol, t]))
  return json.map((item) => (bySym[item.sym] ? vpsStockToQuote(item, bySym[item.sym]) : null)).filter(Boolean)
}

async function fetchSsiStocks() {
  const wanted = new Set(VN_STOCK_TICKERS.map((t) => t.symbol))
  const found = []
  for (const ex of ['hose', 'hnx', 'upcom']) {
    const res = await fetch(`${SSI_STOCK_URL}/${ex}?boardId=MAIN&page=1&pageSize=200`, { headers: UA })
    if (!res.ok) continue
    const json = await res.json()
    for (const row of json?.data || []) {
      if (wanted.has(row.stockSymbol)) {
        const q = ssiRowToQuote(row)
        if (q) found.push(q)
      }
    }
  }
  return VN_STOCK_TICKERS.map((t) => found.find((q) => q.symbol === t.symbol)).filter(Boolean)
}

exports.handler = async () => {
  try {
    let indexes = []
    let stocks = []
    try { indexes = await fetchVpsIndexes() } catch { /* fallback below */ }
    try { stocks = await fetchVpsStocks() } catch {
      try { stocks = await fetchSsiStocks() } catch { /* empty */ }
    }
    const data = [...indexes, ...stocks]
    if (!data.length) {
      return { statusCode: 502, body: JSON.stringify({ error: 'unavailable' }) }
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    }
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'unavailable' }) }
  }
}
