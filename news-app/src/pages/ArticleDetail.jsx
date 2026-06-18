import { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { fetchArticleBySlug, deleteArticle } from '../lib/articles'
import { formatDate } from '../lib/helpers'
import './ArticleDetail.css'

export default function ArticleDetail() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [article, setArticle] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState('loading')
    fetchArticleBySlug(slug)
      .then((data) => {
        if (!active) return
        if (!data) return setState('error')
        setArticle(data)
        setState('ready')
        document.title = `${data.title} · ICUE News`
      })
      .catch(() => active && setState('error'))
    return () => { active = false }
  }, [slug])

  const { images, videos } = useMemo(() => {
    const media = (article?.media || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0))
    return {
      images: media.filter((m) => m.kind === 'image'),
      videos: media.filter((m) => m.kind === 'video'),
    }
  }, [article])

  if (state === 'loading') {
    return <div className="route-loading"><span className="spin" style={{ borderColor: '#ddd', borderTopColor: '#111' }} /></div>
  }
  if (state === 'error') {
    return (
      <div className="article-detail__missing icue-container">
        <p>{t('common.notFound')}</p>
        <Link to="/" className="btn btn-ghost btn-sm">{t('common.back')}</Link>
      </div>
    )
  }

  const author = article.author || {}
  const byline = article.author_name || author.display_name || author.full_name || 'ICUE'
  const canEdit = isAdmin || (user && user.id === article.author_id)

  const handleDelete = async () => {
    if (!window.confirm(t('common.confirmDelete'))) return
    await deleteArticle(article.id)
    navigate('/dashboard')
  }

  return (
    <article className="article-detail">
      <div className="article-detail__head icue-container">
        {article.status === 'draft' && <span className="article-detail__badge">{t('common.draft')}</span>}
        <h1 className="article-detail__title">{article.title}</h1>
        {article.subtitle && <p className="article-detail__subtitle">{article.subtitle}</p>}

        <div className="article-detail__byline">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" className="article-detail__avatar" />
          ) : (
            <span className="article-detail__avatar article-detail__avatar--fallback">
              {(author.display_name || author.full_name || '?').slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="article-detail__byline-text">
            <span className="article-detail__author">{byline}</span>
            <span className="article-detail__meta">
              {formatDate(article.published_at || article.article_date, i18n.resolvedLanguage)}
              {article.article_time ? ` · ${article.article_time.slice(0, 5)}` : ''}
              {' · '}{article.read_minutes || 1} {t('news.minRead')}
            </span>
          </div>

          {canEdit && (
            <div className="article-detail__owner-actions">
              <Link to={`/edit/${article.id}`} className="btn btn-ghost btn-sm">{t('common.edit')}</Link>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>{t('common.delete')}</button>
            </div>
          )}
        </div>
      </div>

      {article.cover_image_url && (
        <figure className="article-detail__cover">
          <img src={article.cover_image_url} alt="" decoding="async" />
        </figure>
      )}

      <div
        className="article-detail__content icue-readw"
        dangerouslySetInnerHTML={{ __html: article.content_html }}
      />

      {videos.length > 0 && (
        <section className="article-detail__videos icue-readw">
          {videos.map((v) => (
            <video key={v.id} src={v.url} poster={v.poster_url || undefined} controls preload="metadata" playsInline />
          ))}
        </section>
      )}

      {images.length > 0 && (
        <section className="article-detail__gallery icue-readw">
          {images.map((img) => (
            <figure key={img.id} className="article-detail__gallery-item">
              <img src={img.url} alt="" loading="lazy" decoding="async" />
            </figure>
          ))}
        </section>
      )}

      <div className="article-detail__foot icue-readw">
        <Link to="/" className="btn btn-ghost btn-sm">← {t('news.title')}</Link>
      </div>
    </article>
  )
}
