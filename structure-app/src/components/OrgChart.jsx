import { forwardRef, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatedBeam } from './magicui/AnimatedBeam'
import { TextShimmerWave } from './motion-primitives/TextShimmerWave'

/**
 * Magic UI “Multiple Inputs” pattern on the org chart:
 * surrounding roles beam into the Viện Trưởng hub (hanh).
 * @see https://magicui.design/docs/components/animated-beam
 */
const HUB_ID = 'hanh'

const PersonCard = forwardRef(function PersonCard(
  { person, onSelectPerson, isHub },
  ref,
) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  const displayName = t(`orgChart.people.${person.id}.displayName`)
  const title = t(`orgChart.people.${person.id}.title`)

  return (
    <button
      ref={ref}
      type="button"
      className={`person-card${isHub ? ' person-card--hub' : ''}`}
      onClick={() => onSelectPerson(person)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <TextShimmerWave
        as="h3"
        className="person-card__name"
        duration={1}
        spread={1.2}
        active={hovered}
      >
        {displayName}
      </TextShimmerWave>
      <TextShimmerWave
        as="div"
        className="title"
        duration={1.1}
        spread={1}
        zDistance={6}
        scaleDistance={1.05}
        active={hovered}
      >
        {title}
      </TextShimmerWave>
    </button>
  )
})

export default function OrgChart({ levels, onSelectPerson }) {
  const containerRef = useRef(null)

  const lanAnhRef = useRef(null)
  const hanhRef = useRef(null)
  const toanRef = useRef(null)
  const longRef = useRef(null)
  const tamRef = useRef(null)
  const hienRef = useRef(null)
  const tinhRef = useRef(null)
  const quynhLyRef = useRef(null)
  const thiLyRef = useRef(null)
  const duongRef = useRef(null)

  const refsById = {
    'lan-anh': lanAnhRef,
    hanh: hanhRef,
    toan: toanRef,
    long: longRef,
    tam: tamRef,
    hien: hienRef,
    tinh: tinhRef,
    'quynh-ly': quynhLyRef,
    'thi-ly': thiLyRef,
    duong: duongRef,
  }

  const beams = [
    { from: 'lan-anh', curvature: 40 },
    { from: 'toan', curvature: -40 },
    { from: 'long', curvature: 55 },
    { from: 'tam', curvature: 0 },
    { from: 'hien', curvature: -55 },
    { from: 'tinh', curvature: 70 },
    { from: 'quynh-ly', curvature: 25 },
    { from: 'thi-ly', curvature: -25 },
    { from: 'duong', curvature: -70 },
  ]

  const beamKey = useId()

  return (
    <div className="org-chart" ref={containerRef}>
      {levels.map((level) => (
        <div
          key={level.id}
          className={`org-level${level.connectors ? ' connectors' : ''}`}
        >
          {level.people.map((person) => (
            <PersonCard
              key={person.id}
              ref={refsById[person.id]}
              person={person}
              onSelectPerson={onSelectPerson}
              isHub={person.id === HUB_ID}
            />
          ))}
        </div>
      ))}

      {beams.map((beam, index) => (
        <AnimatedBeam
          key={`${beamKey}-${beam.from}`}
          containerRef={containerRef}
          fromRef={refsById[beam.from]}
          toRef={hanhRef}
          curvature={beam.curvature}
          duration={4 + (index % 3) * 0.35}
          delay={index * 0.1}
          pathColor="rgba(148, 163, 184, 0.45)"
          pathOpacity={0.35}
          gradientStartColor="#368adf"
          gradientStopColor="#8ec5ff"
        />
      ))}
    </div>
  )
}
