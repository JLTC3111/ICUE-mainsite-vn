import './BentoGrid.css'

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
  description,
  background,
  cta,
  className = '',
  spanCols = 1,
  spanRows = 1,
  animate = false,
  animationDelay = 0,
  onClick,
  ...props
}) {
  return (
    <button
      type="button"
      className={cn(
        'bento-card',
        `bento-card--span-cols-${spanCols}`,
        spanRows > 1 && 'bento-card--span-rows-2',
        animate && 'bento-card--animate',
        className,
      )}
      style={animate ? { animationDelay: `${animationDelay}ms` } : undefined}
      onClick={onClick}
      {...props}
    >
      <div className="bento-card__background">{background}</div>
      <div className="bento-card__body">
        {description ? <div className="bento-card__meta">{description}</div> : null}
        {name ? <h2 className="bento-card__title">{name}</h2> : null}
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
