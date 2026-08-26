import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Glyph from './Glyph'
import Highlight from './Highlight'
import { PIN_ICON } from '../data/icons'

/**
 * One posting: title, department and location always visible; the description,
 * the skill tags and the apply link behind a disclosure.
 *
 * The legacy card bound `onclick = () => openJobDetail(job)`
 * (src/script.js:3232) to a function that does not exist anywhere in the repo,
 * so every click threw a ReferenceError while the card showed everything it
 * had anyway. This is what that handler was evidently for.
 *
 * `forceExpanded` is why the disclosure does not hide anything from search: a
 * card whose description or tags match the query opens itself, so the reader
 * sees the highlighted text that caused the match rather than a collapsed card
 * with no visible reason to be in the results.
 */
export default function JobCard({ job, term, applyHref, forceExpanded = false }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  const id = useId()

  const expanded = open || forceExpanded

  return (
    <article className={`rc-job${expanded ? ' is-expanded' : ''}`} id={`job-${job.id}`}>
      <button
        type="button"
        className="rc-job__summary"
        aria-expanded={expanded}
        aria-controls={`${id}-detail`}
        onClick={() => setOpen((value) => !value)}
      >
        <h3 className="rc-job__title">
          <Highlight text={job.title} term={term} />
        </h3>
        <p className="rc-job__department">
          <span className="rc-job__field">{t('jobs.department')}</span>
          <Highlight text={job.department} term={term} />
        </p>
        <p className="rc-job__location">
          <Glyph markup={PIN_ICON} className="rc-job__pin" />
          <Highlight text={job.location} term={term} />
        </p>
        <span className="rc-job__disclosure">
          {t(expanded ? 'jobs.collapse' : 'jobs.expand')}
        </span>
      </button>

      {expanded && (
        <div className="rc-job__body" id={`${id}-detail`}>
          <p className="rc-job__description">
            <Highlight text={job.description} term={term} />
          </p>

          <ul className="rc-job__tags">
            {job.tags.map((tag) => (
              <li className="rc-job__tag" key={tag}>
                <Highlight text={tag} term={term} />
              </li>
            ))}
          </ul>

          {/* Straight to the contact form. No `#job-…` fragment: contact-app
              does not read one, and a URL that looks like it carries the role
              through when it does not is worse than a plain link. Its form does
              have a "careers" topic — wiring `?topic=` into contact-app would
              be the real improvement. */}
          <a className="rc-job__apply" href={applyHref}>
            {t('jobs.apply')}
          </a>
        </div>
      )}
    </article>
  )
}
