import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
import ProjectLightbox from '../components/ProjectLightbox'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import './PastProjectsPage.css'

function ProjectDetailHero({ expand, src, srcSet, sizes, width, height, alt, title, location, year, scrollHint, photo, photoCredit, mediaTitle }) {
  const meta = (
    <p className="past-project-detail__hero-meta">
      {location}
      <span aria-hidden="true"> · </span>
      {year}
      {photo ? (
        <span className="past-project-detail__photo-credit">
          <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" title={photo.title}>
            {photoCredit}: {photo.author}
          </a>
          <span aria-hidden="true"> · </span>
          <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">
            {photo.license}
          </a>
        </span>
      ) : null}
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
        mediaTitle={mediaTitle}
        scrollHint={scrollHint}
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
        title={mediaTitle}
        decoding="async"
        fetchPriority="high"
      />
      <div className="past-project-detail__hero-static-copy">
        <p className="past-project-detail__hero-static-title" aria-hidden="true">{title}</p>
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
  const lightboxTriggerRef = useRef(null)
  const titleId = useId()

  useSwiperNavContrast(swiper, theme)

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  useEffect(() => {
    setLightboxIndex(null)
  }, [projectId])

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
            alt={project.photo ? t('projects.page.illustrationAlt', { location: project.photo.region }) : copy.imageAlt}
            title={copy.title}
            mediaTitle={project.photo ? `${page.photoCredit}: ${project.photo.title} — ${project.photo.author} (${project.photo.license})` : undefined}
            location={copy.location}
            year={project.year}
            scrollHint={page.scrollHint}
            photo={project.photo}
            photoCredit={page.photoCredit}
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
                  aria-haspopup="dialog"
                  onClick={(event) => {
                    lightboxTriggerRef.current = event.currentTarget
                    setLightboxIndex(index)
                  }}
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

      {lightboxIndex != null && images[lightboxIndex] ? (
        <ProjectLightbox
          key={project.id}
          images={images}
          initialIndex={lightboxIndex}
          title={copy.title}
          labels={page}
          onClose={closeLightbox}
          returnFocus={lightboxTriggerRef.current}
        />
      ) : null}
    </div>
  )
}
