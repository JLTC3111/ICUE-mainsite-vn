import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import './ArticleTranslator.css'

const LANG_LABELS = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label]),
)

export default function ArticleTranslator({
  busy = false,
  error = false,
  activeLang = null,
  showOriginal = false,
  onShowOriginal,
  onRetry,
}) {
  const { t } = useTranslation()

  if (!busy && !error && !activeLang && !showOriginal) return null

  return (
    <div className="translator">
      {busy && (
        <p className="translator__status">
          <span className="translator__spin" aria-hidden />
          {t('translate.translating')}
        </p>
      )}

      {!busy && error && (
        <div className="translator__controls">
          <p className="translator__status translator__status--err">{t('translate.error')}</p>
          {onRetry && (
            <button type="button" className="translator__reset" onClick={onRetry}>
              {t('translate.retry')}
            </button>
          )}
        </div>
      )}

      {!busy && !error && activeLang && !showOriginal && (
        <div className="translator__controls">
          <p className="translator__status">
            {t('translate.translated', { lang: LANG_LABELS[activeLang] || activeLang })}
            <span className="translator__note"> · {t('translate.note')}</span>
          </p>
          {onShowOriginal && (
            <button type="button" className="translator__reset" onClick={onShowOriginal}>
              {t('translate.original')}
            </button>
          )}
        </div>
      )}

      {!busy && !error && showOriginal && activeLang && (
        <div className="translator__controls">
          <p className="translator__status">{t('translate.showingOriginal')}</p>
        </div>
      )}
    </div>
  )
}
