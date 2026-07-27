import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchComments, addComment } from '../lib/engagement'
import { formatDateTime } from '../lib/helpers'
import './Engagement.css'

// IP-based comments (no login). Any visitor can post; comments are public.
export default function CommentSection({ articleId }) {
  const { t, i18n } = useTranslation()
  const [comments, setComments] = useState([])
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchComments(articleId)
      .then((rows) => active && setComments(rows))
      .catch(() => {})
    return () => { active = false }
  }, [articleId])

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      const text = body.trim()
      if (!text || busy) return
      setBusy(true)
      setError('')
      try {
        const row = await addComment(articleId, text, name.trim())
        setComments((list) => [row, ...list])
        setBody('')
      } catch {
        setError(t('engagement.error'))
      } finally {
        setBusy(false)
      }
    },
    [articleId, body, name, busy, t],
  )

  return (
    <section className="comments icue-readw" aria-label={t('engagement.comments')}>
      <h2 className="comments__title">
        {t('engagement.commentsCount', { count: comments.length })}
      </h2>

      <form className="comments__form" onSubmit={onSubmit}>
        <input
          className="input comments__name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('engagement.namePlaceholder')}
          maxLength={80}
        />
        <textarea
          className="textarea comments__body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('engagement.commentPlaceholder')}
          rows={3}
          maxLength={2000}
        />
        {error && <p className="comments__error">{error}</p>}
        <div className="comments__actions">
          <button className="btn btn-accent btn-sm" type="submit" disabled={busy || !body.trim()}>
            {busy ? t('engagement.posting') : t('engagement.post')}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="comments__empty">{t('engagement.empty')}</p>
      ) : (
        <ul className="comments__list">
          {comments.map((c) => (
            <li key={c.id} className="comments__item">
              <div className="comments__meta">
                <span className="comments__author">{c.author_name || t('engagement.anon')}</span>
                <time className="comments__date" dateTime={c.created_at}>
                  {formatDateTime(c.created_at, i18n.resolvedLanguage)}
                </time>
              </div>
              <p className="comments__text">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
