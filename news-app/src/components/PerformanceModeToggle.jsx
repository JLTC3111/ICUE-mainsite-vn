import { useTranslation } from 'react-i18next'
import { usePerformanceProfile } from '../context/PerformanceProfileContext'
import './PerformanceModeToggle.css'

function CpuPerformanceIcon({ fullPower = false }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="10"
        y="10"
        width="4"
        height="4"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9 7V4M12 7V4M15 7V4M9 17V20M12 17V20M15 17V20M7 9H4M7 12H4M7 15H4M17 9H20M17 12H20M17 15H20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {fullPower ? (
        <>
          <path
            d="M11 12h2M11 14h2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12 3v1M21 12h-1M12 21v-1M3 12h1"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.7"
          />
        </>
      ) : (
        <path
          d="M10.5 13.5c.8-1.2 2.2-1.2 3 0"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

export default function PerformanceModeToggle({ className = '' }) {
  const { t } = useTranslation()
  const { isOptimized, setPerformanceOptimized } = usePerformanceProfile()

  const handleToggle = () => {
    setPerformanceOptimized(!isOptimized)
  }

  const ariaLabel = isOptimized ? t('performance.switchOff') : t('performance.switchOn')

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`performance-mode-toggle${
        className ? ` ${className}` : ''
      }${isOptimized ? ' performance-mode-toggle--on' : ''}`}
      aria-pressed={isOptimized}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span className="performance-mode-toggle__icon">
        <CpuPerformanceIcon fullPower={!isOptimized} />
      </span>
    </button>
  )
}
