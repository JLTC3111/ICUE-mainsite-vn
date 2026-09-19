import { useResumeRevision } from '../../../shared/resilience/usePageResume.js'
import { RecoveryNotice } from '../../../shared/resilience/RecoveryBoundary.jsx'
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, CircleAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchMyArticles, deleteArticle } from '../lib/articles'
import { fetchArticleTranslationsForArticles } from '../lib/translate'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import { getArticleTranslationCompleteness } from '../lib/translationCompleteness'
import { formatDate, articlePublishDate, articleEditedDate } from '../lib/helpers'
import ArticleThumbnail from '../components/ArticleThumbnail'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './Dashboard.css'

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  useDocumentTitle(t('nav.dashboard'))
  const { user, isAdmin } = useAuth()
  const [articles, setArticles] = useState([])
  const [state, setState] = useState('loading')
  const [translations, setTranslations] = useState({})
  const [translationsState, setTranslationsState] = useState('loading')

  const userId = user?.id
  const [revision, retry] = useResumeRevision({ minHiddenMs: state === 'ready' ? 30_000 : 0 })
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return undefined
    let live = true
    const controller = new AbortController()

    fetchMyArticles(userId, { includeAll: isAdmin, signal: controller.signal })
      .then((data) => {
        if (!live) return
        setArticles(data)
        setState('ready')
        setError(false)

        fetchArticleTranslationsForArticles(data.map((article) => article.id))
          .then((rows) => {
            if (!live) return
            setTranslations(rows)
            setTranslationsState('ready')
          })
          .catch(() => {
            if (!live) return
            setTranslations({})
            setTranslationsState('error')
          })
      })
      .catch(() => {
        if (!live) return
        setState((current) => current === 'ready' ? current : 'error')
        setError(true)
        setTranslationsState('error')
      })

    return () => { live = false; controller.abort() }
  }, [userId, isAdmin, revision])

  const translationStatuses = useMemo(() => Object.fromEntries(
    articles.map((article) => [
      article.id,
      getArticleTranslationCompleteness(
        article,
        translations[article.id] || {},
        SUPPORTED_LANGUAGES,
      ),
    ]),
  ), [articles, translations])

  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirmDelete'))) return
    try {
      await deleteArticle(id)
      setArticles((prev) => prev.filter((a) => a.id !== id))
    } catch { setError(true) }
  }

  return (
    <div className="dash icue-container">
      <div className="dash__head">
        <h1>{t('nav.dashboard')}</h1>
        <Link to="/write" className="btn btn-accent btn-sm">{t('nav.write')}</Link>
      </div>

      {error && <RecoveryNotice onRetry={retry} />}
      {state === 'loading' && <div className="route-loading"><span className="spin" style={{ borderColor: '#ddd', borderTopColor: '#111' }} /></div>}
      {state === 'ready' && articles.length === 0 && <p className="dash__empty">{t('news.empty')}</p>}

      {state === 'ready' && articles.length > 0 && (
        <ul className="dash__list">
          {articles.map((a) => {
            const published = articlePublishDate(a)
            const edited = articleEditedDate(a)
            const locale = i18n.resolvedLanguage
            const publishedLabel = published ? formatDate(published, locale) : ''
            const editedLabel = edited ? formatDate(edited, locale) : ''
            const translationStatus = translationStatuses[a.id]
            return (
              <li key={a.id} className="dash__row">
                <div className="dash__thumb">
                  <ArticleThumbnail article={a} />
                </div>
                <div className="dash__info">
                  <span className={`dash__status dash__status--${a.status}`}>
                    {a.status === 'published' ? t('common.published') : t('common.draft')}
                  </span>
                  <Link to={`/article/${a.slug}`} className="dash__title">{a.title}</Link>
                  {a.subtitle && <p className="dash__subtitle">{a.subtitle}</p>}
                  {translationsState === 'ready' && translationStatus && (
                    <span
                      className={`dash__translation dash__translation--${translationStatus.complete ? 'complete' : 'incomplete'}`}
                      title={translationStatus.incompleteLocales.join(', ')}
                    >
                      {translationStatus.complete ? (
                        <Check size={13} strokeWidth={2.5} aria-hidden />
                      ) : (
                        <CircleAlert size={13} strokeWidth={2.2} aria-hidden />
                      )}
                      {translationStatus.complete
                        ? t('translationsEditor.articleComplete')
                        : t('translationsEditor.articleIncomplete', {
                          complete: translationStatus.completedLocales,
                          total: translationStatus.totalLocales,
                        })}
                    </span>
                  )}
                  <span className="dash__date">
                    {a.status === 'published' && publishedLabel
                      ? (
                        <>
                          {t('news.publishedOn', { date: publishedLabel })}
                          {editedLabel ? ` · ${t('news.editedOn', { date: editedLabel })}` : ''}
                        </>
                      )
                      : (editedLabel || publishedLabel)
                        ? t('news.editedOn', { date: editedLabel || publishedLabel })
                        : ''}
                  </span>
                </div>
                <div className="dash__actions">
                  <Link to={`/edit/${a.id}`} className="btn btn-ghost btn-sm">{t('common.edit')}</Link>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>{t('common.delete')}</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
