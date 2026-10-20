import Spotlight from '../../../../shared/ui/SpotlightCard.jsx'
import './SpotlightCard.css'

export default function SpotlightCard({ as = 'div', children, className = '', spotlightColor, ...props }) {
  return (
    <Spotlight as={as} className={`ow-spotlight ${className}`.trim()}
      spotlightColor={spotlightColor || 'var(--ow-accent-text)'}
      intensity={0.08} borderGlow={0.4} proximity={80} {...props}>
      {children}
    </Spotlight>
  )
}
