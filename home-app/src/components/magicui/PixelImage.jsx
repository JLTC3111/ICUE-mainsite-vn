import { useMemo, useState } from 'react'
import './PixelImage.css'

const DEFAULT_GRIDS = {
  '6x4': { rows: 4, cols: 6 },
  '8x8': { rows: 8, cols: 8 },
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function PixelImage({
  src,
  alt = '',
  grid = '6x4',
  customGrid,
  grayscaleAnimation = true,
  pixelFadeInDuration = 700,
  maxAnimationDelay = 600,
  colorRevealDelay = 700,
  className = '',
}) {
  const staticMode = prefersReducedMotion()
  const [hovering, setHovering] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showColor, setShowColor] = useState(false)

  const { rows, cols } = useMemo(() => {
    if (customGrid?.rows >= 1 && customGrid?.cols >= 1) return customGrid
    return DEFAULT_GRIDS[grid] || DEFAULT_GRIDS['6x4']
  }, [customGrid, grid])

  const pieces = useMemo(() => {
    const total = rows * cols
    return Array.from({ length: total }, (_, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      const clipPath = `polygon(
        ${col * (100 / cols)}% ${row * (100 / rows)}%,
        ${(col + 1) * (100 / cols)}% ${row * (100 / rows)}%,
        ${(col + 1) * (100 / cols)}% ${(row + 1) * (100 / rows)}%,
        ${col * (100 / cols)}% ${(row + 1) * (100 / rows)}%
      )`
      return {
        clipPath,
        delay: Math.random() * maxAnimationDelay,
      }
    })
  }, [rows, cols, maxAnimationDelay])

  const startHoverEffect = () => {
    if (staticMode) return
    setHovering(true)
    setShowColor(false)
    setIsVisible(false)
    requestAnimationFrame(() => {
      setIsVisible(true)
      if (grayscaleAnimation) {
        window.setTimeout(() => setShowColor(true), colorRevealDelay)
      } else {
        setShowColor(true)
      }
    })
  }

  const endHoverEffect = () => {
    if (staticMode) return
    setHovering(false)
    setIsVisible(false)
    setShowColor(false)
  }

  return (
    <div
      className={[
        'pixel-image',
        hovering ? 'pixel-image--active' : '',
        className,
      ].filter(Boolean).join(' ')}
      onMouseEnter={startHoverEffect}
      onMouseLeave={endHoverEffect}
      onFocus={startHoverEffect}
      onBlur={endHoverEffect}
    >
      <img
        src={src}
        alt={alt}
        className="pixel-image__static"
        decoding="async"
        draggable={false}
      />

      <div className="pixel-image__grid" aria-hidden="true">
        {pieces.map((piece, index) => (
          <div
            key={index}
            className={[
              'pixel-image__piece',
              isVisible ? 'pixel-image__piece--visible' : '',
              showColor ? 'pixel-image__piece--color' : '',
            ].filter(Boolean).join(' ')}
            style={{
              clipPath: piece.clipPath,
              transitionDelay: `${piece.delay}ms`,
              transitionDuration: `${pixelFadeInDuration}ms`,
            }}
          >
            <img src={src} alt="" decoding="async" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  )
}
