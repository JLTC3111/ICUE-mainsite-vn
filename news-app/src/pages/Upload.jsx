import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import ArticleForm from '../components/ArticleForm'
import { createArticle } from '../lib/articles'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Upload() {
  const { t } = useTranslation()
  useDocumentTitle(t('editor.writeTitle'))
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = useCallback(
    async ({ form, items, coverFile, status }) => {
      const res = await createArticle({ form, items, coverFile, userId: user.id, status })
      if (status === 'published') navigate(`/article/${res.slug}`)
      else navigate('/dashboard')
    },
    [user, navigate],
  )

  return (
    <>
      <h1 className="visually-hidden">{t('editor.writeTitle')}</h1>
      <ArticleForm mode="create" onSubmit={handleSubmit} />
    </>
  )
}
