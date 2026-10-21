import { useRef } from 'react'
import './FloatingCollapseControls.css'

export default function FloatingCollapseControls({ collapse, controlsId, expandLabel, collapseLabel, copy, side = 'right', controlsRef, iconColor, overVideo = false }) {
  const toggleRef = useRef(null)
  const label = collapse.collapsed ? expandLabel : collapseLabel
  const pointRight = collapse.collapsed ? side === 'left' : side === 'right'
  const autoLabel = collapse.automatic ? copy.keepExpanded : copy.autoCollapse

  return (
    <div
      className="floating-collapse-controls"
      ref={controlsRef}
      data-over-video={overVideo || undefined}
      style={{
        '--floating-control-sampled-ink': iconColor,
        '--floating-control-ink': overVideo ? '#18334d' : undefined,
        '--floating-control-surface': overVideo ? '#f8fafc' : undefined,
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        className="floating-collapse__toggle"
        onClick={collapse.toggle}
        aria-label={label}
        title={label}
        aria-expanded={!collapse.collapsed}
        aria-controls={controlsId}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d={pointRight ? 'm9 5 7 7-7 7' : 'm15 5-7 7 7 7'} />
        </svg>
      </button>
      {!collapse.collapsed && (
        <button
          type="button"
          className="floating-collapse__auto"
          onClick={() => {
            collapse.toggleAutomatic()
            // The Auto control disappears if a small viewport collapses the
            // widget. Keep keyboard focus on the surviving disclosure button.
            toggleRef.current?.focus({ preventScroll: true })
          }}
          aria-label={autoLabel}
          title={autoLabel}
          aria-pressed={collapse.automatic}
        >
          {collapse.automatic ? <span>{copy.automatic}</span> : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16 3 5 5-4 2-3 5-5-5 5-3 2-4ZM9 10l-3 4 4 4 4-3M8 16l-5 5" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
