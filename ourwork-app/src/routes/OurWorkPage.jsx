import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getOurWorkContent, IMAGE_SIZES } from '../data/ourWorkScopes'
import { assetUrl } from '../lib/assets'
import { useOurWorkMotion } from '../hooks/useOurWorkMotion'
import { useMainSite } from '../hooks/useMainSite'
import CountUp from '../components/reactbits/CountUp'
import SpotlightCard from '../components/reactbits/SpotlightCard'
import { SplitFlapHeadline } from '../components/reactbits/SplitFlapText'
import { useDocumentMeta } from '../../../shared/site-meta/useDocumentMeta'
import '../styles/ourWork.css'

/**
 * Site-root path, not an app asset: the PDF is ~88 MB and lives once in
 * public/docs/. `_redirects` maps /docs/* → /public/docs/:splat.
 */
const CAPABILITY_STATEMENT_URL = '/docs/capability_statement.pdf'

/**
 * Stats are authored as display strings ('120+', '18') so each locale keeps
 * control of its own suffix. Split off the numeral for CountUp and hand the
 * rest back as prefix/suffix; anything that does not parse (a locale that
 * writes its figure in words) falls through to plain text unanimated.
 */
function splitStat(raw) {
  const match = /^(\D*)(\d+(?:[.,]\d+)?)(.*)$/.exec(raw)
  if (!match) return null
  return { prefix: match[1], value: Number(match[2].replace(',', '.')), suffix: match[3] }
}

export default function OurWorkPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const content = getOurWorkContent(lang)
  const { hashLink } = useMainSite()
  const rootRef = useRef(null)

  // The proof band's counters start when the band itself is revealed, off the
  // same rAF pass — see useOurWorkMotion's note on why there is no observer.
  const [statsLive, setStatsLive] = useState(false)
  const handleReveal = useCallback((el) => {
    if (el.classList.contains('ow-stats')) setStatsLive(true)
  }, [])

  // At 1440 all four cards are already on screen, so clicking an index row
  // barely moves the page. Lighting the matching card on hover/focus is the
  // feedback that makes the row read as a live control before it is clicked.
  const [linkedScope, setLinkedScope] = useState(null)

  useOurWorkMotion(rootRef, lang, handleReveal)

  useDocumentMeta({ title: t('meta.title'), description: t('meta.description') })

  // The browser resolves #scope-0N before React has rendered the cards, so a
  // shared or reloaded deep link lands at the top of the page. Re-apply the
  // hash once the DOM exists, and force the target revealed first — scrolling
  // to a card still at `opacity: 0` looks just as broken as not scrolling.
  useEffect(() => {
    const goToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (!id) return
      const target = document.getElementById(id)
      if (!target) return
      target.classList.add('is-revealed')
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }

    const frame = requestAnimationFrame(goToHash)
    window.addEventListener('hashchange', goToHash)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('hashchange', goToHash)
    }
  }, [])

  return (
    <div className="our-work" ref={rootRef}>
      {/* §5.2 Hero + scope index */}
      <section className="ow-section ow-hero">
        <div className="ow-hero__left">
          <p className="ow-eyebrow ow-reveal">{content.eyebrow}</p>
          <SplitFlapHeadline
            className="ow-hero__title ow-reveal"
            text={content.heroTitle}
          />
          <p className="ow-hero__lead ow-reveal">{content.heroLead}</p>
        </div>

        <nav className="ow-index ow-reveal" aria-label={content.indexTitle}>
          <p className="ow-index__label">{content.indexTitle}</p>
          <div className="ow-index__list">
            {content.scopes.map((scope) => (
              <a
                key={scope.num}
                className="ow-index__row"
                href={`#scope-${scope.num}`}
                onMouseEnter={() => setLinkedScope(scope.num)}
                onMouseLeave={() => setLinkedScope(null)}
                onFocus={() => setLinkedScope(scope.num)}
                onBlur={() => setLinkedScope(null)}
              >
                <span className="ow-index__num">{scope.num}</span>
                <span className="ow-index__title">{scope.title}</span>
                <span className="ow-index__leader" aria-hidden="true" />
                <span className="ow-index__count">{scope.count}</span>
              </a>
            ))}
          </div>
        </nav>
      </section>

      {/* §5.3 Scope cards */}
      <section className="ow-section ow-scopes">
        {content.scopes.map((scope, i) => (
          <SpotlightCard
            as="article"
            key={scope.num}
            id={`scope-${scope.num}`}
            className="ow-card ow-reveal"
            data-linked={linkedScope === scope.num || undefined}
          >
            <div className="ow-card__well">
              <img
                className="ow-card__img"
                data-para="34"
                src={assetUrl(scope.img)}
                alt={scope.title}
                width={IMAGE_SIZES[scope.img]?.w}
                height={IMAGE_SIZES[scope.img]?.h}
                decoding="async"
                loading={i < 2 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : undefined}
              />
              <span className="ow-card__badge">{`${scope.num} · ${scope.code}`}</span>
            </div>

            <div className="ow-card__body">
              <h2 className="ow-card__title">{scope.title}</h2>
              <p className="ow-card__sub">{scope.sub}</p>
              <p className="ow-card__desc">{scope.desc}</p>

              <p className="ow-card__items-label">{content.deliverLabel}</p>
              <ul className="ow-card__items">
                {scope.items.map((item) => (
                  <li key={item} className="ow-card__item">
                    <span className="ow-card__dash" aria-hidden="true">
                      —
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="ow-card__std">{scope.std}</p>
            </div>
          </SpotlightCard>
        ))}
      </section>

      {/* §5.4 Process strip */}
      <section className="ow-section ow-process">
        <p className="ow-process__label">{content.processTitle}</p>
        <div className="ow-process__grid">
          {content.process.map((step) => (
            <div key={step.k} className="ow-step ow-reveal">
              <p className="ow-step__k">{step.k}</p>
              <p className="ow-step__t">{step.t}</p>
              <p className="ow-step__d">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* §5.5 Proof band */}
      <section className="ow-section ow-proof">
        <div className="ow-stats ow-reveal">
          {content.stats.map((stat, i) => {
            const parsed = splitStat(stat.n)
            return (
              <div key={stat.l} className="ow-stat">
                {/* The counter runs on a text node inside .ow-stat__n, so the
                    figure keeps its gradient and its `fit-content` width. The
                    written-out value stays in the DOM for screen readers,
                    which would otherwise announce every intermediate tick. */}
                <p className="ow-stat__n" aria-hidden={parsed ? 'true' : undefined}>
                  {parsed ? (
                    <CountUp
                      to={parsed.value}
                      prefix={parsed.prefix}
                      suffix={parsed.suffix}
                      startWhen={statsLive}
                      duration={1.6}
                      delay={i * 0.09}
                      locale={lang}
                    />
                  ) : (
                    stat.n
                  )}
                </p>
                {parsed ? <span className="visually-hidden">{stat.n}</span> : null}
                <p className="ow-stat__l">{stat.l}</p>
              </div>
            )
          })}
        </div>
        <ul className="ow-certs">
          {content.certs.map((cert) => (
            <li key={cert} className="ow-cert">
              {cert}
            </li>
          ))}
        </ul>
      </section>

      {/* §5.6 Close — brochure tone, no form on the page */}
      <section className="ow-section ow-close">
        <div className="ow-close__text">
          <h3 className="ow-close__title">{content.closeTitle}</h3>
          <p className="ow-close__lead">{content.closeLead}</p>
        </div>
        <div className="ow-close__actions">
          <a
            className="ow-btn ow-btn--primary"
            href={CAPABILITY_STATEMENT_URL}
            download="ICUE-capability-statement.pdf"
          >
            <svg
              className="ow-btn__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12" />
              <path d="m7 11 5 5 5-5" />
              <path d="M4 20h16" />
            </svg>
            {content.closeA}
          </a>
          <a className="ow-btn ow-btn--ghost" href={hashLink('pastProjects')}>
            {content.closeB} →
          </a>
        </div>
      </section>
    </div>
  )
}
