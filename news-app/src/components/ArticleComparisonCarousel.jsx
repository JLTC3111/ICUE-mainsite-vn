import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import useEmblaCarousel from 'embla-carousel-react'
import { bindEmblaParallax } from '../lib/emblaParallax'
import { usePerformanceProfile } from '../context/PerformanceProfileContext'
import useEmblaSelection from '../hooks/useEmblaSelection'
import ArticleImageComparison from './ArticleImageComparison'
import './ArticleComparisonCarousel.css'

const PARALLAX_LAYER_SELECTOR = '.article-comparison-parallax__layer'

export default function ArticleComparisonCarousel({
  pairs = [],
  fitContent = false,
  disableParallax: disableParallaxProp,
}) {
  const { t } = useTranslation()
  const { disableParallax: profileDisableParallax, reduceMotion: profileReduceMotion } = usePerformanceProfile()
  const disableParallax = disableParallaxProp ?? profileDisableParallax
  const reduceMotion = profileReduceMotion
  const tweenNodesRef = useRef([])
  const tweenFactorRef = useRef(0)

  const slideCount = pairs.length
  const useParallax = slideCount > 1 && !reduceMotion && !disableParallax

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: false,
    dragThreshold: 6,
    duration: reduceMotion ? 0 : 20,
    startIndex: 0,
  })

  const { selectedIndex } = useEmblaSelection(emblaApi)

  const scrollTo = useCallback(
    (index) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi],
  )

  useEffect(() => {
    if (!emblaApi || !useParallax) return undefined

    return bindEmblaParallax(emblaApi, {
      layerSelector: PARALLAX_LAYER_SELECTOR,
      tweenNodesRef,
      tweenFactorRef,
      enabled: true,
      tweenFactorBase: 0.42,
    })
  }, [emblaApi, useParallax, slideCount])

  useLayoutEffect(() => {
    if (!emblaApi) return undefined

    emblaApi.reInit()

    const id = requestAnimationFrame(() => {
      emblaApi.reInit()
    })

    return () => cancelAnimationFrame(id)
  }, [emblaApi, slideCount])

  if (!slideCount) return null

  if (slideCount === 1) {
    return (
      <ArticleImageComparison
        before={pairs[0].before}
        after={pairs[0].after}
        fitContent={fitContent}
      />
    )
  }

  return (
    <section
      className="article-comparison-parallax"
      aria-label={t('article.comparisonCarouselAria')}
    >
      <div className="article-comparison-parallax__wrap">
        <div className="article-comparison-parallax__viewport" ref={emblaRef}>
          <div className="article-comparison-parallax__container">
            {pairs.map((pair, index) => (
              <div
                key={`${pair.before.id}-${pair.after.id}`}
                className={`article-comparison-parallax__slide${index === selectedIndex ? ' is-active' : ''}`}
              >
                <div className="article-comparison-parallax__parallax">
                  <div className="article-comparison-parallax__layer">
                    <ArticleImageComparison
                      before={pair.before}
                      after={pair.after}
                      fitContent={fitContent}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="article-comparison-parallax__rail" aria-hidden="false">
          {pairs.map((pair, index) => (
            <button
              key={`${pair.before.id}-${pair.after.id}-dot`}
              type="button"
              className={`article-comparison-parallax__bar${index === selectedIndex ? ' is-active' : ''}`}
              aria-label={t('article.comparisonGoTo', { index: index + 1 })}
              aria-current={index === selectedIndex ? 'true' : undefined}
              onClick={() => scrollTo(index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
