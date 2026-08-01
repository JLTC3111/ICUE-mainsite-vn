import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { normalizeUnicode } from '@icue/text/normalizeUnicode'
import { useInteractiveBackgroundActive } from '../contexts/InteractiveBackgroundContext'
import BorderGlow from './BorderGlow/BorderGlow'
import TiltedCard from './TiltedCard/TiltedCard'
import PixelTransition from './PixelTransition/PixelTransition'

const GLOW_COLORS_LIGHT = ['#368adf', '#1db7ff', '#4d5053']
const GLOW_COLORS_DARK = ['#c084fc', '#f472b6', '#38bdf8']

const GLOW_PROPS_LIGHT = {
  colors: GLOW_COLORS_LIGHT,
  glowColor: '210 70 60',
  glowIntensity: 0.85,
  edgeSensitivity: 28,
  coneSpread: 25,
  fillOpacity: 0.3,
}

const GLOW_PROPS_DARK = {
  colors: GLOW_COLORS_DARK,
  glowColor: '40 80 80',
  glowIntensity: 1.0,
  edgeSensitivity: 30,
  coneSpread: 25,
  fillOpacity: 0.5,
}

const PIXEL_TRANSITION_COLOR = '#120F17'

function cardBackground(interactiveBgActive) {
  return interactiveBgActive ? '#120F17' : 'rgba(255, 255, 255, 0.72)'
}

function ProfilePhotoImage({ person }) {
  const displayName = normalizeUnicode(
    [person.honorific, person.name].filter(Boolean).join(' '),
  )

  return (
    <TiltedCard
      className="tilted-card-figure--profile"
      imageSrc={person.photo}
      altText={displayName}
      containerHeight="auto"
      containerWidth="auto"
      imageWidth="auto"
      imageHeight="auto"
      scaleOnHover={1.03}
      rotateAmplitude={10}
      showMobileWarning={false}
      showTooltip={false}
      loading="eager"
      draggable={false}
      imageClassName="profile-photo__img"
    />
  )
}

function ProfilePhoto({ person }) {
  const interactiveBgActive = useInteractiveBackgroundActive()
  const glowProps = interactiveBgActive ? GLOW_PROPS_DARK : GLOW_PROPS_LIGHT
  const bgColor = cardBackground(interactiveBgActive)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const [shownPerson, setShownPerson] = useState(person)
  const [incomingPerson, setIncomingPerson] = useState(person)
  const [trigger, setTrigger] = useState(0)
  const [displayRevision, setDisplayRevision] = useState(0)
  const latestPersonRef = useRef(person)

  useEffect(() => {
    latestPersonRef.current = person
    if (person.id === shownPerson.id) return
    setIncomingPerson(person)
    if (reducedMotion.current) {
      setShownPerson(person)
      return
    }
    setTrigger((t) => t + 1)
  }, [person, shownPerson.id])

  const handleTransitionComplete = useCallback(() => {
    setShownPerson(latestPersonRef.current)
    setDisplayRevision((revision) => revision + 1)
  }, [])

  return (
    <BorderGlow
      className="profile-panel__glow profile-panel__glow--photo profile-panel__glow--photo-snug"
      backgroundColor={bgColor}
      borderRadius={24}
      glowRadius={24}
      {...glowProps}
    >
      <div className="profile-panel__photo-wrap profile-panel__photo-wrap--snug">
        <PixelTransition
          className="profile-photo__pixel-transition"
          trigger={trigger}
          pixelColor={PIXEL_TRANSITION_COLOR}
          gridSize={8}
          animationStepDuration={0.35}
          disabled={reducedMotion.current}
          onComplete={handleTransitionComplete}
          displayKey={`${shownPerson.id}:${displayRevision}`}
          firstContent={<ProfilePhotoImage person={shownPerson} />}
          secondContent={<ProfilePhotoImage person={incomingPerson} />}
        />
      </div>
    </BorderGlow>
  )
}

export default memo(ProfilePhoto)
