import { memo, useEffect, useId, useMemo, useState } from 'react'
import birdUrl from './icue-bird.webp'
import coreUrl from './icue-bird-core.webp'
import { GLYPH_PATHS, MASCOT_STATES, REACTION_MS } from './expressions.js'
import './ChatMascot.css'

function Glyph({ name, x, y = 39, scale = 1.4, className }) {
  return <path className={className} d={GLYPH_PATHS[name]} transform={`translate(${x} ${y}) scale(${scale})`} />
}

function TerminalFace() {
  return (
    <svg className="icue-mascot__face" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" focusable="false">
      <g className="icue-mascot__expression" data-face="idle">
        <g className="icue-mascot__blink">
          <Glyph name="prompt" x={43} />
          <Glyph name="dash" x={64} y={47} className="icue-mascot__cursor" />
        </g>
      </g>
      <g className="icue-mascot__expression" data-face="greeting">
        <Glyph name="caret" x={43} y={41} />
        <Glyph name="caret" x={65} y={41} />
      </g>
      <g className="icue-mascot__expression" data-face="curious">
        <Glyph name="prompt" x={43} />
        <Glyph name="question" x={65} />
      </g>
      <g className="icue-mascot__expression" data-face="thinking">
        <Glyph name="prompt" x={43} />
        {[60, 65, 70].map((x, index) => (
          <path key={x} className={`icue-mascot__dot icue-mascot__dot--${index + 1}`} d={`M${x} 47h2.6v2.6h-2.6z`} />
        ))}
      </g>
      <g className="icue-mascot__expression" data-face="speaking">
        <Glyph name="prompt" x={43} />
        <Glyph name="dash" x={64} y={47} className="icue-mascot__cursor" />
      </g>
      <g className="icue-mascot__expression" data-face="happy">
        <Glyph name="caret" x={43} y={41} />
        <Glyph name="caret" x={65} y={41} />
      </g>
      <g className="icue-mascot__expression" data-face="confused">
        <Glyph name="prompt" x={43} />
        <Glyph name="question" x={65} />
      </g>
      <g className="icue-mascot__expression" data-face="error">
        <Glyph name="bang" x={45} y={40} />
        <Glyph name="cross" x={64} y={41} />
      </g>
      <g className="icue-mascot__expression" data-face="sleeping">
        <Glyph name="dash" x={43} y={44} />
        <Glyph name="dash" x={65} y={44} />
      </g>
    </svg>
  )
}

// Native vector masks reuse the original tiny WebP. The clean body beneath
// them prevents duplicate wings/feet from showing when an appendage moves.
// The crest overlaps the body's curved cutout to keep its roots attached.
const PARTS = {
  crest: 'M27 0H61V19.5C50 16.5 37 19 27 28Z',
  tail: 'M12 57H30L37 73L33 85H12Z',
  'foot-left': 'M35 87H50V97H35Z',
  'foot-right': 'M51 87H70V97H51Z',
  'wing-left': 'M38 66C47 64 48 70 45 78C43 83 39 87 36 86L34 87C30 88 27 87 28 83C25 81 27 77 30 73Z',
  'wing-right': 'M66 66C70 66 77 73 77 80C78 85 74 87 72 85C69 88 66 87 66 85C67 79 67 73 66 66Z',
}
const BODY_CLIP = 'M0 0H27V27C37 18 50 15.5 61 18.5V0H100V100H0Z'

function BirdPart({ name, id }) {
  const clipId = `${id}-${name}`
  return (
    <svg className={`icue-mascot__part icue-mascot__part--${name}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}><path d={PARTS[name]} /></clipPath>
        {name === 'crest' && (
          <clipPath id={`${id}-body`} clipPathUnits="objectBoundingBox">
            <path d={BODY_CLIP} transform="scale(0.01)" />
          </clipPath>
        )}
      </defs>
      <image href={name === 'crest' ? coreUrl : birdUrl} width="100" height="100" clipPath={`url(#${clipId})`} />
    </svg>
  )
}

/**
 * Decorative companion; its host supplies localized labels and textual status.
 * `animated={false}` makes transcript avatars entirely static. `active={false}`
 * suspends inactive instances. A visible launcher stays animated during replies.
 * Only brief reactions use a timer; breathing, blinking and dots are CSS.
 */
function ChatMascot({ state = 'idle', variant = 'launcher', animated = true, active = true, interactive = false }) {
  const safeState = MASCOT_STATES.includes(state) ? state : 'idle'
  const reaction = useMemo(() => ({ state: safeState }), [safeState])
  const [settledReaction, setSettledReaction] = useState(null)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  const [sleeping, setSleeping] = useState(false)
  const awakeExpression = settledReaction === reaction ? 'idle' : safeState
  const canSleep = animated && active && interactive && awakeExpression === 'idle' && !hidden
  const expression = canSleep && sleeping ? 'sleeping' : awakeExpression
  const id = useId()

  useEffect(() => {
    if (!animated || !active) return undefined
    const update = () => setHidden(document.hidden)
    const pause = () => setHidden(true)
    update()
    document.addEventListener('visibilitychange', update)
    document.addEventListener('freeze', pause)
    document.addEventListener('resume', update)
    window.addEventListener('pagehide', pause)
    window.addEventListener('pageshow', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      document.removeEventListener('freeze', pause)
      document.removeEventListener('resume', update)
      window.removeEventListener('pagehide', pause)
      window.removeEventListener('pageshow', update)
    }
  }, [active, animated])

  useEffect(() => {
    if (!active || !animated || !['greeting', 'happy', 'confused'].includes(reaction.state)) return undefined
    const timer = window.setTimeout(() => setSettledReaction(reaction), REACTION_MS)
    return () => window.clearTimeout(timer)
  }, [active, animated, reaction])

  useEffect(() => {
    if (!canSleep) return undefined
    let timer
    const wake = () => {
      setSleeping(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setSleeping(true), 60_000)
    }
    wake()
    document.addEventListener('pointerdown', wake, { passive: true })
    document.addEventListener('keydown', wake)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', wake)
      document.removeEventListener('keydown', wake)
    }
  }, [canSleep])

  return (
    <span
      className={`icue-mascot icue-mascot--${variant}`}
      data-state={expression}
      data-animated={animated}
      data-paused={!active || hidden}
      data-interactive={interactive}
      aria-hidden="true"
    >
      <span className="icue-mascot__shadow" />
      <span className="icue-mascot__bird">
        {animated && ['tail', 'foot-left', 'foot-right', 'crest'].map(name => <BirdPart key={name} name={name} id={id} />)}
        <img
          className="icue-mascot__art"
          src={animated ? coreUrl : birdUrl}
          style={animated ? { clipPath: `url(#${id}-body)` } : undefined}
          width="256" height="256" alt="" draggable="false" decoding="async"
        />
        {animated && ['wing-right', 'wing-left'].map(name => <BirdPart key={name} name={name} id={id} />)}
        <TerminalFace />
      </span>
    </span>
  )
}

export default memo(ChatMascot)
