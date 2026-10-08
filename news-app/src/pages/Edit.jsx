import { useResumeRevision } from '../../../shared/resilience/usePageResume.js'
import { RecoveryNotice } from '../../../shared/resilience/RecoveryBoundary.jsx'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import ArticleForm from '../components/ArticleForm'
import { fetchArticleById, updateArticle, toEditorMedia, createArticleSaveSession } from '../lib/articles'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Edit() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [article, setArticle] = useState(null)
  const [loadedFor, setLoadedFor] = useState(null)
  const [saveSession, setSaveSession] = useState(createArticleSaveSession)
  const [state, setState] = useState('loading') // loading | ready | error
  const editorIdentity = `${user.id}:${id}`
  const canShowArticle = loadedFor === editorIdentity && article
    && (!article.author_id || article.author_id === user.id || isAdmin)

  const [revision, retry] = useResumeRevision({ enabled: state !== 'ready', minHiddenMs: 0 })

  useDocumentTitle(
    state === 'ready' && canShowArticle && article?.title
      ? `${t('editor.editTitle')}: ${article.title}`
      : t('editor.editTitle'),
  )

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetchArticleById(id, { signal: controller.signal })
      .then((data) => {
        if (!active) return
        if (!data || (data.author_id && data.author_id !== user.id && !isAdmin)) return setState('error')
        const items = (data.media || [])
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map(toEditorMedia)
        setArticle({ ...data, items })
        setLoadedFor(`${user.id}:${id}`)
        setSaveSession(createArticleSaveSession())
        setState('ready')
      })
      .catch(() => active && setState('error'))
    return () => { active = false; controller.abort() }
  }, [id, revision, user.id, isAdmin])

  const handleSubmit = useCallback(
    async ({ form, items, coverFile, coverAltFile, status }) => {
      const res = await updateArticle({
        id,
        form,
        items,
        saveSession,
        coverFile,
        coverAltFile,
        userId: user.id,
        status,
      })
      if (status === 'published') navigate(`/article/${res.slug}`)
      return res
    },
    [id, saveSession, user, navigate],
  )

  if (state === 'error') {
    return <div className="icue-container" style={{ padding: '80px 24px', textAlign: 'center' }}><RecoveryNotice onRetry={retry} /></div>
  }
  if (state === 'loading' || !canShowArticle) {
    return <div className="route-loading"><span className="spin" style={{ borderColor: '#ddd', borderTopColor: '#111' }} /></div>
  }

  return (
    <>
      <h1 className="visually-hidden">{t('editor.editTitle')}</h1>
      <ArticleForm key={`${user.id}:${article.id}`} mode="edit" initial={article} onSubmit={handleSubmit} draftSaved={location.state?.draftSaved} />
    </>
  )
}
