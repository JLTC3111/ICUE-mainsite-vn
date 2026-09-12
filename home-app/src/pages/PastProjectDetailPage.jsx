import { useCallback, useEffect, useId, useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import {
  gallerySlideSrc,
  getAdjacentPastProjects,
  getPastProject,
  pastProjectHeroMedia,
  pastProjectPath,
} from '../data/pastProjectsContent'
import { heroSrcSet, PAST_PROJECT_HERO_SIZES } from '../lib/responsiveImage'
import { ROUTE_PATHS } from '../lib/routes'
import { useDesktopFinePointer, useDesktopScrollExpand } from '../hooks/useHeavyVisualEffects'
import { useSwiperNavContrast } from '../hooks/useSwiperNavContrast'
import ScrollExpand from '../components/reactbits/ScrollExpand'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import './PastProjectsPage.css'

function ProjectDetailHero({ expand, src, srcSet, sizes, width, height, alt, title, location, year }) {
  const meta = (
    <p className="past-project-detail__hero-meta">
      {location}
      <span aria-hidden="true"> · </span>
      {year}
    </p>
  )

  if (expand) {
    return (
      <ScrollExpand
        className="past-project-detail__expand"
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        title={title}
        useWindowScroll
        enabled
        startRadius={0}
        scrollDistance={0.8}
        holdDistance={0.2}
        overlayScrim={0.45}
      >
        {meta}
      </ScrollExpand>
    )
  }

  return (
    <div className="past-project-detail__hero-static">
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        decoding="async"
        fetchPriority="high"
      />
      <div className="past-project-detail__hero-static-copy" aria-hidden="true">
        <p className="past-project-detail__hero-static-title">{title}</p>
        {meta}
      </div>
    </div>
  )
}

export default function PastProjectDetailPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { theme = 'dark' } = useOutletContext() || {}
  const expandEnabled = useDesktopScrollExpand()
  const desktopGallery = useDesktopFinePointer()
  const project = getPastProject(projectId)
  const page = t('projects.page', { returnObjects: true })
  const items = t('projects.items', { returnObjects: true })
  const copy = project ? items[project.key] : null
  const { previous, next } = getAdjacentPastProjects(projectId)
  const images = project?.images ?? []
  const hero = project ? pastProjectHeroMedia(project) : null
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [swiper, setSwiper] = useState(null)
  const titleId = useId()
  const lightboxImage = lightboxIndex == null ? null : images[lightboxIndex]
  const lightboxSrc = lightboxImage?.src
  const canStepLightbox = images.length > 1

  useSwiperNavContrast(swiper, theme)

  const stepLightbox = useCallback((delta) => {
    setLightboxIndex((current) => {
      if (current == null || images.length < 2) return current
      return (current + delta + images.length) % images.length
    })
  }, [images.length])

  useEffect(() => {
    setLightboxIndex(null)
  }, [projectId])

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

  if (!project || !copy) {
    return <Navigate to={ROUTE_PATHS.pastProjects} replace />
  }

  return (
    <div className={`past-projects-page past-projects-page--detail past-projects-page--${theme}`}>
      <article className="past-project-detail" aria-labelledby={titleId}>
        <div className={`past-project-detail__hero${expandEnabled ? ' past-project-detail__hero--expand' : ''}`}>
          <div className="past-project-detail__back-slot">
            <Link className="past-project-detail__back past-project-detail__back--hero" to={ROUTE_PATHS.pastProjects}>
              {page.backToList}
            </Link>
          </div>
          <ProjectDetailHero
            key={project.id}
            expand={expandEnabled}
            src={hero.src}
            srcSet={heroSrcSet(hero.src, hero.width)}
            sizes={PAST_PROJECT_HERO_SIZES}
            width={hero.width}
            height={hero.height}
            alt={copy.imageAlt}
            title={copy.title}
            location={copy.location}
            year={project.year}
          />
        </div>

        <div className="past-project-detail__content">
          <Link className="past-project-detail__back" to={ROUTE_PATHS.pastProjects}>
            {page.backToList}
          </Link>

          <div className="past-project-detail__body">
            <h1 id={titleId}>{copy.title}</h1>
            <p><strong>{page.descriptionLabel}:</strong> {copy.body}</p>
            <p><strong>{page.locationLabel}:</strong> {copy.location}</p>
            <p><strong>{page.yearCompleted}:</strong> {project.year}</p>
          </div>
        </div>

        <div className={`past-project-detail__gallery${desktopGallery ? ' past-project-detail__gallery--desktop' : ''}`}>
          <Swiper
            className="past-project-gallery"
            modules={[Navigation, Pagination]}
            loop={images.length > 1}
            spaceBetween={12}
            navigation
            pagination={{ clickable: true }}
            onSwiper={setSwiper}
          >
            {images.map((image, index) => (
              <SwiperSlide key={image.src}>
                <button
                  type="button"
                  className="past-project-gallery__trigger"
                  onClick={() => setLightboxIndex(index)}
                >
                  <img
                    src={gallerySlideSrc(image, desktopGallery)}
                    width={image.width}
                    height={image.height}
                    alt={`${copy.title} — ${index + 1}`}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <nav className="past-project-detail__nav" aria-label={page.articleNav}>
          {previous ? (
            <Link to={pastProjectPath(previous.id)}>
              <ChevronLeft size={18} aria-hidden="true" />
              {page.previous}
            </Link>
          ) : <span />}
          {next ? (
            <Link to={pastProjectPath(next.id)}>
              {page.next}
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ) : <span />}
        </nav>
      </article>

      {lightboxSrc ? (
        <div
          className="past-project-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={copy.title}
          onClick={(event) => {
            if (event.target === event.currentTarget) setLightboxIndex(null)
          }}
        >
          <button
            type="button"
            className="past-project-lightbox__close"
            onClick={() => setLightboxIndex(null)}
            aria-label={page.closeImage}
          >
            <X size={28} aria-hidden="true" />
          </button>
          {canStepLightbox ? (
            <button
              type="button"
              className="past-project-lightbox__prev"
              onClick={() => stepLightbox(-1)}
              aria-label={page.previousImage}
            >
              <ChevronLeft size={36} aria-hidden="true" />
            </button>
          ) : null}
          <img
            src={lightboxSrc}
            width={lightboxImage.width}
            height={lightboxImage.height}
            alt={`${copy.title} — ${lightboxIndex + 1}`}
          />
          {canStepLightbox ? (
            <button
              type="button"
              className="past-project-lightbox__next"
              onClick={() => stepLightbox(1)}
              aria-label={page.nextImage}
            >
              <ChevronRight size={36} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
