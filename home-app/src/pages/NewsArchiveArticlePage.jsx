import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { sanitizeArticleHtml } from '@icue/text/sanitizeArticleHtml'
import ScrollReveal from '../components/reactbits/ScrollReveal'
import { renderArchiveMarkdown } from '../lib/archiveMarkdown'
import { getAdjacentNewsArchiveArticles, getNewsArchiveArticle } from '../data/newsArchiveArticles'
import { isArchiveVideo, newsArchiveArticlePath, newsArchiveListPath } from '../data/newsArchiveContent'
import { useArchiveCopy } from '../hooks/useArchiveCopy'
import { useSwiperNavContrast } from '../hooks/useSwiperNavContrast'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import './NewsArchivePage.css'

function ArchiveVideo({ src, poster, caption, playLabel }) {
  const [active, setActive] = useState(false)

  return (
    <figure className="news-archive-gallery__media">
      {active ? (
        <video
          src={src}
          poster={poster || undefined}
          controls
          autoPlay
          playsInline
          preload="auto"
        />
      ) : (
        <button
          type="button"
          className="news-archive-gallery__video-poster"
          onClick={() => setActive(true)}
          aria-label={playLabel}
        >
          {poster ? (
            <img src={poster} alt="" decoding="async" />
          ) : (
            <span className="news-archive-gallery__video-fallback" />
          )}
          <span className="news-archive-gallery__play" aria-hidden="true" />
        </button>
      )}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

export default function NewsArchiveArticlePage() {
  const { articleId } = useParams()
  const { t, i18n } = useTranslation()
  const lang = i18n.language || i18n.resolvedLanguage || 'vi'
  const copy = t('newsArchive.page', { returnObjects: true })
  const archiveCopy = useArchiveCopy(lang)
  const article = getNewsArchiveArticle(articleId, archiveCopy)
  const { previous, next } = getAdjacentNewsArchiveArticles(articleId)
  const images = article?.images ?? []
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [swiper, setSwiper] = useState(null)
  const titleId = useId()
  const expandEnabled = images.length > 1
  const hasVideo = images.some((item) => isArchiveVideo(item))
  const lightboxItem = lightboxIndex == null ? null : images[lightboxIndex]
  const canStepLightbox = images.length > 1

  useSwiperNavContrast(swiper)

  const bodyHtml = useMemo(() => {
    if (!article?.bodyMarkdown) return ''
    return sanitizeArticleHtml(renderArchiveMarkdown(article.bodyMarkdown))
  }, [article])

  const stepLightbox = useCallback((delta) => {
    setLightboxIndex((current) => {
      if (current == null || images.length < 2) return current
      return (current + delta + images.length) % images.length
    })
  }, [images.length])

  useEffect(() => {
    setLightboxIndex(null)
  }, [articleId])

  useEffect(() => {
    if (lightboxIndex == null) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setLightboxIndex(null)
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        stepLightbox(1)
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        stepLightbox(-1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [lightboxIndex, stepLightbox])

  if (!article) {
    return <Navigate to={newsArchiveListPath(lang)} replace />
  }

  return (
    <div className="news-archive-page news-archive-page--article">
      <article key={`${article.id}-${lang}`} className="news-archive-article" lang={lang} aria-labelledby={titleId}>
        <Link className="news-archive-article__back" to={newsArchiveListPath(lang)}>
          {copy.backToList}
        </Link>

        <h1 id={titleId} className="article-title">{article.title}</h1>
        {article.lead ? <p className="lead">{article.lead}</p> : null}
        <div className="meta">
          {article.author ? <span>{article.author}</span> : null}
          {article.date ? <time dateTime={article.dateIso || undefined}>{article.date}</time> : null}
        </div>

        {images.length > 0 ? (
          <div className="news-archive-gallery-wrap">
            <Swiper
              className="news-archive-gallery"
              modules={[Navigation, Pagination]}
              loop={expandEnabled && !hasVideo}
              spaceBetween={12}
              navigation={expandEnabled}
              pagination={expandEnabled ? {
                clickable: true,
                el: '.news-archive-gallery-pagination',
              } : false}
              onSwiper={setSwiper}
            >
              {images.map((item, index) => {
                const video = isArchiveVideo(item)
                return (
                  <SwiperSlide key={`${item.src}-${index}`}>
                    {video ? (
                      <ArchiveVideo
                        src={item.src}
                        poster={item.poster || item.previewImage}
                        caption={item.caption}
                        playLabel={copy.playVideo || copy.videoLabel}
                      />
                    ) : (
                      <figure className="news-archive-gallery__media">
                        <button
                          type="button"
                          className="news-archive-gallery__trigger"
                          onClick={() => setLightboxIndex(index)}
                        >
                          <img
                            src={item.src}
                            alt={item.caption || article.title}
                            loading={index === 0 ? 'eager' : 'lazy'}
                          />
                        </button>
                        {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                      </figure>
                    )}
                  </SwiperSlide>
                )
              })}
            </Swiper>
            {expandEnabled ? (
              <div className="news-archive-gallery-pagination" />
            ) : null}
          </div>
        ) : null}

        <ScrollReveal html={bodyHtml} enableBlur={false} containerClassName="article-body" />

        {article.pdf ? (
          <div className="dlbtn-container">
            <a className="download-btn" href={article.pdf} download>
              {article.pdfButtonText || copy.download}
            </a>
          </div>
        ) : null}

        <nav className="news-archive-article__nav" aria-label={copy.articleNav}>
          {previous ? (
            <Link to={newsArchiveArticlePath(previous.id, lang)}>
              <ChevronLeft size={18} aria-hidden="true" />
              {copy.previous}
            </Link>
          ) : <span />}
          {next ? (
            <Link to={newsArchiveArticlePath(next.id, lang)}>
              {copy.next}
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ) : <span />}
        </nav>
      </article>

      {lightboxItem && !isArchiveVideo(lightboxItem) ? (
        <div
          className="news-archive-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={article.title}
          onClick={(event) => {
            if (event.target === event.currentTarget) setLightboxIndex(null)
          }}
        >
          <button
            type="button"
            className="news-archive-lightbox__close"
            onClick={() => setLightboxIndex(null)}
            aria-label={copy.closeImage}
          >
            <X size={28} aria-hidden="true" />
          </button>
          {canStepLightbox ? (
            <button
              type="button"
              className="news-archive-lightbox__prev"
              onClick={() => stepLightbox(-1)}
              aria-label={copy.previousImage}
            >
              <ChevronLeft size={36} aria-hidden="true" />
            </button>
          ) : null}
          <img
            src={lightboxItem.src}
            alt={lightboxItem.caption || article.title}
          />
          {canStepLightbox ? (
            <button
              type="button"
              className="news-archive-lightbox__next"
              onClick={() => stepLightbox(1)}
              aria-label={copy.nextImage}
            >
              <ChevronRight size={36} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
