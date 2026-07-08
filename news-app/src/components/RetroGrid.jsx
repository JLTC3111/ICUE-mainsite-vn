import './RetroGrid.css'

export default function RetroGrid({
  className = '',
  angle = 65,
  cellSize = 60,
  opacity = 0.45,
  lineColor = 'rgba(255, 255, 255, 0.22)',
  reduceMotion = false,
}) {
  const rootStyle = {
    '--retro-grid-angle': `${angle}deg`,
    '--retro-grid-cell': `${cellSize}px`,
    '--retro-grid-line': lineColor,
    '--retro-grid-opacity': String(opacity),
  }

  return (
    <div
      className={`retro-grid${className ? ` ${className}` : ''}`}
      style={rootStyle}
      aria-hidden="true"
    >
      <div className="retro-grid__perspective">
        <div className="retro-grid__plane">
          <div className={`retro-grid__scroll${reduceMotion ? ' retro-grid__scroll--static' : ''}`} />
        </div>
      </div>
      <div className="retro-grid__fade" />
    </div>
  )
}
