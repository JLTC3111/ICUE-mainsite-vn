import { useEffect, useRef, useState } from 'react'
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

function loadImageSize(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = url
  })
}

function useFitContentHeight(beforeUrl, afterUrl, enabled, frameRef) {
  const [height, setHeight] = useState(null)

  useEffect(() => {
    if (!enabled || !beforeUrl || !afterUrl) {
      setHeight(null)
      return undefined
    }

    let cancelled = false

    const measure = async () => {
      const node = frameRef.current
      if (!node) return

      try {
        const [beforeSize, afterSize] = await Promise.all([
          loadImageSize(beforeUrl),
          loadImageSize(afterUrl),
        ])
        const width = node.clientWidth
        if (!width || cancelled) return

        const beforeHeight = (beforeSize.height / beforeSize.width) * width
        const afterHeight = (afterSize.height / afterSize.width) * width
        setHeight(Math.ceil(Math.max(beforeHeight, afterHeight)))
      } catch {
        if (!cancelled) setHeight(null)
      }
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      return () => { cancelled = true }
    }

    const observer = new ResizeObserver(() => {
      measure()
    })

    if (frameRef.current) observer.observe(frameRef.current)

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [afterUrl, beforeUrl, enabled, frameRef])

  return height
}

export default function ArticleImageComparison({
  before,
  after,
  showCaption = false,
  fitContent = false,
  hoverOnly = false,
  hideSlider = false,
}) {
  const { t } = useTranslation()
  const { reduceMotion, hoverCapable } = useComparisonMotion()
  const sizerRef = useRef(null)
  const fitHeight = useFitContentHeight(before?.url, after?.url, fitContent, sizerRef)

  if (!before?.url || !after?.url) return null

  const hoverScrub = hoverOnly || (hoverCapable && !reduceMotion)

  const frame = (
    <ImageComparison
      className={`article-image-comparison__frame${fitContent ? ' article-image-comparison__frame--fit' : ''}`}
      enableHover={hoverScrub}
      hoverOnly={hoverOnly}
      springOptions={{ bounce: 0, duration: 0 }}
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
      {!hideSlider && (
        <ImageComparisonSlider className="article-image-comparison__slider" />
      )}
    </ImageComparison>
  )

  return (
    <figure className={`article-image-comparison${fitContent ? ' article-image-comparison--fit-content' : ''}`}>
      {fitContent ? (
        <div
          ref={sizerRef}
          className="article-image-comparison__sizer"
          style={fitHeight ? { height: fitHeight } : { aspectRatio: '16 / 11' }}
        >
          {frame}
        </div>
      ) : (
        frame
      )}
      {showCaption && (
        <figcaption className="article-image-comparison__caption">
          <span>{t('article.comparisonBefore')}</span>
          <span aria-hidden> · </span>
          <span>{t('article.comparisonAfter')}</span>
        </figcaption>
      )}
    </figure>
  )
}
