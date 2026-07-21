import { useTranslation } from 'react-i18next'
import './ArticleTranslator.css'

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

      {!busy && !error && activeLang && !showOriginal && onShowOriginal && (
        <div className="translator__controls">
          <button type="button" className="translator__reset" onClick={onShowOriginal}>
            {t('translate.original')}
          </button>
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
