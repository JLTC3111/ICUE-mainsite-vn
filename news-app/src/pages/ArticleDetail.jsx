import { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { fetchArticleBySlug, deleteArticle } from '../lib/articles'
import { recordArticleView } from '../lib/engagement'
import { formatDate, normalizeHtmlUnicode, normalizeUnicode } from '../lib/helpers'
import { DEFAULT_AVATAR } from '../lib/defaults'
import MediaGallery from '../components/MediaGallery'
import HeartButton from '../components/HeartButton'
import CommentSection from '../components/CommentSection'
import ArticleTranslator from '../components/ArticleTranslator'
import ArticleViewCounter from '../components/ArticleViewCounter'
import HyperText from '../components/HyperText'
import ArticleTextReveal from '../components/TextReveal'
import Lens from '../components/Lens'
import { embedVideosInHtml } from '../lib/videoEmbeds'
import './ArticleDetail.css'

function useFinePointerLens() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setEnabled(fine.matches && !motion.matches)
    sync()
    fine.addEventListener('change', sync)
    motion.addEventListener('change', sync)
    return () => {
      fine.removeEventListener('change', sync)
      motion.removeEventListener('change', sync)
    }
  }, [])

  return enabled
}

export default function ArticleDetail() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const lensEnabled = useFinePointerLens()

  const [article, setArticle] = useState(null)
  const [state, setState] = useState('loading')
  const [viewCount, setViewCount] = useState(0)
  const [translation, setTranslation] = useState(null)
  const [translatedLang, setTranslatedLang] = useState(null)

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState('loading')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslation(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslatedLang(null)
    fetchArticleBySlug(slug)
      .then((data) => {
        if (!active) return
        if (!data) return setState('error')
        setArticle(data)
        setViewCount(data.view_count ?? 0)
        setState('ready')
        document.title = `${data.title} · ICUE News`
        if (data.status === 'published') {
          recordArticleView(data.id)
            .then((result) => active && setViewCount(result.count))
            .catch(() => {})
        }
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

  const displayContent = useMemo(() => {
    const raw = translation ? translation.content_html : article?.content_html
    return normalizeHtmlUnicode(embedVideosInHtml(raw || ''))
  }, [translation, article?.content_html])

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

  const displayTitle = normalizeUnicode(translation ? translation.title : article.title)
  const displaySubtitle = normalizeUnicode(translation ? translation.subtitle : article.subtitle)

  const applyTranslation = (result, code) => {
    setTranslation(result)
    setTranslatedLang(code)
  }
  const resetTranslation = () => {
    setTranslation(null)
    setTranslatedLang(null)
  }

  return (
    <article className="article-detail">
      <div className="article-detail__head icue-container">
        {article.status === 'draft' && <span className="article-detail__badge">{t('common.draft')}</span>}
        <HyperText
          as="h1"
          className="article-detail__title"
          animateOnHover={false}
          duration={1200}
          delay={120}
        >
          {displayTitle}
        </HyperText>
        {displaySubtitle && <p className="article-detail__subtitle">{displaySubtitle}</p>}

        <div className="article-detail__byline">
          <img src={author.avatar_url || DEFAULT_AVATAR} alt="" className="article-detail__avatar" />
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

      <ArticleTranslator
        article={article}
        activeLang={translatedLang}
        onApply={applyTranslation}
        onReset={resetTranslation}
      />

      {article.cover_image_url && (
        <figure className="article-detail__cover">
          <Lens
            className="article-detail__cover-lens"
            zoomFactor={1.4}
            lensSize={180}
            disabled={!lensEnabled}
          >
            <img src={article.cover_image_url} alt="" decoding="async" />
          </Lens>
        </figure>
      )}

      <ArticleTextReveal
        html={displayContent}
        className="article-detail__content icue-readw"
        finishBy={0.4}
      />

      <MediaGallery images={images} videos={videos} lensEnabled={lensEnabled} />

      <div className="article-detail__foot icue-readw">
        <Link to="/" className="btn btn-ghost btn-sm">← {t('news.title')}</Link>
        {article.status === 'published' && (
          <div className="article-detail__engagement">
            <ArticleViewCounter count={viewCount} />
            <HeartButton articleId={article.id} />
          </div>
        )}
      </div>

      {article.status === 'published' && <CommentSection articleId={article.id} />}
    </article>
  )
}
