import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchMarketQuotes } from '../lib/marketTicker'
import './MarketTicker.css'

export default function MarketTicker() {
  const { t, i18n } = useTranslation()
  const [quotes, setQuotes] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    const load = () => {
      fetchMarketQuotes()
        .then((data) => {
          if (!active) return
          setQuotes(data)
          setStatus('ready')
        })
        .catch(() => active && setStatus('error'))
    }
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  if (status === 'error' && !quotes.length) {
    return (
      <div className="market-ticker market-ticker--error" aria-live="polite">
        <div className="icue-container market-ticker__inner">
          <span className="market-ticker__loading">{t('market.unavailable')}</span>
        </div>
      </div>
    )
  }

  const locale = i18n.resolvedLanguage === 'vi' ? 'vi-VN' : 'en-US'

  return (
    <div className="market-ticker" aria-label={t('market.label')}>
      <div className="icue-container market-ticker__inner">
        {status === 'loading' && !quotes.length ? (
          <span className="market-ticker__loading">{t('market.loading')}</span>
        ) : (
          quotes.map((q) => {
            const up = q.changePct >= 0
            return (
              <span
                key={q.symbol}
                className={`market-ticker__item${up ? ' is-up' : ' is-down'}`}
              >
                <span className="market-ticker__name">{q.label}</span>
                <span className="market-ticker__price">
                  {q.price.toLocaleString(locale, { maximumFractionDigits: 2 })}
                </span>
                <span className="market-ticker__change">
                  {up ? '↑' : '↓'} {Math.abs(q.changePct).toFixed(2)}%
                </span>
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}
