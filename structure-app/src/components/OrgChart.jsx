import { forwardRef, useId, useRef } from 'react'
import { AnimatedBeam } from './magicui/AnimatedBeam'

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
  return (
    <button
      ref={ref}
      type="button"
      className={`person-card${isHub ? ' person-card--hub' : ''}`}
      onClick={() => onSelectPerson(person)}
    >
      <h3>{person.displayName}</h3>
      <div className="title">{person.title}</div>
    </button>
  )
})

export default function OrgChart({ levels, onSelectPerson }) {
  const containerRef = useRef(null)

  // Stable refs keyed by profile id (Multiple Inputs pattern).
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

  // Inputs → hub (same topology as Magic UI Multiple Inputs).
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
          pathColor="#94a3b8"
          pathOpacity={0.28}
          gradientStartColor="#368adf"
          gradientStopColor="#2821a8"
        />
      ))}
    </div>
  )
}
