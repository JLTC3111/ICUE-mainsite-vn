import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import './ArticleTranslator.css'

const LANG_LABELS = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label]),
)

export default function ArticleTranslator({
  busy = false,
  error = false,
  translationLang = null,
  showOriginal = false,
  onShowOriginal,
  onShowTranslation,
  onRetry,
}) {
  const { t } = useTranslation()
  const canToggle = Boolean(translationLang)

  if (!busy && !error && !canToggle) return null

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

      {!busy && !error && canToggle && !showOriginal && onShowOriginal && (
        <div className="translator__controls">
          <button type="button" className="translator__reset" onClick={onShowOriginal}>
            {t('translate.original')}
          </button>
        </div>
      )}

      {!busy && !error && canToggle && showOriginal && onShowTranslation && (
        <div className="translator__controls">
          <button type="button" className="translator__reset" onClick={onShowTranslation}>
            {t('translate.showTranslation', {
              lang: LANG_LABELS[translationLang] || translationLang,
            })}
          </button>
        </div>
      )}
    </div>
  )
}
