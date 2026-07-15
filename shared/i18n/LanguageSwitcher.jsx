import { memo, useMemo, useState } from 'react'
import FlagIcon from './FlagIcon'
import { TextScramble } from '../motion-primitives/TextScramble'
import './LanguageSwitcher.css'

function LanguageSwitcher({
  languages,
  value,
  onChange,
  ariaLabel,
  title,
  className = 'lang-switcher',
}) {
  const [hovered, setHovered] = useState(false)
  const [scrambleKey, setScrambleKey] = useState(0)
  const currentLabel = useMemo(
    () => languages.find((l) => l.code === value)?.label ?? value,
    [languages, value],
  )

  function handleEnter() {
    setHovered(true)
    setScrambleKey((k) => k + 1)
  }

  return (
    <label
      className={className}
      title={title}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
      onFocus={handleEnter}
      onBlur={() => setHovered(false)}
    >
      <span className="visually-hidden">{ariaLabel}</span>
      <FlagIcon lang={value} className="lang-switcher__flag" />
      <span className="lang-switcher__field">
        <span className="lang-switcher__text" aria-hidden="true">
          {hovered ? (
            <TextScramble
              key={scrambleKey}
              as="span"
              className="lang-switcher__scramble"
              duration={0.7}
              speed={0.035}
              trigger
            >
              {currentLabel}
            </TextScramble>
          ) : (
            currentLabel
          )}
        </span>
        <select
          className="lang-switcher__select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}

export default memo(LanguageSwitcher)
