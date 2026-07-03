import { memo } from 'react'
import { flagSvgUrl } from './langFlags'
import './FlagIcon.css'

function FlagIcon({ lang, className = '', title }) {
  const src = flagSvgUrl(lang)
  return (
    <img
      src={src}
      alt=""
      className={`flag-icon ${className}`.trim()}
      aria-hidden={title ? undefined : true}
      title={title}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  )
}

export default memo(FlagIcon)
