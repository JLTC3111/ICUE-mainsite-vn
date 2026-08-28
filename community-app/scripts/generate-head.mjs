import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTHORITATIVE_LANGUAGE, getProgrammes } from '../src/data/programmes.js'

/**
 * Writes the crawlable half of index.html from the authored Vietnamese.
 *
 * The legacy page offered a crawler a generic `WebPage` shell and a noscript
 * block containing nothing but links — no programme, no date, no place, and no
 * alt text on any of its thirteen photographs. Runs in `prebuild`, so this
 * cannot drift from programmes.js.
 */
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const indexPath = path.join(appRoot, 'index.html')
const siteUrl = 'https://icue.vn'
const route = '/community-activities'

const programmes = getProgrammes(AUTHORITATIVE_LANGUAGE)

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`community-app/index.html is missing ${label}`)
  return html.replace(pattern, replacement)
}

/*
 * CreativeWork rather than Event: an Event needs a startDate, and the Bảo Yên
 * banner carries no date. Emitting one would mean inventing it.
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${siteUrl}${route}#webpage`,
  url: `${siteUrl}${route}`,
  name: 'Hoạt động cộng đồng | ICUE Vietnam',
  inLanguage: 'vi-VN',
  isPartOf: {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: `${siteUrl}/`,
    name: 'ICUE Vietnam',
  },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: programmes.length,
    itemListElement: programmes.map((programme, index) => {
      const item = {
        '@type': 'CreativeWork',
        '@id': `${siteUrl}${route}#${programme.id}`,
        name: programme.name,
      }
      if (programme.summary) item.description = programme.summary
      if (programme.meta.date) item.dateCreated = programme.meta.date
      if (programme.meta.region) {
        item.contentLocation = {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: programme.meta.locality,
            addressRegion: programme.meta.region,
            addressCountry: programme.meta.country,
          },
        }
      }
      return { '@type': 'ListItem', position: index + 1, item }
    }),
  },
}

const noscript = `<noscript data-generated="community">
        <main>
          <p>ICUE VIETNAM</p>
          <h1>Hoạt động cộng đồng</h1>
          ${programmes
            .map(
              (programme) => `<section>
            <h2>${escapeHtml(programme.name)}</h2>
            ${[programme.meta.date, programme.place].filter(Boolean).map(escapeHtml).join(' — ') ? `<p>${[programme.meta.date, programme.place].filter(Boolean).map(escapeHtml).join(' — ')}</p>` : ''}
            ${(programme.body || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('\n            ')}
            <ul>
              ${programme.meta.photos.map((id) => `<li>${escapeHtml(programme.captions[id])}</li>`).join('\n              ')}
            </ul>
          </section>`,
            )
            .join('\n          ')}
          <p>Ảnh bởi ICUE Team</p>
          <nav aria-label="Các trang chính">
            <a href="/">ICUE Vietnam</a>
            <a href="/about-us">Về ICUE Vietnam</a>
            <a href="/contact">Liên hệ</a>
          </nav>
        </main>
      </noscript>`

let html = fs.readFileSync(indexPath, 'utf8')
html = replaceRequired(
  html,
  /<script type="application\/ld\+json" data-generated="community">[\s\S]*?<\/script>/,
  `<script type="application/ld+json" data-generated="community">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>`,
  'the structured-data placeholder',
)
html = replaceRequired(
  html,
  /<noscript data-generated="community">[\s\S]*?<\/noscript>/,
  noscript,
  'the no-JavaScript placeholder',
)
fs.writeFileSync(indexPath, html)

const photos = programmes.reduce((n, p) => n + p.meta.photos.length, 0)
console.log(`Generated CollectionPage data: ${programmes.length} programmes, ${photos} captioned photographs.`)
