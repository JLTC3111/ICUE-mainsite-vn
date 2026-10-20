import { useRef } from 'react'
import useBentoEffects from '../../../../shared/ui/useBentoEffects.js'
import './MagicBento.css'

// React Bits Magic Bento, refreshed 2026-10-20. App panels keep their custom
// content and remain stationary while typing, selecting, and using controls.
// https://reactbits.dev/components/magic-bento
export function MagicBentoSection({
  children, className = '', enableSpotlight = true, enableBorderGlow = true,
  spotlightRadius = 320, glowColor = '160, 170, 185', clickEffect = true,
  disableAnimations = false, style, ...props
}) {
  const sectionRef = useRef(null)
  useBentoEffects(sectionRef, { enableSpotlight, enableBorderGlow, spotlightRadius,
    glowColor, clickEffect, disableAnimations, enableTilt: false, enableMagnetism: false })
  return (
    <div ref={sectionRef} className={`magic-bento-section bento-section ${className}`.trim()}
      style={{ '--mb-glow': glowColor, ...style }} {...props}>
      {children}
    </div>
  )
}

export function MagicBentoCard({ children, className = '', as: Comp = 'div', enableBorderGlow = true, ...props }) {
  return (
    <Comp className={`magic-bento-card icue-bento-card card${enableBorderGlow ? ' card--border-glow' : ''}${className ? ` ${className}` : ''}`} {...props}>
      <span className="icue-bento__light" aria-hidden="true" />
      <span className="icue-bento__wave" aria-hidden="true" />
      {children}
    </Comp>
  )
}
