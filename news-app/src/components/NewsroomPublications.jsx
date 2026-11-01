import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NEWSROOM_PARTNERS, RELATED_PUBLICATIONS } from '../data/newsroomPublications'
import './NewsroomPublications.css'

function websiteDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function PublicationLogo({ row, t }) {
  const [failed, setFailed] = useState(false)
  const initials = row.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')
  return (
    <span className="news-publications__logo">
      {row.logo && !failed ? (
        <img src={row.logo} alt={t('publicationDirectory.logoAlt', { name: row.name })}
          width="104" height="64" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : <span className="news-publications__initials" aria-hidden="true">{initials}</span>}
    </span>
  )
}

function PublicationPreview({ row, t }) {
  const [failed, setFailed] = useState(false)
  const source = row.previewSource || row.url
  return (
    <figure className="news-publications__preview">
      <div className="news-publications__image-wrap">
        {row.previewImage && !failed ? (
          <img src={row.previewImage} alt={t('publicationDirectory.previewAlt', { name: row.name })}
            className={row.previewFit === 'contain' ? 'news-publications__image--contain' : undefined}
            width="960" height="600" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        ) : (
          <div className="news-publications__image-fallback" role="status">
            <span>{row.name}</span>
            <p>{t('publicationDirectory.previewUnavailable')}</p>
          </div>
        )}
      </div>
      <figcaption>
        <span>{t(`publicationDirectory.previewTypes.${row.previewKind || 'photo'}`)} · </span>
        {row.previewCredit && <span>{row.previewCredit} · </span>}
        <a href={source} target="_blank" rel="noopener noreferrer">
          {t('publicationDirectory.previewSource')} <span aria-hidden="true">↗</span>
        </a>
      </figcaption>
    </figure>
  )
}

function PublicationEntry({ row, open, onToggle, t }) {
  const entryId = useId()
  const buttonId = `${entryId}-toggle`
  const panelId = `${entryId}-panel`
  const domain = websiteDomain(row.url)
  return (
    <article className={`news-publications__entry${open ? ' is-open' : ''}`}>
      <h3 className="news-publications__entry-heading">
        <button id={buttonId} type="button" className="news-publications__toggle"
          aria-expanded={open} aria-controls={panelId}
          aria-label={t(`publicationDirectory.${open ? 'collapsePreview' : 'expandPreview'}`, { name: row.name })}
          onClick={onToggle}>
          <PublicationLogo row={row} t={t} />
          <span className="news-publications__summary">
            <span className="news-publications__name">{row.name}</span>
            <span className="news-publications__focus">{t(`publicationDirectory.focus.${row.focusKey}`)}</span>
          </span>
          <span className="news-publications__domain">{domain}</span>
          <svg className="news-publications__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        {open && (
          <div className="news-publications__panel">
            <PublicationPreview row={row} t={t} />
            <div className="news-publications__details">
              <dl>
                <div>
                  <dt>{t('publicationDirectory.editorialFocus')}</dt>
                  <dd>{t(`publicationDirectory.focus.${row.focusKey}`)}</dd>
                </div>
                <div>
                  <dt>{t('publicationDirectory.website')}</dt>
                  <dd><a href={row.url} target="_blank" rel="noopener noreferrer">{domain}</a></dd>
                </div>
                <div>
                  <dt>{t('publicationDirectory.language')}</dt>
                  <dd>{t(`publicationDirectory.languages.${row.language || 'multiple'}`)}</dd>
                </div>
              </dl>
              <a className="news-publications__visit" href={row.url} target="_blank" rel="noopener noreferrer"
                aria-label={t('publicationDirectory.visitLabel', { name: row.name })}>
                {t('publicationDirectory.visit')} <span aria-hidden="true">↗</span>
              </a>
              {row.logoCredit && <p className="news-publications__credit">{row.logoCredit}</p>}
              {row.logoSource && (
                <a className="news-publications__logo-source" href={row.logoSource} target="_blank" rel="noopener noreferrer">
                  {t('publicationDirectory.logoSource')} <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function PublicationSection({ id, title, description, rows, openId, onToggle, t }) {
  return (
    <section className="news-publications__section" aria-labelledby={`${id}-title`}>
      <header className="news-publications__header">
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="news-publications__entries">
        {rows.map(row => <PublicationEntry key={row.id} row={row} open={openId === row.id} onToggle={() => onToggle(row.id)} t={t} />)}
      </div>
    </section>
  )
}

export default function NewsroomPublications() {
  const { t } = useTranslation()
  const [openId, setOpenId] = useState(null)
  const toggle = id => setOpenId(current => current === id ? null : id)
  return (
    <div className="news-publications">
      <PublicationSection id="newsroom-partners"
        title={t('publicationDirectory.partnersTitle')} description={t('publicationDirectory.partnersDescription')}
        rows={NEWSROOM_PARTNERS} openId={openId} onToggle={toggle} t={t} />
      <PublicationSection id="newsroom-related-publications"
        title={t('publicationDirectory.relatedTitle')} description={t('publicationDirectory.relatedDescription')}
        rows={RELATED_PUBLICATIONS} openId={openId} onToggle={toggle} t={t} />
      <p className="news-publications__attribution">{t('publicationDirectory.attribution')}</p>
    </div>
  )
}
