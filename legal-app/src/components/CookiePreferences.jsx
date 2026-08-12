import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

const STORAGE_KEY = 'cookie_preferences'
const CATEGORY_KEYS = ['essential', 'performance', 'functional', 'marketing']
const OPTIONAL_CATEGORIES = ['performance', 'functional', 'marketing']
const PREFERENCES_EVENT = 'icue:cookie-preferences'
const DEFAULTS = {
  essential: true,
  performance: false,
  functional: false,
  marketing: false,
}

function readPreferences() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!saved || typeof saved !== 'object') return DEFAULTS
    return {
      essential: true,
      performance: Boolean(saved.performance),
      functional: Boolean(saved.functional),
      marketing: Boolean(saved.marketing),
    }
  } catch {
    return DEFAULTS
  }
}

export default function CookiePreferences() {
  const { t } = useTranslation()
  const [preferences, setPreferences] = useState(readPreferences)
  const [status, setStatus] = useState('')

  const save = (nextPreferences) => {
    const payload = {
      ...nextPreferences,
      essential: true,
      version: 1,
      timestamp: new Date().toISOString(),
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail: payload }))
      setPreferences(payload)
      setStatus(t('cookies.status.saved'))
    } catch {
      setStatus(t('cookies.status.blocked'))
    }
  }

  return (
    <div className="cookie-preferences">
      <p>
        {/* The event name is a literal, not translatable copy — Trans keeps it
            inside <code> while the sentence around it changes per locale. */}
        <Trans
          i18nKey="cookies.intro"
          values={{ event: PREFERENCES_EVENT }}
          components={[<code key="event" />]}
        />
      </p>

      <div className="cookie-preferences__grid">
        {CATEGORY_KEYS.map((key) => (
          <label className="cookie-toggle" key={key}>
            <span>
              <strong>{t(`cookies.categories.${key}.title`)}</strong>
              <small>{t(`cookies.categories.${key}.description`)}</small>
            </span>
            <input
              type="checkbox"
              checked={preferences[key]}
              disabled={key === 'essential'}
              onChange={(event) => {
                setStatus('')
                setPreferences((current) => ({
                  ...current,
                  [key]: event.target.checked,
                }))
              }}
            />
            <i aria-hidden="true" />
          </label>
        ))}
      </div>

      <div className="cookie-preferences__actions">
        <button
          type="button"
          className="legal-button legal-button--secondary"
          onClick={() =>
            save({
              ...preferences,
              ...Object.fromEntries(OPTIONAL_CATEGORIES.map((key) => [key, false])),
            })
          }
        >
          {t('cookies.actions.reject')}
        </button>
        <button type="button" className="legal-button" onClick={() => save(preferences)}>
          {t('cookies.actions.save')}
        </button>
      </div>
      <p className="cookie-preferences__status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  )
}
