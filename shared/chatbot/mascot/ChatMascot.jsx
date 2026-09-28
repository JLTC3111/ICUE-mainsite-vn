import { memo, useEffect, useId, useMemo, useRef, useState } from 'react'
import birdUrl from './icue-bird.webp'
import coreUrl from './icue-bird-core.webp'
import { COFFEE_AFTER_MS, EXCITED_MS, GLYPH_PATHS, MASCOT_EFFECTS, MASCOT_STATES, REACTION_MS, SLEEP_AFTER_MS, mascotPose } from './expressions.js'
import BirdEffects, { BirdHeadphones } from './BirdEffects.jsx'
import MascotMotion from './MascotMotion.jsx'
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
      <g className="icue-mascot__expression" data-face="excited">
        <Glyph name="prompt" x={49} />
        <path d={GLYPH_PATHS.prompt} transform="translate(66 39) scale(-1.4 1.4)" />
      </g>
      <g className="icue-mascot__expression" data-face="handoff">
        <Glyph name="prompt" x={43} />
        <Glyph name="arrow" x={62} y={39} />
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
        <Glyph name="prompt" x={43} />
        <Glyph name="dash" x={64} y={47} />
      </g>
    </svg>
  )
}

// Native masks reuse the original WebPs. Head, neck/torso and appendages move
// independently; overlap at the neck and crest keeps the joints connected.
const PARTS = {
  body: 'M38 61H66V65H100V100H0V65H38Z',
  crest: 'M27 0H61V19.5C50 16.5 37 19 27 28Z',
  tail: 'M12 57H30L37 73L33 85H12Z',
  'foot-left': 'M35 87H50V97H35Z',
  'foot-right': 'M51 87H70V97H51Z',
  'wing-left': 'M38 66C47 64 48 70 45 78C43 83 39 87 36 86L34 87C30 88 27 87 28 83C25 81 27 77 30 73Z',
  'wing-right': 'M66 66C70 66 77 73 77 80C78 85 74 87 72 85C69 88 66 87 66 85C67 79 67 73 66 66Z',
}
const HEAD_CLIP = 'M0 0H27V27C37 18 50 15.5 61 18.5V0H100V66.5H0Z'
const DEFAULT_EFFECTS = { coffee: 'coffee', listening: 'music', sleeping: 'zzz', excited: 'sparkles', reading: 'book', idea: 'bulb', happy: 'hearts' }

function BirdPart({ name, id }) {
  const clipId = `${id}-${name}`
  return (
    <svg className={`icue-mascot__part icue-mascot__part--${name}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}><path d={PARTS[name]} /></clipPath>
        {name === 'wing-right' && <clipPath id={`${clipId}-folded`}><path d={PARTS['wing-left']} /></clipPath>}
        {name === 'crest' && (
          <clipPath id={`${id}-head`} clipPathUnits="objectBoundingBox">
            <path d={HEAD_CLIP} transform="scale(0.01)" />
          </clipPath>
        )}
      </defs>
      <image className={name === 'wing-right' ? 'icue-mascot__wing-outside' : undefined} href={['crest', 'body'].includes(name) ? coreUrl : birdUrl} width="100" height="100" clipPath={`url(#${clipId})`} />
      {name === 'wing-right' && (
        <g className="icue-mascot__wing-folded" transform="translate(109 0) scale(-1 1)">
          <image href={birdUrl} width="100" height="100" clipPath={`url(#${clipId}-folded)`} />
        </g>
      )}
    </svg>
  )
}

function BirdJoint({ name, id }) {
  return <span className={`icue-mascot__joint icue-mascot__joint--${name}`}><BirdPart name={name} id={id} /></span>
}

/**
 * Decorative companion; its host supplies localized labels and textual status.
 * `animated={false}` makes transcript avatars entirely static. `active={false}`
 * suspends inactive instances. A visible launcher stays animated during replies.
 * `expression` and `effect` compose independently; `state` remains an alias.
 * `reactionKey` retriggers a new event with the same expression. Keep it stable
 * between events. Brief reactions use timeouts; loops are CSS and state
 * handoffs use short browser-native animations without a JavaScript frame loop.
 */
function ChatMascot({ state = 'idle', expression: requestedExpression = state, effect = 'auto', reactionKey = 0, variant = 'launcher', animated = true, active = true, interactive = false, musicPlaying = false }) {
  const safeState = MASCOT_STATES.includes(requestedExpression) ? requestedExpression : 'idle'
  const reaction = useMemo(() => ({ state: safeState, key: reactionKey }), [safeState, reactionKey])
  const [settledReaction, setSettledReaction] = useState(null)
  const [happyReaction, setHappyReaction] = useState(null)
  const [expiredEffect, setExpiredEffect] = useState(null)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  const [rest, setRest] = useState(null)
  const wakeRef = useRef(null)
  const opening = ['greeting', 'excited'].includes(safeState)
  const awakeExpression = settledReaction === reaction ? 'idle'
    : opening ? (happyReaction === reaction ? 'happy' : 'excited') : safeState
  const listeningToMusic = musicPlaying && animated && active
  const canRest = animated && active && interactive && awakeExpression === 'idle' && !hidden && !musicPlaying
  // Old rest poses cannot reappear when music stops or the page becomes visible.
  const restCycle = useMemo(() => ({ enabled: canRest }), [canRest])
  const restStage = rest?.cycle === restCycle ? rest.stage : 'idle'
  const resting = canRest && restStage !== 'idle'
  const expression = listeningToMusic ? 'listening' : resting ? restStage : awakeExpression
  const defaultEffect = opening && expression === 'happy' ? 'none' : DEFAULT_EFFECTS[expression] || 'none'
  const selectedEffect = listeningToMusic || resting || settledReaction === reaction ? defaultEffect
    : effect === 'auto' ? defaultEffect : MASCOT_EFFECTS.includes(effect) ? effect : 'none'
  const effectCycle = useMemo(() => ({ effect: selectedEffect, reaction }), [selectedEffect, reaction])
  const visibleEffect = expiredEffect === effectCycle ? 'none' : selectedEffect
  const pose = mascotPose(expression, visibleEffect)
  const layered = animated || variant !== 'avatar'
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
    if (!active || !animated || !['greeting', 'excited', 'happy', 'idea', 'handoff', 'confused'].includes(reaction.state)) return undefined
    const happyTimer = opening ? window.setTimeout(() => setHappyReaction(reaction), EXCITED_MS) : null
    const settleTimer = window.setTimeout(() => setSettledReaction(reaction), REACTION_MS + (opening ? EXCITED_MS : 0))
    return () => {
      window.clearTimeout(happyTimer)
      window.clearTimeout(settleTimer)
    }
  }, [active, animated, opening, reaction])

  useEffect(() => {
    if (!active || !animated || !['sparkles', 'hearts', 'bulb'].includes(effectCycle.effect)) return undefined
    const timer = window.setTimeout(() => setExpiredEffect(effectCycle), REACTION_MS)
    return () => window.clearTimeout(timer)
  }, [active, animated, effectCycle])

  useEffect(() => {
    if (!restCycle.enabled) return undefined
    let coffeeTimer, sleepTimer
    const wake = () => {
      setRest({ cycle: restCycle, stage: 'idle' })
      window.clearTimeout(coffeeTimer)
      window.clearTimeout(sleepTimer)
      coffeeTimer = window.setTimeout(() => setRest({ cycle: restCycle, stage: 'coffee' }), COFFEE_AFTER_MS)
      sleepTimer = window.setTimeout(() => setRest({ cycle: restCycle, stage: 'sleeping' }), SLEEP_AFTER_MS)
    }
    wakeRef.current = wake
    wake()
    document.addEventListener('pointerdown', wake, { passive: true })
    document.addEventListener('keydown', wake)
    return () => {
      wakeRef.current = null
      window.clearTimeout(coffeeTimer)
      window.clearTimeout(sleepTimer)
      document.removeEventListener('pointerdown', wake)
      document.removeEventListener('keydown', wake)
    }
  }, [restCycle])

  return (
    <MascotMotion
      enabled={animated && active && !hidden}
      phase={`${expression}:${pose}:${visibleEffect}:${reactionKey}`}
      rootProps={{
        className: `icue-mascot icue-mascot--${variant}`,
        'data-state': expression,
        'data-effect': visibleEffect,
        'data-pose': pose,
        'data-animated': animated,
        'data-paused': !active || hidden,
        'data-interactive': interactive,
        onPointerEnter: () => wakeRef.current?.(),
        'aria-hidden': true,
      }}
    >
      <span className="icue-mascot__shadow" />
      <span key={reactionKey} className="icue-mascot__bird">
        {layered && ['tail', 'foot-left', 'foot-right', 'body'].map(name => <BirdJoint key={name} name={name} id={id} />)}
        <span className={layered ? 'icue-mascot__joint icue-mascot__joint--head' : 'icue-mascot__static'}>
          <span className="icue-mascot__head-motion">
            {visibleEffect === 'music' && <BirdHeadphones layer="band" />}
            {layered && <BirdPart name="crest" id={id} />}
            <img
              className="icue-mascot__art"
              src={layered ? coreUrl : birdUrl}
              style={layered ? { clipPath: `url(#${id}-head)` } : undefined}
              width="256" height="256" alt="" draggable="false" decoding="async"
            />
            <TerminalFace />
            {visibleEffect === 'music' && <BirdHeadphones />}
          </span>
        </span>
        {['book', 'coffee'].includes(visibleEffect) && <span className="icue-mascot__prop"><BirdEffects effect={visibleEffect} /></span>}
        {layered && ['wing-right', 'wing-left'].map(name => <BirdJoint key={name} name={name} id={id} />)}
        {!['book', 'coffee'].includes(visibleEffect) && <BirdEffects key={`${reactionKey}:${visibleEffect}`} effect={visibleEffect} />}
      </span>
    </MascotMotion>
  )
}

export default memo(ChatMascot)
