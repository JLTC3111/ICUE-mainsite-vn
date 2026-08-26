import { useTranslation } from 'react-i18next'
import { withLocale } from '@icue/site-routes/mainSitePaths.js'
import { openZaloChat } from '@icue/zalo/zaloLink'
import {
  CHAT,
  DESKS,
  GENERAL_EMAIL,
  OFFICE,
  PHONE_DISPLAY,
  PHONE_TEL,
  SHORTCUTS,
} from '../data/contactChannels'
import { CompactFlapText, ParticleText } from './MotionText'
import './ContactRail.css'

function Arrow() {
  return (
    <span className="ct-arrow" aria-hidden="true">
      ↗
    </span>
  )
}

export default function ContactRail() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language

  return (
    <aside className="ct-rail">
      {/* How long a reply takes, said in the largest type on the page after the
          headline — it is the question every contact form is really asked. */}
      <div className="ct-promise ct-reveal">
        <ParticleText
          className="ct-promise__figure"
          text={t('promise.figure')}
        />
        <div className="ct-promise__copy">
          <p className="ct-promise__headline">
            <CompactFlapText
              className="ct-promise__unit"
              text={t('promise.unit')}
            />
          </p>
          <p className="ct-promise__body">{t('promise.body')}</p>
        </div>
      </div>

      <section className="ct-rail__section ct-reveal">
        <h2 className="ct-rail__heading">{t('skipForm.label')}</h2>
        <a className="ct-rail__email" href={`mailto:${GENERAL_EMAIL}`}>
          {GENERAL_EMAIL}
        </a>
        <a className="ct-rail__phone" href={`tel:${PHONE_TEL}`}>
          {PHONE_DISPLAY}
        </a>
        <p className="ct-rail__note">{t('skipForm.note')}</p>
      </section>

      <section className="ct-rail__section ct-rail__section--spaced ct-reveal">
        <h2 className="ct-rail__heading">{t('rail.directLines')}</h2>
        <ul className="ct-desks">
          {DESKS.map((desk) => (
            <li key={desk.id} className="ct-desk">
              <p className="ct-desk__title">{t(`desks.${desk.id}.title`)}</p>
              {/* Two of these desks share the reception mailbox, so the subject
                  is what tells them apart on arrival. */}
              <a
                className="ct-desk__mail"
                href={`mailto:${desk.email}?subject=${encodeURIComponent(t(`desks.${desk.id}.title`))}`}
              >
                {desk.email}
              </a>
              <p className="ct-desk__note">{t(`desks.${desk.id}.note`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="ct-rail__section ct-reveal">
        <h2 className="ct-rail__heading">{t('rail.office')}</h2>
        <p className="ct-rail__address">
          {t('office.line1')}
          <br />
          {t('office.line2')}
        </p>
        <p className="ct-rail__note">
          {t('office.hours')}
          <br />
          {t('office.visitors')}
        </p>
        <a
          className="ct-rail__link"
          href={OFFICE.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('office.maps')}
          <Arrow />
        </a>
      </section>

      <section className="ct-rail__section ct-reveal">
        <h2 className="ct-rail__heading">{t('rail.chat')}</h2>
        {/* zalo.me bounces desktop browsers to a login wall; the shared helper
            hands those visitors the app deep link instead. */}
        <a
          className="ct-rail__link"
          href={CHAT.zaloUrl}
          onClick={(event) => openZaloChat(CHAT.zaloPhone, event)}
        >
          {t('chat.zalo', { number: CHAT.zaloDisplay })}
        </a>
        <a
          className="ct-rail__link"
          href={CHAT.messengerUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('chat.messenger')}
        </a>
        <p className="ct-rail__note">{t('chat.note')}</p>
      </section>

      <section className="ct-rail__section ct-reveal">
        <h2 className="ct-rail__heading">{t('rail.faster')}</h2>
        {/* The two internal shortcuts point at /recruitment and /faqs, which
            now render all six languages themselves. Without withLocale they
            handed the reader a bare path and the locale survived only via
            localStorage — every other link on this page carries it. The
            capability PDF is `external` and has no locale to carry. */}
        {SHORTCUTS.map((item) => (
          <a
            key={item.id}
            className="ct-rail__link"
            href={item.external ? item.href : withLocale(item.href, lang)}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
          >
            {t(`shortcuts.${item.id}`)}
            <Arrow />
          </a>
        ))}
      </section>
    </aside>
  )
}
