import { useCallback, useMemo } from 'react'
import { motion } from 'motion/react'
import './WarpBackground.css'

function Beam({ width, x, delay, duration }) {
  const hue = Math.floor(Math.random() * 360)
  const aspectRatio = Math.floor(Math.random() * 10) + 1

  return (
    <motion.div
      className="warp-background__beam"
      style={{
        '--warp-x': x,
        '--warp-width': width,
        '--warp-aspect-ratio': aspectRatio,
        '--warp-beam-bg': `linear-gradient(hsl(${hue} 80% 60%), transparent)`,
      }}
      initial={{ y: '100cqmax', x: '-50%' }}
      animate={{ y: '-100%', x: '-50%' }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  )
}

export default function WarpBackground({
  className = '',
  perspective = 100,
  beamsPerSide = 3,
  beamSize = 5,
  beamDelayMax = 3,
  beamDelayMin = 0,
  beamDuration = 3,
  gridColor = 'rgba(10, 26, 58, 0.08)',
  background = 'linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)',
  ...props
}) {
  const generateBeams = useCallback(() => {
    const beams = []
    const cellsPerSide = Math.floor(100 / beamSize)
    const step = cellsPerSide / beamsPerSide

    for (let i = 0; i < beamsPerSide; i += 1) {
      beams.push({
        x: Math.floor(i * step),
        delay: Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin,
      })
    }

    return beams
  }, [beamDelayMax, beamDelayMin, beamSize, beamsPerSide])

  const topBeams = useMemo(() => generateBeams(), [generateBeams])
  const rightBeams = useMemo(() => generateBeams(), [generateBeams])
  const bottomBeams = useMemo(() => generateBeams(), [generateBeams])
  const leftBeams = useMemo(() => generateBeams(), [generateBeams])

  const stageStyle = {
    '--warp-perspective': `${perspective}px`,
    '--warp-grid-color': gridColor,
    '--warp-beam-size': `${beamSize}%`,
    '--warp-background': background,
  }

  const renderSide = (side, beams) => (
    <div className={`warp-background__side warp-background__side--${side}`}>
      {beams.map((beam, index) => (
        <Beam
          key={`${side}-${index}`}
          width={`${beamSize}%`}
          x={`${beam.x * beamSize}%`}
          delay={beam.delay}
          duration={beamDuration}
        />
      ))}
    </div>
  )

  return (
    <div className={`warp-background ${className}`.trim()} {...props}>
      <div className="warp-background__stage" style={stageStyle}>
        {renderSide('top', topBeams)}
        {renderSide('bottom', bottomBeams)}
        {renderSide('left', leftBeams)}
        {renderSide('right', rightBeams)}
      </div>
    </div>
  )
}
