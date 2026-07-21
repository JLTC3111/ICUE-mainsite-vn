import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ScanSearch } from 'lucide-react'
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
import TranslationLineSkeleton from '../components/TranslationSkeleton'
import { translateArticleViaApi, shouldTranslateArticle } from '../lib/translate'
import ArticleViewCounter from '../components/ArticleViewCounter'
import HyperText from '../components/HyperText'
import ArticleTextReveal from '../components/TextReveal'
import Lens from '../components/Lens'
import ScrollProgress from '../components/ScrollProgress'
import { embedVideosInHtml } from '../lib/videoEmbeds'
import './ArticleDetail.css'

const LENS_PREF_KEY = 'icue-article-lens-enabled'

function useLensCapable() {
  const [capable, setCapable] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setCapable(fine.matches && !motion.matches)
    sync()
    fine.addEventListener('change', sync)
    motion.addEventListener('change', sync)
    return () => {
      fine.removeEventListener('change', sync)
      motion.removeEventListener('change', sync)
    }
  }, [])

  return capable
}

function readLensPreference() {
  try {
    const stored = localStorage.getItem(LENS_PREF_KEY)
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

function writeLensPreference(enabled) {
  try {
    localStorage.setItem(LENS_PREF_KEY, String(enabled))
  } catch {
    // ignore storage errors
  }
}

export default function ArticleDetail() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const lensCapable = useLensCapable()
  const [lensOn, setLensOn] = useState(readLensPreference)

  const [article, setArticle] = useState(null)
  const [state, setState] = useState('loading')
  const [viewCount, setViewCount] = useState(0)
  const [translation, setTranslation] = useState(null)
  const [translatedLang, setTranslatedLang] = useState(null)
  const [translateBusy, setTranslateBusy] = useState(false)
  const [translateError, setTranslateError] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [translateAttempt, setTranslateAttempt] = useState(0)

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState('loading')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslation(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslatedLang(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowOriginal(false)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslateError(false)
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

  useEffect(() => {
    setShowOriginal(false)
    setTranslateError(false)
  }, [i18n.resolvedLanguage])

  useEffect(() => {
    if (state !== 'ready' || !article?.id || showOriginal) return undefined

    const uiLang = i18n.resolvedLanguage
    if (!shouldTranslateArticle(article.language, uiLang, article.title)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranslation(null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranslatedLang(null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranslateBusy(false)
      return undefined
    }

    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslateBusy(true)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslateError(false)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslation(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslatedLang(null)

    translateArticleViaApi(article.id, uiLang)
      .then((result) => {
        if (!active) return
        if (result.original) {
          setTranslation(null)
          setTranslatedLang(null)
        } else {
          setTranslation({
            title: result.title,
            subtitle: result.subtitle,
            content_html: result.content_html,
          })
          setTranslatedLang(uiLang)
        }
      })
      .catch(() => active && setTranslateError(true))
      .finally(() => active && setTranslateBusy(false))

    return () => { active = false }
  }, [article, state, i18n.resolvedLanguage, showOriginal, translateAttempt])

  const retryTranslation = useCallback(() => {
    setShowOriginal(false)
    setTranslateError(false)
    setTranslateAttempt((attempt) => attempt + 1)
  }, [])

  const { images, videos } = useMemo(() => {
    const media = (article?.media || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0))
    return {
      images: media.filter((m) => m.kind === 'image'),
      videos: media.filter((m) => m.kind === 'video'),
    }
  }, [article])

  const displayContent = useMemo(() => {
    const usingTranslation = translation && !showOriginal
    const raw = usingTranslation ? translation.content_html : article?.content_html
    return normalizeHtmlUnicode(embedVideosInHtml(raw || ''))
  }, [translation, showOriginal, article?.content_html])

  const toggleLens = useCallback(() => {
    setLensOn((prev) => {
      const next = !prev
      writeLensPreference(next)
      return next
    })
  }, [])

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

  const usingTranslation = translation && !showOriginal
  const needsTranslation = shouldTranslateArticle(article.language, i18n.resolvedLanguage, article.title) && !showOriginal
  const isTranslating = needsTranslation && translateBusy && !usingTranslation
  const displayTitle = normalizeUnicode(usingTranslation ? translation.title : article.title)
  const displaySubtitle = normalizeUnicode(usingTranslation ? translation.subtitle : article.subtitle)
  const lensEnabled = lensCapable && lensOn
  const hasLensPhotos = Boolean(article.cover_image_url) || images.length > 0

  return (
    <article className="article-detail">
      <ScrollProgress />
      <div className="article-detail__head icue-container">
        {article.status === 'draft' && <span className="article-detail__badge">{t('common.draft')}</span>}
        {isTranslating ? (
          <h1 className="article-detail__title">
            <TranslationLineSkeleton lines={2} className="translation-skeleton--title" />
          </h1>
        ) : (
          <HyperText
            as="h1"
            className="article-detail__title translation-reveal"
            animateOnHover={false}
            duration={1200}
            delay={120}
          >
            {displayTitle}
          </HyperText>
        )}
        {isTranslating ? (
          <TranslationLineSkeleton lines={1} className="translation-skeleton--title article-detail__subtitle-skeleton" />
        ) : (
          displaySubtitle && <p className="article-detail__subtitle translation-reveal">{displaySubtitle}</p>
        )}

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
        busy={translateBusy}
        error={translateError}
        activeLang={usingTranslation ? translatedLang : null}
        showOriginal={showOriginal && Boolean(translatedLang || shouldTranslateArticle(article.language, i18n.resolvedLanguage, article.title))}
        onShowOriginal={() => setShowOriginal(true)}
        onRetry={retryTranslation}
      />

      {lensCapable && hasLensPhotos && (
        <div className="article-detail__lens-bar icue-readw">
          <button
            type="button"
            className={`article-detail__lens-toggle${lensOn ? ' is-on' : ''}`}
            onClick={toggleLens}
            aria-pressed={lensOn}
          >
            <ScanSearch size={16} strokeWidth={2} aria-hidden />
            <span>{t('article.lensToggle')}</span>
            <span className="article-detail__lens-state">
              {lensOn ? t('article.lensOn') : t('article.lensOff')}
            </span>
          </button>
        </div>
      )}

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

      {isTranslating ? (
        <div className="article-detail__content icue-readw article-detail__content--translating">
          <TranslationLineSkeleton lines={8} className="translation-skeleton--article" />
        </div>
      ) : (
        <ArticleTextReveal
          key={`${displayContent.slice(0, 48)}-${usingTranslation ? 'tr' : 'orig'}`}
          html={displayContent}
          className="article-detail__content icue-readw translation-reveal"
          finishBy={0.4}
        />
      )}

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
