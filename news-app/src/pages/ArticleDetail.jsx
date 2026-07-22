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
import ArticleComparisonCarousel from '../components/ArticleComparisonCarousel'
import ArticleSources from '../components/ArticleSources'
import HeartButton from '../components/HeartButton'
import CommentSection from '../components/CommentSection'
import ArticleTranslator from '../components/ArticleTranslator'
import TranslationLineSkeleton from '../components/TranslationSkeleton'
import { translateArticleViaApi, shouldTranslateArticle, buildArticleTranslateSample } from '../lib/translate'
import useMediaQuery from '../hooks/useMediaQuery'
import ArticleViewCounter from '../components/ArticleViewCounter'
import HyperText from '../components/HyperText'
import ArticlePagedContent from '../components/ArticlePagedContent'
import Lens from '../components/Lens'
import ScrollProgress from '../components/ScrollProgress'
import { embedVideosInHtml } from '../lib/videoEmbeds'
import { findAllCoverComparisonImages } from '../lib/mediaComparison'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { usePerformanceProfile } from '../context/PerformanceProfileContext'
import './ArticleDetail.css'

const LENS_PREF_KEY = 'icue-article-lens-enabled'

function useLensCapable(disableLens = false) {
  const [capable, setCapable] = useState(false)

  useEffect(() => {
    if (disableLens) {
      setCapable(false)
      return undefined
    }
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
  }, [disableLens])

  return capable
}

function readLensPreference() {
  try {
    const stored = localStorage.getItem(LENS_PREF_KEY)
    return stored === null ? false : stored === 'true'
  } catch {
    return false
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
  const profile = usePerformanceProfile()
  const { disableLens, showScrollProgress, hyperTextScramble, disableParallax } = profile
  const lensCapable = useLensCapable(disableLens)
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
  const [translateResolved, setTranslateResolved] = useState(false)
  const [pageProgress, setPageProgress] = useState(null)
  const isMobileLayout = useMediaQuery('(max-width: 860px)')

  useDocumentTitle(state === 'ready' && article?.title ? article.title : null)

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
    setTranslateResolved(false)
    setPageProgress(null)
    fetchArticleBySlug(slug)
      .then((data) => {
        if (!active) return
        if (!data) return setState('error')
        setArticle(data)
        setViewCount(data.view_count ?? 0)
        setState('ready')
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
    setTranslateResolved(false)
  }, [i18n.resolvedLanguage])

  const translateSample = useMemo(
    () => buildArticleTranslateSample(article),
    [article],
  )

  useEffect(() => {
    if (state !== 'ready' || !article?.id || showOriginal) return undefined

    const uiLang = i18n.resolvedLanguage
    if (!shouldTranslateArticle(article.language, uiLang, translateSample)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranslation(null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranslatedLang(null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranslateBusy(false)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranslateResolved(true)
      return undefined
    }

    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslateBusy(true)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslateError(false)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslateResolved(false)
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
            sources: result.sources,
          })
          setTranslatedLang(uiLang)
        }
      })
      .catch(() => active && setTranslateError(true))
      .finally(() => {
        if (active) {
          setTranslateBusy(false)
          setTranslateResolved(true)
        }
      })

    return () => { active = false }
  }, [article, state, i18n.resolvedLanguage, showOriginal, translateAttempt, translateSample])

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

  const coverComparisonPairs = useMemo(
    () => findAllCoverComparisonImages(
      article?.cover_image_url,
      images,
      article?.cover_comparison,
      article?.cover_image_alt_url,
    ),
    [article?.cover_image_url, article?.cover_image_alt_url, article?.cover_comparison, images],
  )

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

  const handlePageChange = useCallback((pageIndex, totalPages) => {
    if (totalPages <= 1) {
      setPageProgress(null)
      return
    }
    setPageProgress((pageIndex + 1) / totalPages)
  }, [])

  if (state === 'loading') {
    return (
      <div className="route-loading">
        <span className="spin" />
      </div>
    )
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
  const needsTranslation = shouldTranslateArticle(
    article.language,
    i18n.resolvedLanguage,
    translateSample,
  ) && !showOriginal
  const isTranslating = needsTranslation && !usingTranslation && !translateResolved && !translateError
  const displayTitle = normalizeUnicode(usingTranslation ? translation.title : article.title)
  const displaySubtitle = normalizeUnicode(usingTranslation ? translation.subtitle : article.subtitle)
  const lensEnabled = lensCapable && lensOn
  const hasLensPhotos = Boolean(article.cover_image_url) || coverComparisonPairs.length > 0 || images.length > 0
  const showLensToggle = lensCapable && hasLensPhotos
  const showTranslatorBar =
    needsTranslation
    || translateBusy
    || translateError
    || Boolean(translatedLang && translation)
    || (showOriginal && Boolean(translatedLang))
  const showToolsBar = showLensToggle || showTranslatorBar || (isMobileLayout && needsTranslation)
  const contentLang = usingTranslation && translatedLang ? translatedLang : article.language
  const isViContent = String(contentLang || '').startsWith('vi')

  return (
    <article
      className={`article-detail${isViContent ? ' article-detail--vi' : ''}`}
      lang={contentLang}
    >
      {showScrollProgress ? (
        <ScrollProgress progress={pageProgress ?? undefined} />
      ) : null}
      <div className="article-detail__head icue-container">
        {article.status === 'draft' && <span className="article-detail__badge">{t('common.draft')}</span>}
        {isTranslating ? (
          <h1 className="article-detail__title">
            <TranslationLineSkeleton
              lines={2}
              className="translation-skeleton--title"
            />
          </h1>
        ) : (
          <HyperText
            as="h1"
            className="article-detail__title translation-reveal"
            animateOnHover={false}
            duration={1200}
            delay={120}
            reduceMotion={!hyperTextScramble || usingTranslation}
          >
            {displayTitle}
          </HyperText>
        )}
        {isTranslating ? (
          <TranslationLineSkeleton
            lines={1}
            className="translation-skeleton--title article-detail__subtitle-skeleton"
          />
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

      {showToolsBar && (
        <div className={`article-detail__tools icue-readw${isMobileLayout ? ' article-detail__tools--mobile' : ''}`}>
          {showTranslatorBar && (
            <ArticleTranslator
              busy={translateBusy || (needsTranslation && !translateResolved && !translateError)}
              error={translateError}
              translationLang={translatedLang}
              showOriginal={showOriginal}
              onShowOriginal={() => setShowOriginal(true)}
              onShowTranslation={() => setShowOriginal(false)}
              onRetry={retryTranslation}
            />
          )}
          {showLensToggle && (
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
          )}
        </div>
      )}

      {coverComparisonPairs.length > 0 ? (
        <div className="article-detail__cover article-detail__cover--comparison">
          <ArticleComparisonCarousel
            pairs={coverComparisonPairs}
            fitContent
            disableParallax={disableParallax}
          />
        </div>
      ) : article.cover_image_url ? (
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
      ) : null}

      {isTranslating ? (
        <div className="article-detail__content icue-readw article-detail__content--translating">
          <TranslationLineSkeleton
            lines={8}
            className="translation-skeleton--article"
          />
        </div>
      ) : (
        <ArticlePagedContent
          key={`${displayContent.slice(0, 48)}-${usingTranslation ? 'tr' : 'orig'}`}
          html={displayContent}
          className="article-detail__content translation-reveal"
          contentKey={`${displayContent.slice(0, 48)}-${usingTranslation ? 'tr' : 'orig'}`}
          onPageChange={handlePageChange}
        />
      )}

      {!isTranslating && (
        <MediaGallery images={images} videos={videos} lensEnabled={lensEnabled} />
      )}

      <ArticleSources
        sources={article.sources}
        translatedSources={usingTranslation ? translation?.sources : null}
      />

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
