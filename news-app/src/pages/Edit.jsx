import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import ArticleForm from '../components/ArticleForm'
import ArticleTranslationsEditor from '../components/ArticleTranslationsEditor'
import { fetchArticleById, updateArticle, toEditorMedia } from '../lib/articles'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Edit() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [article, setArticle] = useState(null)
  const [originalItems, setOriginalItems] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error

  useDocumentTitle(
    state === 'ready' && article?.title
      ? `${t('editor.editTitle')}: ${article.title}`
      : t('editor.editTitle'),
  )

  useEffect(() => {
    let active = true
    fetchArticleById(id)
      .then((data) => {
        if (!active) return
        if (!data) return setState('error')
        const items = (data.media || [])
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map(toEditorMedia)
        setArticle({ ...data, items })
        setOriginalItems(items)
        setState('ready')
      })
      .catch(() => active && setState('error'))
    return () => { active = false }
  }, [id])

  const handleSubmit = useCallback(
    async ({ form, items, coverFile, coverAltFile, status }) => {
      const res = await updateArticle({
        id,
        form,
        items,
        originalItems,
        coverFile,
        coverAltFile,
        userId: user.id,
        status,
      })
      if (status === 'published') navigate(`/article/${res.slug}`)
      else navigate('/dashboard')
    },
    [id, originalItems, user, navigate],
  )

  if (state === 'loading') {
    return <div className="route-loading"><span className="spin" style={{ borderColor: '#ddd', borderTopColor: '#111' }} /></div>
  }
  if (state === 'error') {
    return <div className="icue-container" style={{ padding: '80px 24px', textAlign: 'center' }}>{t('common.notFound')}</div>
  }

  return (
    <>
      <h1 className="visually-hidden">{t('editor.editTitle')}</h1>
      <ArticleForm key={article.id} mode="edit" initial={article} onSubmit={handleSubmit} />
      <ArticleTranslationsEditor articleId={article.id} sourceLanguage={article.language} />
    </>
  )
}
