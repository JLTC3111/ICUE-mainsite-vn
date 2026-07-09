import { useMemo } from 'react'
import './PixelImage.css'

const DEFAULT_GRIDS = {
  '6x4': { rows: 4, cols: 6 },
  '8x8': { rows: 8, cols: 8 },
}

export default function PixelImage({
  src,
  alt = '',
  grid = '6x4',
  customGrid,
  maxAnimationDelay = 600,
  className = '',
}) {
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

  return (
    <div
      className={`pixel-image ${className}`.trim()}
      style={{ '--pixel-src': `url("${src}")` }}
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
            className="pixel-image__piece"
            style={{
              clipPath: piece.clipPath,
              '--piece-delay': `${piece.delay}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
