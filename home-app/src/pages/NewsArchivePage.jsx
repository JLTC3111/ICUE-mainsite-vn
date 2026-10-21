import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EffectCoverflow, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { withLocale } from '../../../shared/site-routes/mainSitePaths.js'
import ScrollVelocity from '../components/reactbits/ScrollVelocity'
import { useVisualEffectsTier } from '../hooks/useHeavyVisualEffects'
import {
  coverSrcSet,
  logoSrcSet,
  LOGO_SIZES,
  NEWS_CARD_SIZES,
} from '../lib/responsiveImage'
import { useArchiveCopy } from '../hooks/useArchiveCopy'
import {
  NEWS_ARCHIVE_CARDS,
  NEWS_ARCHIVE_LOGOS,
  getLocalizedCards,
  newsArchiveArticlePath,
  readNewsSliderIndex,
  saveNewsSliderIndex,
} from '../data/newsArchiveContent'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-coverflow'
import './NewsArchivePage.css'

const NARROW_QUERY = '(max-width: 1024px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const COVERFLOW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])
const NEWSROOM_CTA_HREF = 'https://icue.vn/newsroom/?from=vi-news'

function refreshCoverflowLoop(swiper) {
  if (!swiper?.params?.loop || swiper.destroyed) return
  swiper.loopFix()
  swiper.updateSlidesClasses()
  swiper.updateProgress()
  swiper.update()
}

function finalizeCoverflowInit(swiper, initialIndex, useLoop) {
  if (useLoop && initialIndex > 0) {
    swiper.slideToLoop(initialIndex, 0, false)
  }
  refreshCoverflowLoop(swiper)
  requestAnimationFrame(() => {
    if (swiper.destroyed) return
    refreshCoverflowLoop(swiper)
  })
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  ))

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}

function VietnamFlagIcon() {
  return (
    <svg
      className="news-archive-flag"
      width="18"
      height="18"
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M57.247 24.222c.973-2.628 1.254-5.134.555-7.383c-.322.029-.656.044-.998.044C46.562 16.883 28.46 4.006 27.09 2C21.445 10.223 9.613 16.545 4.265 23.635c-2.164 2.869-3.246 5.004-1.093 8.286l22.549 28.973c1.017 1.377 3.01 1.489 4.429.219c0 0 18.492-23.729 31.851-31.071c-1.004-1.961-2.675-3.918-4.754-5.82M25.328 54.754l-.094.065l-.085.074a5.768 5.768 0 0 0-.912 1.041L4.699 30.831c-1.407-2.177-1.008-3.323 1.063-6.067c2.349-3.113 6.103-6.135 10.078-9.334c4.132-3.326 8.388-6.75 11.514-10.646c5.16 4.246 19.593 13.621 28.932 13.964c1.12 10.997-21.682 29.536-30.958 36.006" fill="currentColor" />
      <path d="M19.993 14.158l25.205 19.75l.898-.804L20.649 13.57z" fill="currentColor" />
      <path d="M28.207 24.671l-10.316-8.632s-3.59 2.292-7.938 7.319l9.152 9.462l9.102-8.149" fill="currentColor" />
      <path d="M5.606 28.06l19.468 23.861l3.595-3.217L7.913 24.973s-1.809.979-2.307 3.087" fill="currentColor" />
      <path d="M27.42 29.428l11.309 10.27l3.593-3.217l-11.775-9.852z" fill="currentColor" />
      <path d="M21.166 35.027l10.377 11.104l3.592-3.216l-10.842-10.687z" fill="currentColor" />
      <path d="M27.857 10.756l-1.525 4.282l.956.696l4.855-4.347l-.95-.598l-3.345 2.995l1.479-4.174l-.992-.626l-4.627 4.142l.829.603z" fill="currentColor" />
      <path d="M32.012 19.179l.926-.831l-2.825-2.008l1.281-1.146l2.509 1.718l.891-.799l-2.537-1.694l1.058-.946l2.809 1.817l.912-.815l-3.884-2.452l-4.918 4.403z" fill="currentColor" />
      <path d="M35.021 21.371l3.839-2.325l1.257-.796l-.834 1.078l-2.47 3.351l1.193.869l7.388-3.799l-1.402-.885l-4.051 2.318l-1.034.626l.694-.913l2.401-3.287l-1.348-.85l-3.745 2.321l-.995.629l.685-.871l2.268-3.207l-1.264-.798l-3.661 5.753z" fill="currentColor" />
      <path d="M48.907 21.705c-.909-.571-1.758-.844-2.552-.828c-.788.017-1.434.254-1.943.71c-.559.5-.747 1.019-.563 1.557c.108.323.452.79 1.039 1.408l.607.638c.362.376.595.684.697.92c.1.239.051.448-.146.624c-.337.301-.776.358-1.315.174a3.844 3.844 0 0 1-.938-.515c-.57-.406-.847-.797-.84-1.174c.004-.206.117-.442.338-.708l-1.311-.914c-.591.529-.815 1.119-.667 1.774c.149.661.656 1.313 1.536 1.955c.877.643 1.75.987 2.608 1.025c.867.037 1.581-.191 2.131-.686c.54-.482.732-1 .578-1.551c-.098-.353-.373-.764-.817-1.232l-.995-1.05c-.379-.396-.605-.671-.682-.828c-.12-.239-.077-.45.13-.634c.225-.202.513-.284.865-.249c.357.035.729.178 1.118.428c.353.228.602.464.741.708c.215.368.155.723-.175 1.06l1.477.973c.614-.592.806-1.219.577-1.878c-.224-.653-.725-1.223-1.498-1.707" fill="currentColor" />
    </svg>
  )
}

function LogoRow({ logos }) {
  return (
    <span className="news-logo-velocity__row">
      {logos.map((logo) => (
        <a
          key={logo.src}
          href={logo.href}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
        >
          <img
            src={logo.src}
            srcSet={logoSrcSet(logo.src, logo.width)}
            sizes={LOGO_SIZES}
            alt={logo.alt}
            width={logo.width}
            height={logo.height}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </a>
      ))}
    </span>
  )
}

function ArchiveCard({ card, locationLabel, priority, lang }) {
  return (
    <Link to={newsArchiveArticlePath(card.id, lang)} className="card image-card">
      <div className="image-wrapper">
        <img
          src={card.cover}
          srcSet={coverSrcSet(card.cover, card.width)}
          sizes={NEWS_CARD_SIZES}
          alt={card.title}
          width={card.width}
          height={card.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
        />
      </div>
      <div className="card-info">
        <h3>
          <VietnamFlagIcon />
          {' '}
          {card.title}
        </h3>
        <p className="description">{card.description}</p>
        <p className="location">
          <strong>{locationLabel}:</strong>
          {' '}
          {card.location}
        </p>
        <p className="date">
          {card.dateIso ? <time dateTime={card.dateIso}>{card.date}</time> : card.date}
        </p>
      </div>
    </Link>
  )
}

export default function NewsArchivePage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language || i18n.resolvedLanguage || 'vi'
  const copy = t('newsArchive.page', { returnObjects: true })
  const archiveCopy = useArchiveCopy(lang)
  const cards = getLocalizedCards(archiveCopy, lang)
  const narrow = useMediaQuery(NARROW_QUERY)
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const effectsTier = useVisualEffectsTier()
  const useCoverflow = !narrow && effectsTier === 'full' && !reduceMotion
  const [coverflowSwiper, setCoverflowSwiper] = useState(null)
  const [activeIndex, setActiveIndex] = useState(() => readNewsSliderIndex(NEWS_ARCHIVE_CARDS.length))
  const [initialIndex] = useState(activeIndex)
  const newsroomHref = withLocale(NEWSROOM_CTA_HREF, lang)
  const activeCard = cards[activeIndex] || cards[0]
  const slideCount = cards.length
  const useLoop = useCoverflow && slideCount > 2

  useEffect(() => {
    saveNewsSliderIndex(activeIndex)
  }, [activeIndex])

  useEffect(() => {
    if (narrow || !coverflowSwiper) return undefined

    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (!COVERFLOW_KEYS.has(event.key)) return
      const target = event.target
      if (target instanceof Element && target.closest('input, textarea, select, option, [contenteditable="true"]')) {
        return
      }

      const wrap = coverflowSwiper.el?.closest('.news-coverflow-wrap')
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const inView = rect.top < window.innerHeight && rect.bottom > 0
      if (!inView) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        coverflowSwiper.slidePrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        coverflowSwiper.slideNext()
      } else if (event.key === 'Home') {
        event.preventDefault()
        if (useLoop) coverflowSwiper.slideToLoop(0)
        else coverflowSwiper.slideTo(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        if (useLoop) coverflowSwiper.slideToLoop(slideCount - 1)
        else coverflowSwiper.slideTo(slideCount - 1)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [coverflowSwiper, narrow, slideCount, useLoop])

  return (
    <div className="news-archive-page">
      <div className="news-logo-swiper-wrap">
        <ScrollVelocity
          texts={[<LogoRow key="logos" logos={NEWS_ARCHIVE_LOGOS} />]}
          velocity={40}
          numCopies={2}
          className="news-logo-velocity__item"
          parallaxClassName="news-logo-velocity"
          scrollerClassName="news-logo-velocity__track"
        />
      </div>

      <a className="new-news-cta" href={newsroomHref}>
        <div className="new-news-cta__text">
          <span className="new-news-cta__eyebrow">{copy.ctaEyebrow}</span>
          <strong className="new-news-cta__title">{copy.ctaTitle}</strong>
          <span className="new-news-cta__sub">{copy.ctaSub}</span>
        </div>
        <span className="new-news-cta__btn">{copy.ctaButton}</span>
      </a>

      {narrow ? (
        <div className="news-archive-grid news-cards-swiper-active">
          <Swiper
            className="news-cards-swiper"
            modules={[Pagination]}
            slidesPerView={1}
            spaceBetween={20}
            speed={280}
            resistanceRatio={0.55}
            threshold={8}
            grabCursor
            watchOverflow
            initialSlide={initialIndex}
            pagination={{ clickable: true }}
            onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          >
            {cards.map((card, index) => (
              <SwiperSlide key={card.id}>
                <ArchiveCard
                  card={card}
                  locationLabel={copy.locationLabel}
                  priority={index === activeIndex}
                  lang={lang}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      ) : (
        <div className="news-archive-grid news-coverflow-active">
          <div
            className="news-coverflow-wrap"
            role="region"
            aria-roledescription="carousel"
            aria-label={copy.carouselLabel}
            tabIndex={0}
          >
            <Swiper
              key={useCoverflow ? 'coverflow' : 'flat'}
              className={`news-coverflow-swiper${useCoverflow ? '' : ' news-coverflow-swiper--flat'}`}
              modules={useCoverflow ? [EffectCoverflow, Pagination] : [Pagination]}
              effect={useCoverflow ? 'coverflow' : undefined}
              grabCursor
              centeredSlides
              slidesPerView="auto"
              speed={reduceMotion ? 0 : 320}
              resistanceRatio={0.72}
              threshold={6}
              longSwipesMs={260}
              loop={useLoop}
              loopAdditionalSlides={useLoop ? 2 : 0}
              loopAddBlankSlides={useLoop}
              watchSlidesProgress={useCoverflow}
              initialSlide={useLoop ? 0 : initialIndex}
              coverflowEffect={useCoverflow ? {
                rotate: 42,
                stretch: -22,
                depth: 170,
                modifier: 1.08,
                slideShadows: false,
              } : undefined}
              pagination={{ clickable: true }}
              onSwiper={(swiper) => {
                setCoverflowSwiper(swiper)
                if (useCoverflow) finalizeCoverflowInit(swiper, initialIndex, useLoop)
              }}
              onSlideChange={(swiper) => {
                const index = typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex
                setActiveIndex(index)
              }}
              onSlideChangeTransitionEnd={(swiper) => {
                if (!useCoverflow || !useLoop) return
                const index = typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex
                if (index === 0 || index === slideCount - 1) {
                  refreshCoverflowLoop(swiper)
                }
              }}
            >
              {cards.map((card, index) => (
                <SwiperSlide key={card.id}>
                  <Link to={newsArchiveArticlePath(card.id, lang)} className="card image-card">
                    <div className="image-wrapper">
                      <img
                        src={card.cover}
                        srcSet={coverSrcSet(card.cover, card.width)}
                        sizes={NEWS_CARD_SIZES}
                        alt={card.title}
                        width={card.width}
                        height={card.height}
                        loading={index === activeIndex ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={index === activeIndex ? 'high' : 'low'}
                      />
                    </div>
                    <span className="news-coverflow-rank" aria-hidden="true">{index + 1}</span>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>

            {activeCard ? (
              <div className="news-coverflow-info" aria-live="polite">
                <div className="news-coverflow-info__text">
                  <h2 className="news-coverflow-info__title">{activeCard.title}</h2>
                  <p className="news-coverflow-info__meta">
                    {activeCard.dateIso ? (
                      <time dateTime={activeCard.dateIso}>{activeCard.date}</time>
                    ) : activeCard.date}
                    {'  ·  '}
                    {copy.locationLabel}
                    {': '}
                    {activeCard.location}
                  </p>
                </div>
                <Link className="news-coverflow-info__btn" to={newsArchiveArticlePath(activeCard.id, lang)}>
                  {copy.readArticle}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
