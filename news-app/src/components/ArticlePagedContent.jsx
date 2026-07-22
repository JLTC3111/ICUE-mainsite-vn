import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import { useTranslation } from 'react-i18next'
import ArticleTextReveal from './TextReveal'
import SlidingNumber from './magicui/SlidingNumber'
import { paginateArticleHtml } from '../lib/articlePagination'
import { applyArticleDropCap } from '../lib/articleDropCap'
import './ArticlePagedContent.css'

function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return reduceMotion
}

function readPageFromHash(totalPages) {
  const match = window.location.hash.match(/^#page-(\d+)$/i)
  if (!match) return 0
  const index = Number.parseInt(match[1], 10) - 1
  if (!Number.isFinite(index) || index < 0 || index >= totalPages) return 0
  return index
}

function PageCounter({ page, total, reduceMotion }) {
  const { t } = useTranslation()

  return (
    <p className="article-pages__counter" aria-live="polite">
      <span className="visually-hidden">
        {t('article.pageOf', { current: page + 1, total })}
      </span>
      <SlidingNumber
        value={page + 1}
        reduceMotion={reduceMotion}
        className="article-pages__counter-current"
      />
      <span className="article-pages__counter-sep" aria-hidden>/</span>
      <span className="article-pages__counter-total" aria-hidden>{total}</span>
    </p>
  )
}

export default function ArticlePagedContent({
  html,
  className,
  contentKey,
  onPageChange,
}) {
  const { t } = useTranslation()
  const pages = useMemo(() => paginateArticleHtml(html), [html])
  const reduceMotion = useReducedMotion()
  const rootRef = useRef(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [arrowsVisible, setArrowsVisible] = useState(false)

  const totalPages = pages.length
  const isMultipage = totalPages > 1

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragThreshold: 8,
    duration: reduceMotion ? 0 : 24,
    startIndex: 0,
  })

  const syncIndex = useCallback(() => {
    if (!emblaApi) return
    const index = emblaApi.selectedScrollSnap()
    setSelectedIndex(index)
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
    onPageChange?.(index, totalPages)
  }, [emblaApi, onPageChange, totalPages])

  useEffect(() => {
    if (!emblaApi || !isMultipage) return undefined

    syncIndex()
    emblaApi.on('select', syncIndex)
    emblaApi.on('reInit', syncIndex)

    return () => {
      emblaApi.off('select', syncIndex)
      emblaApi.off('reInit', syncIndex)
    }
  }, [emblaApi, isMultipage, syncIndex])

  useLayoutEffect(() => {
    if (!emblaApi || !isMultipage) return undefined

    const syncViewportHeight = () => {
      const viewport = emblaApi.rootNode()
      const slide = emblaApi.slideNodes()[emblaApi.selectedScrollSnap()]
      if (!viewport || !slide) return
      viewport.style.height = `${slide.offsetHeight}px`
    }

    emblaApi.reInit()
    syncIndex()
    syncViewportHeight()

    emblaApi.on('select', syncViewportHeight)
    emblaApi.on('reInit', syncViewportHeight)

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => syncViewportHeight())
      : null

    emblaApi.slideNodes().forEach((slide) => resizeObserver?.observe(slide))

    const id = requestAnimationFrame(() => {
      emblaApi.reInit()
      syncIndex()
      syncViewportHeight()
    })

    return () => {
      cancelAnimationFrame(id)
      emblaApi.off('select', syncViewportHeight)
      emblaApi.off('reInit', syncViewportHeight)
      resizeObserver?.disconnect()
      const viewport = emblaApi.rootNode()
      if (viewport) viewport.style.height = ''
    }
  }, [contentKey, emblaApi, isMultipage, pages.length, selectedIndex, syncIndex])

  useEffect(() => {
    if (!emblaApi || !isMultipage) return
    const index = readPageFromHash(totalPages)
    emblaApi.scrollTo(index, true)
    setSelectedIndex(index)
  }, [contentKey, emblaApi, isMultipage, totalPages])

  useLayoutEffect(() => {
    if (!rootRef.current) return undefined

    rootRef.current.querySelectorAll('.article-detail__content--paged').forEach((slide, index) => {
      applyArticleDropCap(slide, { enabled: index === 0 })
    })

    return undefined
  }, [contentKey, pages, selectedIndex])

  useEffect(() => {
    if (!isMultipage || !rootRef.current) return undefined

    const node = rootRef.current
    const observer = new IntersectionObserver(
      ([entry]) => setArrowsVisible(entry.isIntersecting),
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [isMultipage, contentKey])
  useEffect(() => {
    if (!isMultipage) return undefined
    const hash = `#page-${selectedIndex + 1}`
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }
  }, [selectedIndex, isMultipage])

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev()
    rootRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
  }, [emblaApi, reduceMotion])

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext()
    rootRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
  }, [emblaApi, reduceMotion])

  useEffect(() => {
    if (!isMultipage) return undefined
    const onKey = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        scrollPrev()
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        scrollNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMultipage, scrollNext, scrollPrev])

  if (!isMultipage) {
    return (
      <ArticleTextReveal
        key={contentKey}
        html={html}
        className={className}
        finishBy={0.4}
      />
    )
  }

  return (
    <section
      ref={rootRef}
      className={`article-pages${arrowsVisible ? ' is-arrows-visible' : ''}`}
      aria-label={t('article.pageNav')}
    >
      <PageCounter page={selectedIndex} total={totalPages} reduceMotion={reduceMotion} />

      <div className="article-pages__reader">
        <div className="article-pages__viewport" ref={emblaRef}>
          <div className="article-pages__container">
            {pages.map((pageHtml, index) => (
              <article
                key={`${contentKey}-page-${index}`}
                className={`article-pages__slide${index === selectedIndex ? ' is-active' : ''}`}
                aria-hidden={index !== selectedIndex}
              >
                <div
                  className={`${className} article-detail__content--paged`}
                  dangerouslySetInnerHTML={{ __html: pageHtml }}
                />
              </article>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="article-pages__side-arrow article-pages__side-arrow--prev"
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label={t('article.prevPage')}
      >
        <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
      </button>

      <button
        type="button"
        className="article-pages__side-arrow article-pages__side-arrow--next"
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label={t('article.nextPage')}
      >
        <ChevronRight size={22} strokeWidth={2.2} aria-hidden />
      </button>
    </section>
  )
}
