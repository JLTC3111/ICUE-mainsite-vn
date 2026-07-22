import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ImageComparison,
  ImageComparisonImage,
  ImageComparisonSlider,
} from './motion-primitives/ImageComparison'
import './ArticleImageComparison.css'

function useComparisonMotion() {
  const [reduceMotion, setReduceMotion] = useState(false)
  const [hoverCapable, setHoverCapable] = useState(false)

  useEffect(() => {
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const hoverMq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => {
      setReduceMotion(motionMq.matches)
      setHoverCapable(hoverMq.matches)
    }
    sync()
    motionMq.addEventListener('change', sync)
    hoverMq.addEventListener('change', sync)
    return () => {
      motionMq.removeEventListener('change', sync)
      hoverMq.removeEventListener('change', sync)
    }
  }, [])

  return { reduceMotion, hoverCapable }
}

export default function ArticleImageComparison({ before, after }) {
  const { t } = useTranslation()
  const { reduceMotion, hoverCapable } = useComparisonMotion()

  if (!before?.url || !after?.url) return null

  return (
    <figure className="article-image-comparison">
      <ImageComparison
        className="article-image-comparison__frame"
        enableHover={hoverCapable && !reduceMotion}
        springOptions={reduceMotion ? { bounce: 0, duration: 0 } : { bounce: 0.08, duration: 0.25 }}
      >
        <ImageComparisonImage
          src={before.url}
          alt={t('article.comparisonBefore')}
          position="left"
        />
        <ImageComparisonImage
          src={after.url}
          alt={t('article.comparisonAfter')}
          position="right"
        />
        <ImageComparisonSlider className="article-image-comparison__slider" />
      </ImageComparison>
      <figcaption className="article-image-comparison__caption">
        <span>{t('article.comparisonBefore')}</span>
        <span aria-hidden> · </span>
        <span>{t('article.comparisonAfter')}</span>
      </figcaption>
    </figure>
  )
}
