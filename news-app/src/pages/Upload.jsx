import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import ArticleForm from '../components/ArticleForm'
import { createArticle } from '../lib/articles'
import { consumeAiDraft } from '../lib/aiDraft'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Upload() {
  const { t } = useTranslation()
  useDocumentTitle(t('editor.writeTitle'))
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const initial = useMemo(() => {
    const fromState = location.state?.aiDraft
    const draft = fromState || consumeAiDraft()
    if (!draft) return undefined
    return {
      title: draft.title || '',
      subtitle: draft.subtitle || '',
      content_html: draft.content_html || '',
      language: draft.language,
      category: draft.category,
    }
  }, [location.state])

  const handleSubmit = useCallback(
    async ({ form, items, coverFile, coverAltFile, status }) => {
      const res = await createArticle({ form, items, coverFile, coverAltFile, userId: user.id, status })
      if (status === 'published') navigate(`/article/${res.slug}`)
      else navigate('/dashboard')
    },
    [user, navigate],
  )

  return (
    <>
      <h1 className="visually-hidden">{t('editor.writeTitle')}</h1>
      <ArticleForm mode="create" initial={initial} onSubmit={handleSubmit} />
    </>
  )
}
