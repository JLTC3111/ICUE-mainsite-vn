import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchVnMarketQuotes } from '../lib/vnMarketTicker'
import './VnMarketTicker.css'

function formatPrice(q, locale) {
  if (q.kind === 'index') {
    return q.price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (q.price >= 1000) {
    return q.price.toLocaleString(locale, { maximumFractionDigits: 0 })
  }
  return q.price.toLocaleString(locale, { maximumFractionDigits: 1 })
}

function formatOhlc(q, locale) {
  const fmt = (n) => {
    if (q.kind === 'index') return n.toLocaleString(locale, { maximumFractionDigits: 2 })
    if (n >= 1000) return n.toLocaleString(locale, { maximumFractionDigits: 0 })
    return n.toLocaleString(locale, { maximumFractionDigits: 1 })
  }
  return `${fmt(q.open)}/${fmt(q.high)}/${fmt(q.low)}`
}

function TickerItem({ q, locale, ohlcLabel }) {
  const up = q.changePct >= 0
  return (
    <span className={`vn-ticker__item${up ? ' is-up' : ' is-down'}`}>
      <span className="vn-ticker__badge">{q.exchange}</span>
      <span className="vn-ticker__name">{q.label}</span>
      <span className="vn-ticker__price">{formatPrice(q, locale)}</span>
      <span className="vn-ticker__ohlc" title={ohlcLabel}>
        {formatOhlc(q, locale)}
      </span>
      <span className="vn-ticker__change">
        {up ? '↑' : '↓'} {Math.abs(q.changePct).toFixed(2)}%
      </span>
    </span>
  )
}

export default function VnMarketTicker() {
  const { t, i18n } = useTranslation()
  const [quotes, setQuotes] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    const load = () => {
      fetchVnMarketQuotes()
        .then((data) => {
          if (!active) return
          setQuotes(data)
          setStatus('ready')
        })
        .catch(() => active && setStatus('error'))
    }
    load()
    const id = setInterval(load, 60 * 1000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  if (status === 'error' && !quotes.length) return null

  const locale = i18n.resolvedLanguage === 'vi' ? 'vi-VN' : 'en-US'
  const ohlcLabel = t('market.ohlc')

  const track = status === 'loading' && !quotes.length
    ? <span className="vn-ticker__loading">{t('market.vnLoading')}</span>
    : (
      <>
        <div className="vn-ticker__row" aria-hidden="true">
          {quotes.map((q) => (
            <TickerItem key={`a-${q.symbol}`} q={q} locale={locale} ohlcLabel={ohlcLabel} />
          ))}
        </div>
        <div className="vn-ticker__row" aria-hidden="true">
          {quotes.map((q) => (
            <TickerItem key={`b-${q.symbol}`} q={q} locale={locale} ohlcLabel={ohlcLabel} />
          ))}
        </div>
      </>
    )

  return (
    <div className="vn-ticker" aria-label={t('market.vnLabel')}>
      <div className="vn-ticker__label">{t('market.vnLabel')}</div>
      <div className="vn-ticker__viewport">
        <div className={`vn-ticker__track${quotes.length ? ' is-animated' : ''}`}>
          {track}
        </div>
      </div>
    </div>
  )
}
