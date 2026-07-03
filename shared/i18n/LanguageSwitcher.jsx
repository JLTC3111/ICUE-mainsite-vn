import { memo } from 'react'
import FlagIcon from './FlagIcon'

function LanguageSwitcher({
  languages,
  value,
  onChange,
  ariaLabel,
  title,
  className = 'lang-switcher',
}) {
  return (
    <label className={className} title={title}>
      <span className="visually-hidden">{ariaLabel}</span>
      <FlagIcon lang={value} className="lang-switcher__flag" />
      <select
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
    </label>
  )
}

export default memo(LanguageSwitcher)
