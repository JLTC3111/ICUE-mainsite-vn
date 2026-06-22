/** VPS market codes → display labels (public API, no auth). */
export const VN_INDEX_CODES = {
  10: { symbol: 'VNINDEX', label: 'VN-Index', exchange: 'HOSE' },
  11: { symbol: 'VN30', label: 'VN30', exchange: 'HOSE' },
  '02': { symbol: 'HNX', label: 'HNX', exchange: 'HNX' },
  '03': { symbol: 'UPCOM', label: 'UPCOM', exchange: 'UPCOM' },
}

/** Liquid tickers shown after the main VN indexes in the marquee. */
export const VN_STOCK_TICKERS = [
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
  const changePct = parseOt(row.ot, price, open)
  return {
    kind: 'index',
    symbol: meta.symbol,
    label: meta.label,
    exchange: meta.exchange,
    price,
    open,
    high,
    low,
    changePct,
    volume: Number(row.vol) || 0,
    value: Number(row.value) || 0,
    updatedAt: row.time || null,
    priceScale: 1,
  }
}

/** VPS prices are quoted in thousands of VND. */
function vpsStockToQuote(item, meta) {
  const scale = 1000
  const ref = (Number(item.r) || 0) * scale
  let price = (Number(item.lastPrice) || 0) * scale
  const open = (Number(item.openPrice) || 0) * scale
  const high = (Number(item.highPrice) || 0) * scale
  const low = (Number(item.lowPrice) || 0) * scale
  if (!price && ref) price = ref
  const changePct = ref ? ((price - ref) / ref) * 100 : 0
  return {
    kind: 'stock',
    symbol: meta.symbol,
    label: meta.label,
    exchange: meta.exchange,
    price,
    open: open || ref,
    high: high || price,
    low: low || price,
    changePct,
    volume: Number(item.lot) || 0,
    value: 0,
    updatedAt: item.time || null,
    priceScale: scale,
  }
}

function ssiRowToQuote(row) {
  const symbol = row.stockSymbol
  const meta = VN_STOCK_TICKERS.find((t) => t.symbol === symbol)
  if (!meta) return null
  const price = Number(row.matchedPrice) || Number(row.refPrice) || 0
  const open = Number(row.openPrice) || Number(row.refPrice) || price
  const high = Number(row.highest) || price
  const low = Number(row.lowest) || price
  const changePct = Number(row.priceChangePercent) || 0
  return {
    kind: 'stock',
    symbol,
    label: meta.label,
    exchange: meta.exchange,
    price,
    open,
    high,
    low,
    changePct,
    volume: Number(row.nmTotalTradedQty) || 0,
    value: Number(row.nmTotalTradedValue) || 0,
    updatedAt: row.tradingDate || null,
    priceScale: 1,
  }
}

async function fetchVpsIndexes() {
  const codes = Object.keys(VN_INDEX_CODES).join(',')
  const res = await fetch(`${VPS_INDEX_URL}/${codes}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ICUE-Newsroom/1.0)' },
  })
  if (!res.ok) throw new Error('vps indexes')
  const json = await res.json()
  if (!Array.isArray(json)) throw new Error('vps indexes shape')
  return json.map(normalizeIndexRow).filter(Boolean)
}

async function fetchVpsStocks(tickers) {
  if (!tickers.length) return []
  const res = await fetch(`${VPS_STOCK_URL}/${tickers.map((t) => t.symbol).join(',')}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ICUE-Newsroom/1.0)' },
  })
  if (!res.ok) throw new Error('vps stocks')
  const json = await res.json()
  if (!Array.isArray(json)) throw new Error('vps stocks shape')
  const bySym = Object.fromEntries(tickers.map((t) => [t.symbol, t]))
  return json
    .map((item) => {
      const meta = bySym[item.sym]
      return meta ? vpsStockToQuote(item, meta) : null
    })
    .filter(Boolean)
}

async function fetchSsiStocks() {
  const exchanges = ['hose', 'hnx', 'upcom']
  const wanted = new Set(VN_STOCK_TICKERS.map((t) => t.symbol))
  const found = []
  for (const ex of exchanges) {
    const res = await fetch(`${SSI_STOCK_URL}/${ex}?boardId=MAIN&page=1&pageSize=200`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ICUE-Newsroom/1.0)' },
    })
    if (!res.ok) continue
    const json = await res.json()
    for (const row of json?.data || []) {
      if (wanted.has(row.stockSymbol)) {
        const q = ssiRowToQuote(row)
        if (q) found.push(q)
      }
    }
  }
  return VN_STOCK_TICKERS
    .map((t) => found.find((q) => q.symbol === t.symbol))
    .filter(Boolean)
}

export async function fetchVnMarketQuotes() {
  let indexes = []
  let stocks = []

  try {
    indexes = await fetchVpsIndexes()
  } catch {
    indexes = []
  }

  try {
    stocks = await fetchVpsStocks(VN_STOCK_TICKERS)
  } catch {
    try {
      stocks = await fetchSsiStocks()
    } catch {
      stocks = []
    }
  }

  const data = [...indexes, ...stocks]
  if (!data.length) throw new Error('vn market unavailable')
  return data
}
