import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { PAST_PROJECTS, pastProjectPath } from '../data/pastProjectsContent'
import { coverSrcSet, PAST_PROJECT_CARD_SIZES } from '../lib/responsiveImage'
import 'swiper/css'
import 'swiper/css/pagination'
import './PastProjectsPage.css'

const NARROW_QUERY = '(max-width: 1024px)'

function useNarrowViewport() {
  const [narrow, setNarrow] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(NARROW_QUERY).matches : false
  ))

  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY)
    const onChange = () => setNarrow(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return narrow
}

function ProjectCard({ project, copy, yearLabel }) {
  return (
    <Link
      to={pastProjectPath(project.id)}
      className="past-projects-card"
      data-aos="fade-up"
    >
      <div className="past-projects-card__media">
        <img
          src={project.cover}
          srcSet={coverSrcSet(project.cover, project.width)}
          sizes={PAST_PROJECT_CARD_SIZES}
          alt={copy.imageAlt}
          width={project.width}
          height={project.height}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="past-projects-card__info">
        <h2>{copy.title}</h2>
        <p className="past-projects-card__location">{copy.location}</p>
        <p className="past-projects-card__year">{yearLabel}: {project.year}</p>
        <p className="past-projects-card__scale">{copy.scale}</p>
      </div>
    </Link>
  )
}

export default function PastProjectsPage() {
  const { t } = useTranslation()
  const { theme = 'dark' } = useOutletContext() || {}
  const narrow = useNarrowViewport()
  const page = t('projects.page', { returnObjects: true })
  const items = t('projects.items', { returnObjects: true })

  const cards = PAST_PROJECTS.map((project) => (
    <ProjectCard
      key={project.id}
      project={project}
      copy={items[project.key]}
      yearLabel={page.yearCompleted}
    />
  ))

  return (
    <div className={`past-projects-page past-projects-page--${theme}`}>
      <header className="past-projects-hero">
        <h1>{page.title}</h1>
        <p className="past-projects-hero__lede">{page.description}</p>
      </header>

      {narrow ? (
        <Swiper
          className="past-projects-swiper"
          modules={[Pagination]}
          slidesPerView={1}
          spaceBetween={20}
          speed={280}
          autoHeight
          grabCursor
          pagination={{ clickable: true }}
        >
          {PAST_PROJECTS.map((project) => (
            <SwiperSlide key={project.id}>
              <ProjectCard
                project={project}
                copy={items[project.key]}
                yearLabel={page.yearCompleted}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <div className="past-projects-grid">{cards}</div>
      )}
    </div>
  )
}
