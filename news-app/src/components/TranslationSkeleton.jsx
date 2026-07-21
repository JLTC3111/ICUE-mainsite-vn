import './TranslationSkeleton.css'

export function TranslationLineSkeleton({ className = '', lines = 1 }) {
  return (
    <span
      className={`translation-skeleton${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          className="translation-skeleton__line"
          style={{ width: index === lines - 1 ? '72%' : '100%' }}
        />
      ))}
    </span>
  )
}

export default TranslationLineSkeleton
