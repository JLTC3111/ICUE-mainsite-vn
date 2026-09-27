import { memo, useId } from 'react'

/** Attached inside the head joint so the earcups follow every nod. */
export const BirdHeadphones = memo(function BirdHeadphones({ layer = 'cups' }) {
  if (layer === 'band') return (
    <svg className="icue-mascot__headphone-band" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path fill="none" stroke="#203e59" strokeWidth="5" strokeLinecap="round" d="M22 44V37C22 8 88 8 88 37V44" />
      <path fill="none" stroke="#8baabd" strokeWidth="1.5" strokeLinecap="round" d="M22 37C22 8 88 8 88 37" />
    </svg>
  )
  return (
    <svg className="icue-mascot__headphones" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g stroke="#203e59" strokeWidth="1.2">
        <rect x="18" y="38" width="8" height="17" rx="4" fill="#718fa6" transform="rotate(-8 22 46)" />
        <rect x="84" y="37" width="8" height="17" rx="4" fill="#718fa6" transform="rotate(8 88 45)" />
        <rect x="23" y="39" width="5" height="15" rx="2.5" fill="#294d6b" />
        <rect x="82" y="38" width="5" height="15" rx="2.5" fill="#294d6b" />
      </g>
      <path fill="none" stroke="#9bdded" strokeWidth="1.4" strokeLinecap="round" d="M20.5 43V49M89.5 42V48" />
    </svg>
  )
})

/** One reusable SVG layer; effects are selected by the host's real activity. */
function BirdEffects({ effect }) {
  const id = useId()
  if (effect === 'none') return null
  return (
    <svg className={`icue-mascot__effects icue-mascot__effects--${effect}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {effect === 'sparkles' && [
        <g key="left" transform="translate(19 35)"><path className="icue-mascot__sparkle" d="M0-6 1.8-1.8 6 0 1.8 1.8 0 6-1.8 1.8-6 0-1.8-1.8Z" /></g>,
        <g key="right" transform="translate(84 24)"><path className="icue-mascot__sparkle" style={{ '--effect-delay': '140ms' }} d="M0-5 1.5-1.5 5 0 1.5 1.5 0 5-1.5 1.5-5 0-1.5-1.5Z" /></g>,
      ]}
      {effect === 'hearts' && [76, 86].map((x, index) => (
        <g key={x} transform={`translate(${x} ${35 + index * 10})`}>
          <path className="icue-mascot__heart" style={{ '--effect-delay': `${index * 200}ms` }} d="M0 5C-12-2-5-9 0-4C5-9 12-2 0 5Z" />
        </g>
      ))}
      {effect === 'zzz' && [0, 1, 2].map(index => (
        <g key={index} transform={`translate(${75 + index * 7} ${35 - index * 11}) scale(${0.65 + index * 0.15})`}>
          <path className="icue-mascot__sleep-z" style={{ '--effect-delay': `${index * 650}ms` }} d="M-3-3H3L-3 3H3" />
        </g>
      ))}
      {effect === 'music' && [0, 1].map(index => (
        <g key={index} transform={`translate(${index ? 91 : 14} ${index ? 30 : 42}) scale(${index ? 0.85 : 0.95})`}>
          <g className="icue-mascot__music-note" style={{ '--effect-delay': `${index * 1.1}s` }}>
            <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M0 2V-9L6-11V0M0-6 6-8" />
            <ellipse cx="-2" cy="2" rx="3" ry="2" fill="currentColor" transform="rotate(-20 -2 2)" />
            <ellipse cx="4" cy="0" rx="3" ry="2" fill="currentColor" transform="rotate(-20 4 0)" />
          </g>
        </g>
      ))}
      {effect === 'bulb' && (
        <g className="icue-mascot__bulb">
          <path className="icue-mascot__bulb-rays" d="M82 4V1M71 9 68 7M93 9 96 7M70 20 67 22M94 20 97 22" />
          <path fill="#ffdf77" stroke="#795b20" strokeWidth="1.4" d="M78 24V22C68 12 76 6 82 6S96 12 86 22V24Z" />
          <path fill="none" stroke="#a77b20" strokeWidth="1.3" d="M80 24V17L78 14M84 24V17L86 14" />
          <path fill="#b7d5e4" stroke="#36576d" strokeWidth="1.3" d="M78 24H86V28H78ZM80 28H84V30H80Z" />
        </g>
      )}
      {effect === 'book' && (
        <g className="icue-mascot__book" stroke="#234b77" strokeWidth="1.4" strokeLinejoin="round">
          <path fill="#3e8bcb" d="M32 70Q43 67 54 72Q65 67 77 70V87Q65 84 54 89Q43 84 32 87Z" />
          <path fill="#f4f6e9" d="M34 67Q44 66 54 71Q64 66 75 67V84Q64 83 54 87Q44 83 34 84Z" />
          <path fill="none" d="M54 71V87" />
          <path fill="none" stroke="#8cabc1" strokeWidth="1" d="M38 72 49 74M38 76 49 78M38 80 46 81M59 74 70 72M59 78 70 76" />
          <path className="icue-mascot__page" fill="#fffbed" d="M54 71Q60 65 68 65V82Q60 82 54 87Z" />
          <path fill="#edb54e" stroke="none" d="M70 68H73V77L71.5 75 70 77Z" />
        </g>
      )}
      {effect === 'coffee' && (
        <g className="icue-mascot__coffee">
          <g transform="translate(57.5 92) scale(0.78) translate(-57.5 -92)">
            <defs>
              <linearGradient id={`${id}-ceramic`} x1="0" x2="1" y1="0" y2="0">
                <stop stopColor="#8ea6b8" /><stop offset="0.28" stopColor="#b9cbd7" />
                <stop offset="0.72" stopColor="#a8bfce" /><stop offset="1" stopColor="#7994aa" />
              </linearGradient>
              <linearGradient id={`${id}-coffee`} x1="0" x2="0" y1="0" y2="1">
                <stop stopColor="#42291f" /><stop offset="1" stopColor="#936345" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="#7793a8" strokeWidth="1.25" strokeLinecap="round">
              <path className="icue-mascot__steam" d="M67 65C74 62 69 59 75 55" />
              <path className="icue-mascot__steam" style={{ '--effect-delay': '1s' }} d="M73 65C80 62 75 58 81 54" />
            </g>
            <path fill="none" stroke="#748fa5" strokeWidth="5.8" d="M67 72C80 69 80 86 67 85" />
            <path fill="none" stroke="#a8bfce" strokeWidth="3.5" d="M67 72C80 69 80 86 67 85" />
            <path fill={`url(#${id}-ceramic)`} stroke="#748fa5" strokeWidth="0.65" d="M46 69Q57 65 69 69L68 89C68 94 47 94 47 89Z" />
            <ellipse cx="57.5" cy="69.2" rx="11.5" ry="3.1" fill="#bdcfda" stroke="#839eb1" strokeWidth="0.55" />
            <ellipse cx="57.5" cy="69.4" rx="9.4" ry="1.9" fill={`url(#${id}-coffee)`} />
          </g>
        </g>
      )}
    </svg>
  )
}

export default memo(BirdEffects)
