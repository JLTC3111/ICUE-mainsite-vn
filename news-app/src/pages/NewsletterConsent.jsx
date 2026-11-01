import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withDeadline } from '../../../shared/resilience/requests.js'
import { loadSupabaseConfig } from '../lib/supabaseConfig'
import './NewsletterConsent.css'

const LOCALES = ['vi', 'en', 'de', 'fr', 'ja', 'ko']

export default function NewsletterConsent() {
  const { search } = useLocation()
  const { t, i18n } = useTranslation()
  const params = new URLSearchParams(search)
  const action = params.get('action')
  const token = params.get('token') || ''
  const locale = params.get('locale')
  const valid = (action === 'confirm' || action === 'unsubscribe') && /^[a-f0-9]{64}$/i.test(token)
  const submitting = useRef(false)
  const [result, setResult] = useState({ query: search, status: 'idle' })
  const status = result.query === search ? result.status : 'idle'
  const success = status === 'success'
  const invalid = !valid || status === 'invalid'
  const isConfirm = action === 'confirm'

  useEffect(() => {
    if (LOCALES.includes(locale) && i18n.resolvedLanguage !== locale) {
      i18n.changeLanguage(locale)
    }
  }, [i18n, locale])

  useEffect(() => {
    let meta = document.querySelector('meta[name="referrer"]')
    const previous = meta?.getAttribute('content')
    const created = !meta
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'referrer'
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'no-referrer')
    return () => {
      if (created) meta.remove()
      else if (previous === null) meta.removeAttribute('content')
      else meta.setAttribute('content', previous)
    }
  }, [])

  async function consent() {
    if (!valid || submitting.current || success) return
    submitting.current = true
    setResult({ query: search, status: 'loading' })
    try {
      const config = await loadSupabaseConfig()
      if (!config) throw new Error('Newsletter configuration unavailable')
      const endpoint = new URL(`${config.url}/functions/v1/newsletter`)
      endpoint.searchParams.set('action', action)
      endpoint.searchParams.set('token', token)
      const response = await withDeadline(signal => fetch(endpoint.href, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
        referrerPolicy: 'no-referrer',
        signal,
      }), { timeoutMs: 15_000 })
      if (response.status === 400 || response.status === 410) {
        setResult({ query: search, status: 'invalid' })
        return
      }
      if (!response.ok || (await response.json()).ok !== true) throw new Error('Newsletter action failed')
      setResult({ query: search, status: 'success' })
    } catch {
      setResult({ query: search, status: 'error' })
    } finally {
      submitting.current = false
    }
  }

  const title = invalid ? 'consentTitle'
    : success ? (isConfirm ? 'confirmedTitle' : 'unsubscribedTitle')
      : (isConfirm ? 'confirmTitle' : 'unsubscribeTitle')
  const description = invalid ? 'invalid'
    : success ? (isConfirm ? 'confirmedDescription' : 'unsubscribedDescription')
      : (isConfirm ? 'confirmDescription' : 'unsubscribeDescription')

  return (
    <section className="newsletter-consent" aria-labelledby="newsletter-consent-title">
      <div className="newsletter-consent__card">
        <span className="newsletter-consent__eyebrow">ICUE · {t('newsletter.eyebrow')}</span>
        <div role={success ? 'status' : undefined} aria-atomic="true">
          <h1 id="newsletter-consent-title">{t(`newsletter.${title}`)}</h1>
          <p>{t(`newsletter.${description}`)}</p>
        </div>
        {!invalid && !success && (
          <button type="button" onClick={consent} disabled={status === 'loading'}>
            {t(`newsletter.${status === 'loading' ? 'working' : isConfirm ? 'confirmButton' : 'unsubscribeButton'}`)}
          </button>
        )}
        {status === 'error' && <p className="newsletter-consent__error" role="alert">{t('newsletter.consentError')}</p>}
        <Link to="/" className="newsletter-consent__back">{t('newsletter.backToNews')}</Link>
      </div>
    </section>
  )
}
