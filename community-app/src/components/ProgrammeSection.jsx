import { useTranslation } from 'react-i18next'
import PhotoFigure from './PhotoFigure'

/**
 * One programme: what it was called, when and where, what was done, and its
 * photographs.
 *
 * `date` and `place` are rendered only when the programme has them. The Bảo
 * Yên banner carries no date, so that entry has none in programmes.js and
 * simply shows a place — rather than an inferred month presented as fact.
 */
function formatDate(iso, locale) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function ProgrammeSection({ programme, index, onOpenPhoto }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage || i18n.language
  const date = formatDate(programme.meta.date, locale)
  const photos = programme.meta.photos

  return (
    <section className="cm-programme" id={programme.id} aria-labelledby={`${programme.id}-name`}>
      <header className="cm-programme__head">
        <p className="cm-programme__kicker">{programme.kicker}</p>
        <h2 className="cm-programme__name" id={`${programme.id}-name`}>
          {programme.name}
        </h2>

        {(date || programme.place) && (
          <p className="cm-programme__meta">
            {date && <time dateTime={programme.meta.date}>{date}</time>}
            {date && programme.place && <span aria-hidden="true"> · </span>}
            {programme.place}
          </p>
        )}

        {programme.summary && <p className="cm-programme__summary">{programme.summary}</p>}
      </header>

      {programme.body && (
        <div className="cm-programme__body">
          {programme.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      )}

      <div className="cm-grid" aria-label={t('a11y.gallery', { name: programme.name })}>
        {photos.map((id, n) => (
          <PhotoFigure
            key={id}
            id={id}
            caption={programme.captions[id]}
            /* Only the very first photograph on the page is eager; everything
               below the fold waits until it is scrolled towards. */
            priority={index === 0 && n === 0}
            openLabel={t('a11y.openPhoto', { caption: programme.captions[id] })}
            onOpen={() => onOpenPhoto(id)}
          />
        ))}
      </div>
    </section>
  )
}
