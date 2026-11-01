import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { withDeadline } from '../../../shared/resilience/requests.js'
import { loadSupabaseConfig } from '../lib/supabaseConfig'
import './NewsletterSubscribe.css'

export default function NewsletterSubscribe() {
  const { t, i18n } = useTranslation()
  const id = useId()
  const submitting = useRef(false)
  const [status, setStatus] = useState('idle')

  async function subscribe(event) {
    event.preventDefault()
    if (submitting.current) return
    const form = event.currentTarget
    if (!form.reportValidity()) return
    const values = new FormData(form)
    submitting.current = true
    setStatus('loading')
    try {
      const config = await loadSupabaseConfig()
      if (!config) throw new Error('Newsletter configuration unavailable')
      const response = await withDeadline(signal => fetch(`${config.url}/functions/v1/newsletter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
        body: JSON.stringify({
          email: String(values.get('email') || '').trim(),
          locale: (i18n.resolvedLanguage || i18n.language || 'vi').split('-')[0],
          website: String(values.get('website') || ''),
        }),
        signal,
      }), { timeoutMs: 15_000 })
      if (response.status === 429) {
        setStatus('rateLimited')
        return
      }
      if (!response.ok || (await response.json()).ok !== true) throw new Error('Subscription failed')
      form.reset()
      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      submitting.current = false
    }
  }

  const hasError = status === 'error' || status === 'rateLimited'
  return (
    <section id="newsletter" className="newsletter" aria-labelledby={`${id}-title`}>
      <div className="newsletter__inner">
        <div className="newsletter__copy">
          <span className="newsletter__eyebrow">ICUE · {t('newsletter.eyebrow')}</span>
          <h2 id={`${id}-title`}>{t('newsletter.title')}</h2>
          <p>{t('newsletter.description')}</p>
        </div>
        <form className="newsletter__form" onSubmit={subscribe} aria-busy={status === 'loading'}>
          <label htmlFor={`${id}-email`}>{t('newsletter.emailLabel')}</label>
          <div className="newsletter__fields">
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t('newsletter.placeholder')}
              required
              maxLength={254}
              disabled={status === 'loading'}
              aria-describedby={`${id}-note${status !== 'idle' && status !== 'loading' ? ` ${id}-status` : ''}`}
            />
            <button type="submit" disabled={status === 'loading'}>
              {t(status === 'loading' ? 'newsletter.submitting' : 'newsletter.subscribe')}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="newsletter__honeypot" aria-hidden="true">
            <label htmlFor={`${id}-website`}>Website</label>
            <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <p id={`${id}-note`} className="newsletter__note">{t('newsletter.note')}</p>
          <p
            id={`${id}-status`}
            className={`newsletter__status${hasError ? ' newsletter__status--error' : ''}`}
            role={hasError ? 'alert' : 'status'}
            aria-atomic="true"
          >
            {status === 'success' || hasError ? t(`newsletter.${status}`) : ''}
          </p>
        </form>
      </div>
    </section>
  )
}
