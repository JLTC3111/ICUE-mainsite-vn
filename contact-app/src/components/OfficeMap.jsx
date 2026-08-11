import { useTranslation } from 'react-i18next'
import { OFFICE } from '../data/contactChannels'

/**
 * Where the office actually is, in the full-width band between the form and the
 * footer.
 *
 * OpenStreetMap's embed endpoint rather than Google's: it needs no API key, no
 * billing account and no consent gate, which is the difference between a map
 * that works on a fresh deploy and one that shows "for development purposes
 * only" across itself. Attribution is not decoration — the tiles are ODbL, and
 * the credit below is the licence being met.
 */
export default function OfficeMap() {
  const { t } = useTranslation()

  return (
    <section className="ct-map ct-reveal" aria-labelledby="ct-map-title">
      <div className="ct-map__head">
        <h2 className="ct-eyebrow" id="ct-map-title">
          {t('map.title')}
        </h2>
        <p className="ct-map__links">
          <a href={OFFICE.osmUrl} target="_blank" rel="noopener noreferrer">
            {t('map.larger')}
            <span className="ct-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
          <a href={OFFICE.mapsUrl} target="_blank" rel="noopener noreferrer">
            {t('map.directions')}
            <span className="ct-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        </p>
      </div>

      <iframe
        className="ct-map__frame"
        title={t('map.frameTitle')}
        src={OFFICE.embedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      <p className="ct-map__caption">
        {t('map.caption')}{' '}
        <a href={OFFICE.attributionUrl} target="_blank" rel="noopener noreferrer">
          {t('map.attribution')}
        </a>
      </p>
    </section>
  )
}
