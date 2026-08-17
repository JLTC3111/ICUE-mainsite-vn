import { useId } from 'react'
import { useMainSite } from '../hooks/useMainSite'
import {
  getEmployeeById,
  getStructureAuthorProfile,
  resolveAuthorLinkTarget,
} from '../lib/authorLinks'
import HighlightedText from './HighlightedText'
import './AuthorLink.css'

/**
 * `query` is the newsroom's live search text: author names are part of what the
 * search matches on, so a hit has to be visible on the byline too. Absent — the
 * usual case, everywhere but the filtered grid — the name renders untouched.
 */
export default function AuthorLink({ name, className = '', query = '' }) {
  const tooltipId = useId()
  const { peopleLink, structureLink, uiLang } = useMainSite()
  const target = resolveAuthorLinkTarget(name)
  const label = <HighlightedText text={name} query={query} />

  if (!target) return <span className={className}>{label}</span>

  const href = target.type === 'structure-profile'
    ? structureLink(`profile/${encodeURIComponent(target.profileId)}`)
    : target.type === 'people-profile'
      ? peopleLink(target.path)
      : peopleLink('')
  const employee = target.type === 'structure-profile'
    ? getStructureAuthorProfile(target.profileId)
    : target.type === 'people-profile'
      ? getEmployeeById(target.employeeId)
      : null
  const employeePhoto = employee?.photo?.startsWith('profilePhotos/')
    ? employee.photo
    : `profilePhotos/${employee?.photo || ''}`

  const authorAnchor = (
    <a
      className={`${className} author-name-link`.trim()}
      href={href}
      aria-describedby={employee ? tooltipId : undefined}
    >
      {label}
    </a>
  )

  if (!employee) return authorAnchor

  return (
    <span className="author-profile-trigger">
      {authorAnchor}
      <span id={tooltipId} className="author-profile-popover" role="tooltip">
        <img
          className="author-profile-popover__photo"
          src={`${import.meta.env.BASE_URL}${employeePhoto}`}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className="author-profile-popover__copy">
          <strong>{employee.name}</strong>
          <span>{employee.title[uiLang] || employee.title.en}</span>
          <small>ICUE</small>
        </span>
      </span>
    </span>
  )
}
