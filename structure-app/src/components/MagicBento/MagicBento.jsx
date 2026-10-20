import { useRef } from 'react'
import useBentoEffects from '../../../../shared/ui/useBentoEffects.js'
import './MagicBento.css'

function renderCardBody(card) {
  if (card.content) return card.content;

  return (
    <>
      <div className="magic-bento-card__header">
        <div className="magic-bento-card__label">{card.label}</div>
      </div>
      <div className="magic-bento-card__content">
        <h2 className="magic-bento-card__title">{card.title}</h2>
        {card.description ? (
          <p className="magic-bento-card__description">{card.description}</p>
        ) : null}
      </div>
    </>
  );
}

// Keep ICUE's department/document content and layout; use the current React
// Bits light, proximity, canvas-star and click-wave interactions.
export default function MagicBento({
  cards = [], className = '', textAutoHide = false,
  enableStars = true, enableSpotlight = true, enableBorderGlow = true,
  disableAnimations = false, spotlightRadius = 300, particleCount = 12,
  enableTilt = false, glowColor = '54, 138, 223', clickEffect = true,
  enableMagnetism = true,
}) {
  const gridRef = useRef(null)
  useBentoEffects(gridRef, { enableStars, enableSpotlight, enableBorderGlow,
    disableAnimations, spotlightRadius, particleCount, enableTilt, glowColor,
    clickEffect, enableMagnetism })

  return (
    <div ref={gridRef} className={`bento-section card-grid ${className}`.trim()}>
      {cards.map((card, index) => (
        <div
          key={card.id || index}
          className={['magic-bento-card', 'icue-bento-card',
            textAutoHide && 'magic-bento-card--text-autohide',
            enableBorderGlow && 'magic-bento-card--border-glow', card.className].filter(Boolean).join(' ')}
          style={{ backgroundColor: card.color || 'var(--background-dark)', '--glow-color': glowColor, ...card.style }}
        >
          <span className="icue-bento__light" aria-hidden="true" />
          <span className="icue-bento__wave" aria-hidden="true" />
          {enableStars && <canvas className="icue-bento__stars" aria-hidden="true" />}
          {renderCardBody(card)}
        </div>
      ))}
    </div>
  )
}
