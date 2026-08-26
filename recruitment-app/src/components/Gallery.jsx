import { useTranslation } from 'react-i18next'
import Glyph from './Glyph'
import { GALLERY_ICONS, GALLERY_KEYS } from '../data/icons'

/*
 * The photographs moved from the site-wide public/recruitment/ into this app's
 * own public/media/ so the app can own the whole /recruitment/ URL namespace —
 * a Vite build with emptyOutDir would otherwise have deleted them. The home
 * page teaser points at the same files.
 */
const MEDIA_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/media`

export default function Gallery() {
  const { t } = useTranslation()

  return (
    <section className="rc-gallery" aria-label={t('gallery.label')}>
      <div className="rc-container">
        <ul className="rc-gallery__grid">
          {GALLERY_KEYS.map((key) => (
            <li className="rc-gallery__item" key={key}>
              <img
                src={`${MEDIA_BASE}/${key}.webp`}
                alt={t(`gallery.items.${key}.alt`)}
                width="640"
                height="427"
                loading="lazy"
                decoding="async"
              />
              <span className="rc-gallery__caption">
                <Glyph markup={GALLERY_ICONS[key]} className="rc-gallery__icon" />
                {t(`gallery.items.${key}.label`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
