import { useId } from 'react'
import { useMainSite } from '../hooks/useMainSite'
import {
  getEmployeeById,
  getStructureAuthorProfile,
  resolveAuthorLinkTarget,
} from '../lib/authorLinks'
import './AuthorLink.css'

export default function AuthorLink({ name, className = '' }) {
  const tooltipId = useId()
  const { peopleLink, structureLink, uiLang } = useMainSite()
  const target = resolveAuthorLinkTarget(name)

  if (!target) return <span className={className}>{name}</span>

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
      {name}
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
