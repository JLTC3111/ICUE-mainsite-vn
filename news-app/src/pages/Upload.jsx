import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import ArticleForm from '../components/ArticleForm'
import { createArticle, createArticleSaveSession } from '../lib/articles'
import { consumeAiDraft } from '../lib/aiDraft'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Upload() {
  const { user } = useAuth()
  return <AccountUpload key={user.id} user={user} />
}

function AccountUpload({ user }) {
  const { t } = useTranslation()
  useDocumentTitle(t('editor.writeTitle'))
  const navigate = useNavigate()
  const location = useLocation()
  const [saveSession] = useState(createArticleSaveSession)

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
      const res = await createArticle({ form, items, coverFile, coverAltFile, userId: user.id, status, saveSession })
      if (status === 'published') navigate(`/article/${res.slug}`)
      else navigate(`/edit/${res.id}`, { replace: true, state: { draftSaved: true } })
      return res
    },
    [user, navigate, saveSession],
  )

  return (
    <>
      <h1 className="visually-hidden">{t('editor.writeTitle')}</h1>
      <ArticleForm key={user.id} mode="create" initial={initial} onSubmit={handleSubmit} />
    </>
  )
}
