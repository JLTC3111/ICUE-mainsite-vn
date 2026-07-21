import './BentoGrid.css'
import Lens from './Lens'
import TranslationLineSkeleton from './TranslationSkeleton'
import { BorderBeam } from './magicui/BorderBeam'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function BentoGrid({ children, className = '', ...props }) {
  return (
    <div className={cn('bento-grid', className)} {...props}>
      {children}
    </div>
  )
}

export function BentoCard({
  name,
  titlePending = false,
  description,
  background,
  cta,
  className = '',
  spanCols = 1,
  spanRows = 1,
  animate = false,
  animationDelay = 0,
  lens = false,
  onClick,
  ...props
}) {
  const backgroundNode = lens ? (
    <Lens className="bento-card__lens" zoomFactor={1.45} lensSize={150}>
      {background}
    </Lens>
  ) : (
    background
  )

  return (
    <button
      type="button"
      className={cn(
        'bento-card',
        `bento-card--span-cols-${spanCols}`,
        spanRows > 1 && 'bento-card--span-rows-2',
        animate && 'bento-card--animate',
        lens && 'bento-card--lens',
        className,
      )}
      style={animate ? { animationDelay: `${animationDelay}ms` } : undefined}
      onClick={onClick}
      {...props}
    >
      <BorderBeam />
      <div className="bento-card__background">{backgroundNode}</div>
      <div className="bento-card__body">
        {description ? <div className="bento-card__meta">{description}</div> : null}
        {titlePending ? (
          <TranslationLineSkeleton
            lines={2}
            className="translation-skeleton--on-dark bento-card__title-skeleton"
          />
        ) : null}
        {!titlePending && name ? <h2 className="bento-card__title translation-reveal">{name}</h2> : null}
        {cta ? (
          <span className="bento-card__cta">
            {cta}
            <svg className="bento-card__cta-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </div>
    </button>
  )
}
