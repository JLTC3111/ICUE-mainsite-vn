import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'
import {
  ArrowUpRight,
  Cookie,
  FileText,
  Mail,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import MainSiteNav from '@icue/main-site-nav/MainSiteNav'
import {
  PEOPLE_SUBMENU,
  STANDALONE_DRAWER_LINKS,
} from '@icue/main-site-nav/navLinks'
import Footer from '@icue/site-footer/Footer'
import PillSiteHeader from '@icue/pill-header'
import BlurFade from './components/BlurFade'
import CookiePreferences from './components/CookiePreferences'
import GooeyTabs from './components/GooeyTabs'
import PageLanguageMenu from './components/PageLanguageMenu'
import ScrollProgress from './components/ScrollProgress'
import SpotlightSection from './components/SpotlightSection'
import {
  AUTHORITATIVE_LANGUAGE,
  buildLegalDocuments,
  ensureLegalContent,
  hasLegalContent,
} from './legalDocuments'

const ICONS = {
  cookie: Cookie,
  file: FileText,
  scale: Scale,
  shield: ShieldCheck,
}

function setMeta(selector, attribute, value) {
  const element = document.head.querySelector(selector)
  if (element) element.setAttribute(attribute, value)
}

/**
 * The heading, summary and meta description are translated; the document body
 * is not (see lib/i18n.js). `lang` therefore tracks the reader's UI locale so
 * assistive tech and the font stack switch with the chrome, while the body
 * sections carry their own `lang` — see LegalDocument.
 */
function useDocumentMeta(document, meta, language) {
  useEffect(() => {
    const url = `https://icue.vn/legal/${document.slug}`
    const title = `${meta.title} | ICUE Vietnam`

    window.document.title = title
    setMeta('meta[name="description"]', 'content', meta.description)
    setMeta('link[rel="canonical"]', 'href', url)
    setMeta('meta[property="og:url"]', 'content', url)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', meta.description)
    setMeta('meta[name="twitter:title"]', 'content', title)
    setMeta('meta[name="twitter:description"]', 'content', meta.description)
    window.document.documentElement.lang = language
  }, [document, meta.title, meta.description, language])
}

function RichList({ block }) {
  return (
    <>
      {block.intro && <p>{block.intro}</p>}
      <ul className="legal-list">
        {block.items.map((item) => {
          if (Array.isArray(item)) {
            return (
              <li key={`${item[0]}-${item[1]}`}>
                <strong>{item[0]}:</strong> {item[1]}
              </li>
            )
          }
          return <li key={item}>{item}</li>
        })}
      </ul>
    </>
  )
}

function DataTable({ block }) {
  return (
    <div className="legal-table-wrap" role="region" aria-label={block.label} tabIndex={0}>
      <table>
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th key={header} scope="col">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.join('-')}>
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InfoCards({ block }) {
  return (
    <div className="legal-info-grid">
      {block.items.map((item, index) => (
        <article className="legal-info-card" key={item.title}>
          {block.numbered && <span className="legal-info-card__number">{index + 1}</span>}
          <h3>{item.title}</h3>
          {item.text && <p>{item.text}</p>}
          {item.items && (
            <ul className="legal-list">
              {item.items.map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}
        </article>
      ))}
    </div>
  )
}

function Steps({ items }) {
  return (
    <ol className="legal-steps">
      {items.map(([title, text], index) => (
        <li key={title}>
          <span>{index + 1}</span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function GdprRequest() {
  const { t } = useTranslation()

  return (
    <div className="legal-request">
      <div>
        <p className="legal-request__label">{t('gdpr.channel')}</p>
        <h3>{t('gdpr.title')}</h3>
        <p>{t('gdpr.body')}</p>
      </div>
      <a
        className="legal-button"
        href="mailto:info@icue.vn?subject=%5BGDPR%20Request%5D"
      >
        <Mail aria-hidden="true" />
        {t('gdpr.cta')}
      </a>
    </div>
  )
}

function Block({ block }) {
  switch (block.type) {
    case 'paragraph':
      return <p>{block.text}</p>
    case 'callout':
      return (
        <aside className={`legal-callout${block.tone ? ` is-${block.tone}` : ''}`}>
          {block.text}
        </aside>
      )
    case 'list':
      return <RichList block={block} />
    case 'table':
      return <DataTable block={block} />
    case 'cards':
      return <InfoCards block={block} />
    case 'steps':
      return <Steps items={block.items} />
    case 'link':
      return (
        <div className="legal-inline-link">
          <p>{block.text}</p>
          <Link to={block.href.replace('/legal', '')}>
            {block.label}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      )
    case 'external-link':
      return (
        <a className="legal-external-link" href={block.href} target="_blank" rel="noreferrer">
          {block.text}
          <ArrowUpRight aria-hidden="true" />
        </a>
      )
    case 'request':
      return <GdprRequest />
    case 'preferences':
      return <CookiePreferences />
    default:
      return null
  }
}

function ContactCard({ contact, accent, t }) {
  return (
    <BlurFade inView>
      <aside className="legal-contact" style={{ '--document-accent': accent }}>
        <div>
          <p className="legal-contact__eyebrow">{t('contact.eyebrow')}</p>
          <h2>{contact.title}</h2>
          <p>{contact.response}</p>
        </div>
        <address>
          <a href="mailto:info@icue.vn">
            <Mail aria-hidden="true" />
            info@icue.vn
          </a>
          <a href="tel:+842437728485">
            <Phone aria-hidden="true" />
            +84 24 3772 8485
          </a>
          <p>
            <MapPin aria-hidden="true" />
            124 Hoàng Ngân, Cầu Giấy, Hà Nội
          </p>
        </address>
      </aside>
    </BlurFade>
  )
}

/**
 * Documents for the active language.
 *
 * vi and en ship in the first bundle; de/fr/ko/ja are fetched on demand, so
 * until the chunk lands `buildLegalDocuments` falls back to Vietnamese. The
 * `ready` counter re-renders once the real content is in.
 */
function useLegalDocuments(language) {
  // Bumped once the on-demand chunk lands. It is the memo's second dependency
  // so the documents rebuild with the real content rather than the fallback —
  // calling hasLegalContent() inside the dependency array instead would read
  // a mutable module value during render.
  const [loadedCount, setLoadedCount] = useState(0)

  useEffect(() => {
    if (hasLegalContent(language)) return undefined
    let cancelled = false
    ensureLegalContent(language).then(() => {
      if (!cancelled) setLoadedCount((count) => count + 1)
    })
    return () => {
      cancelled = true
    }
  }, [language])

  return useMemo(() => buildLegalDocuments(language), [language, loadedCount])
}

function LegalDocumentPage() {
  const { slug } = useParams()
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language || AUTHORITATIVE_LANGUAGE
  const documents = useLegalDocuments(language)
  const document = documents.find((entry) => entry.slug === slug)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [slug])

  if (!document) return <Navigate to="/privacy" replace />

  return <LegalDocument document={document} documents={documents} />
}

function LegalDocument({ document, documents }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language || AUTHORITATIVE_LANGUAGE
  const Icon = ICONS[document.icon]

  // `document` arrives already merged for this language — headings, sections
  // and every block of prose come from legal/content/<lang>.js.
  useDocumentMeta(document, document, language)

  return (
    <div
      className="legal-page"
      style={{
        '--document-accent': document.accent,
        '--document-accent-soft': document.accentSoft,
      }}
    >
      <ScrollProgress color={document.accent} />
      <a className="legal-skip-link" href="#legal-document">{t('skipToContent')}</a>

      <MainSiteNav
        variant="standalone"
        usePillNav
        PillHeaderComponent={PillSiteHeader}
        drawerLinks={STANDALONE_DRAWER_LINKS}
        pillOverflowItems={PEOPLE_SUBMENU.items}
        homeHref="/"
        locale={language}
        LanguageControl={PageLanguageMenu}
      />

      <main id="legal-document">
        <header className="legal-hero">
          <div className="legal-hero__glow" aria-hidden="true" />
          <div className="legal-shell">
            <BlurFade inView={false}>
              <div className="legal-hero__meta">
                <span><Icon aria-hidden="true" /> {document.eyebrow}</span>
                <span>{t('hero.updated', { date: document.updated })}</span>
                {document.version && (
                  <span>{t('hero.version', { version: document.version })}</span>
                )}
              </div>
              <h1>{document.title}</h1>
              <p className="legal-hero__summary">{document.summary}</p>
            </BlurFade>

            <GooeyTabs
              documents={documents}
              activeSlug={document.slug}
              iconMap={ICONS}
              ariaLabel={t('tabs.aria')}
              labelFor={(entry) => entry.tabLabel}
            />
          </div>
        </header>

        <div className="legal-shell legal-layout">
          <aside className="legal-toc">
            <p>{t('toc.heading')}</p>
            <nav aria-label={t('toc.aria', { title: document.title })}>
              {document.sections.map((section, index) => (
                <a key={section.id} href={`#${section.id}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="legal-article" key={document.slug}>
            <div className="legal-article__body">
              {document.sections.map((section, index) => (
                <BlurFade key={section.id} delay={Math.min(index * 0.025, 0.12)} inView>
                  <SpotlightSection
                    id={section.id}
                    accent={document.accent}
                    className={section.featured ? 'is-featured' : ''}
                  >
                    <div className="legal-section__heading">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <h2>{section.title}</h2>
                    </div>
                    <div className="legal-section__body">
                      {section.blocks.map((block, blockIndex) => (
                        <Block key={`${section.id}-${block.type}-${blockIndex}`} block={block} />
                      ))}
                    </div>
                  </SpotlightSection>
                </BlurFade>
              ))}
            </div>

            <ContactCard contact={document.contact} accent={document.accent} t={t} />
            <p className="legal-updated">
              {t('article.lastUpdated')} <strong>{document.updated}</strong>
            </p>
          </article>
        </div>
      </main>

      <Footer linkMode="standalone" locale={language} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/legal">
      <Routes>
        <Route index element={<Navigate to="/privacy" replace />} />
        <Route path="/:slug" element={<LegalDocumentPage />} />
        <Route path="*" element={<Navigate to="/privacy" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
