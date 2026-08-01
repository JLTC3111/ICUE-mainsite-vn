import { useCallback, useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import './WarpBackground.css'

function Beam({ width, x, delay, duration, hue, aspectRatio }) {
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
  const reducedMotion = useReducedMotion()
  const generateBeams = useCallback((sideSeed) => {
    const beams = []
    const cellsPerSide = Math.floor(100 / beamSize)
    const step = cellsPerSide / beamsPerSide

    for (let i = 0; i < beamsPerSide; i += 1) {
      beams.push({
        x: Math.floor(i * step),
        delay:
          (((i + 1) * 0.61803398875 + sideSeed * 0.173) % 1)
          * (beamDelayMax - beamDelayMin)
          + beamDelayMin,
        hue: (i * 97 + beamsPerSide * 41 + sideSeed * 53) % 360,
        aspectRatio: ((i * 7 + beamsPerSide + sideSeed * 3) % 10) + 1,
      })
    }

    return beams
  }, [beamDelayMax, beamDelayMin, beamSize, beamsPerSide])

  const topBeams = useMemo(() => generateBeams(0), [generateBeams])
  const rightBeams = useMemo(() => generateBeams(1), [generateBeams])
  const bottomBeams = useMemo(() => generateBeams(2), [generateBeams])
  const leftBeams = useMemo(() => generateBeams(3), [generateBeams])

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
          hue={beam.hue}
          aspectRatio={beam.aspectRatio}
        />
      ))}
    </div>
  )

  return (
    <div
      className={`warp-background ${className}`.trim()}
      style={{ '--warp-background': background }}
      data-warp-background={background}
      {...props}
    >
      <div className="warp-background__stage" style={stageStyle}>
        {!reducedMotion ? (
          <>
            {renderSide('top', topBeams)}
            {renderSide('bottom', bottomBeams)}
            {renderSide('left', leftBeams)}
            {renderSide('right', rightBeams)}
          </>
        ) : null}
      </div>
    </div>
  )
}
