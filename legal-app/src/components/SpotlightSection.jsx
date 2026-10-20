import SpotlightCard from '../../../shared/ui/SpotlightCard.jsx'

/** React Bits spotlight with pointer proximity, edge lighting and focus. */
export default function SpotlightSection({ children, className = '', accent = '#2563eb', ...props }) {
  return (
    <SpotlightCard as="section" className={`legal-section ${className}`.trim()}
      spotlightColor={accent} intensity={0.08} borderGlow={0.25} proximity={64} {...props}>
      <div className="legal-section__content">{children}</div>
    </SpotlightCard>
  )
}
