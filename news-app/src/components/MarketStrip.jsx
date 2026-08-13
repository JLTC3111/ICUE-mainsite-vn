import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchMarketQuotes } from '../lib/marketTicker'
import { fetchVnMarketQuotes } from '../lib/vnMarketTicker'
import { usePerformanceProfile } from '../context/PerformanceProfileContext'
import './MarketStrip.css'

/**
 * One 38px row in place of the two stacked tickers.
 *
 * The fetchers are untouched and still return everything they always did — the
 * strip renders the six instruments that fit the 1360px width budget. Adding to
 * these lists pushes the row past its clip, so drop from the tail (Oil first)
 * rather than shrinking the type below 12.5px.
 */
const VN_SYMBOLS = ['VNINDEX', 'VN30', 'HNX']
const GLOBAL_SYMBOLS = ['^GSPC', 'GC=F', 'CL=F']
const GLOBAL_LABEL_KEYS = {
  'GC=F': 'market.gold',
  'CL=F': 'market.oil',
}

const VN_POLL_MS = 60 * 1000
const GLOBAL_POLL_MS = 5 * 60 * 1000

function useQuoteFeed(fetcher, pollMs, { paused, tabVisible }) {
  const [quotes, setQuotes] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!tabVisible) return undefined

    let active = true
    const load = () => {
      fetcher()
        .then((data) => {
          if (!active) return
          setQuotes(data)
          setStatus('ready')
        })
        .catch(() => active && setStatus('error'))
    }

    load()
    if (paused) return () => { active = false }

    const id = setInterval(load, pollMs)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [fetcher, pollMs, paused, tabVisible])

  return { quotes, status }
}

/** Requested symbols, in the requested order, skipping any the feed omitted. */
function pickQuotes(quotes, symbols) {
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]))
  return symbols.map((symbol) => bySymbol.get(symbol)).filter(Boolean)
}

const PRICE_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 }

function Quote({ quote, locale, position, label = quote.label }) {
  const up = quote.changePct >= 0
  return (
    <span
      className={`market-strip__quote market-strip__quote--${position}${up ? ' is-up' : ' is-down'}`}
    >
      <b className="market-strip__name">{label}</b>
      <span className="market-strip__price">
        {quote.price.toLocaleString(locale, PRICE_FORMAT)}
      </span>
      <span className="market-strip__change">
        {up ? '▲' : '▼'} {Math.abs(quote.changePct).toLocaleString(locale, PRICE_FORMAT)}%
      </span>
    </span>
  )
}

function MarketGroups({ t, locale, vnQuotes, globalQuotes, clone = false }) {
  return (
    <div
      className={`market-strip__inner${clone ? ' market-strip__inner--clone' : ''}`}
      aria-hidden={clone || undefined}
    >
      {vnQuotes.length > 0 && (
        <div className="market-strip__group market-strip__group--vn">
          <span className="market-strip__label">{t('market.vnLabel')}</span>
          {vnQuotes.map((quote, index) => (
            <Quote key={quote.symbol} quote={quote} locale={locale} position={index + 1} />
          ))}
        </div>
      )}

      {vnQuotes.length > 0 && globalQuotes.length > 0 && (
        <span className="market-strip__divider" aria-hidden="true" />
      )}

      {globalQuotes.length > 0 && (
        <div className="market-strip__group market-strip__group--global">
          <span className="market-strip__label">{t('market.label')}</span>
          {globalQuotes.map((quote, index) => (
            <Quote
              key={quote.symbol}
              quote={quote}
              locale={locale}
              position={index + 1}
              label={GLOBAL_LABEL_KEYS[quote.symbol]
                ? t(GLOBAL_LABEL_KEYS[quote.symbol])
                : quote.label}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MarketStrip() {
  const { t, i18n } = useTranslation()
  const { pauseTickers } = usePerformanceProfile()
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  )

  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const vn = useQuoteFeed(fetchVnMarketQuotes, VN_POLL_MS, { paused: pauseTickers, tabVisible })
  const global = useQuoteFeed(fetchMarketQuotes, GLOBAL_POLL_MS, { paused: pauseTickers, tabVisible })

  const locale = i18n.resolvedLanguage === 'vi' ? 'vi-VN' : 'en-US'
  const vnQuotes = pickQuotes(vn.quotes, VN_SYMBOLS)
  const globalQuotes = pickQuotes(global.quotes, GLOBAL_SYMBOLS)

  // The row holds its 38px in every state so nothing below it jumps.
  if (!vnQuotes.length && !globalQuotes.length) {
    const failed = vn.status === 'error' && global.status === 'error'
    return (
      <div className="market-strip" aria-label={t('market.label')} aria-live="off">
        <div className="market-strip__inner">
          <span className="market-strip__note">
            {failed ? t('market.unavailable') : t('market.loading')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`market-strip${pauseTickers ? ' is-paused' : ''}`}
      aria-label={t('market.label')}
      aria-live="off"
    >
      <div className="market-strip__track">
        <MarketGroups
          t={t}
          locale={locale}
          vnQuotes={vnQuotes}
          globalQuotes={globalQuotes}
        />
        <MarketGroups
          t={t}
          locale={locale}
          vnQuotes={vnQuotes}
          globalQuotes={globalQuotes}
          clone
        />
      </div>
    </div>
  )
}
