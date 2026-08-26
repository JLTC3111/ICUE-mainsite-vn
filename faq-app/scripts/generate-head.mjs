import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTHORITATIVE_LANGUAGE, getFaqCategories } from '../../shared/faq-content/index.js'

/**
 * Writes the crawlable half of index.html: FAQPage structured data and the
 * no-JavaScript fallback, both built from the authored Vietnamese.
 *
 * The legacy page had neither — its route shell carried a generic `WebPage`
 * and a noscript block with nothing in it but links. A page that is literally a
 * list of questions and answers should say so in the markup.
 *
 * Runs in `prebuild`, so the two can never drift from the content module.
 */
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const indexPath = path.join(appRoot, 'index.html')
const siteUrl = 'https://icue.vn'
const route = '/faqs'

const categories = getFaqCategories(AUTHORITATIVE_LANGUAGE)

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`faq-app/index.html is missing ${label}`)
  return html.replace(pattern, replacement)
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${siteUrl}${route}#webpage`,
  url: `${siteUrl}${route}`,
  name: 'Câu hỏi thường gặp | ICUE Vietnam',
  inLanguage: 'vi-VN',
  isPartOf: {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: `${siteUrl}/`,
    name: 'ICUE Vietnam',
  },
  mainEntity: categories.flatMap(({ entries }) =>
    entries.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  ),
}

const noscript = `<noscript data-generated="faq">
        <main>
          <p>ICUE VIETNAM</p>
          <h1>Câu hỏi thường gặp</h1>
          ${categories
            .map(
              ({ label, entries }) => `<section>
            <h2>${escapeHtml(label)}</h2>
            ${entries
              .map(
                ({ q, a }) =>
                  `<h3>${escapeHtml(q)}</h3>\n            <p>${escapeHtml(a)}</p>`,
              )
              .join('\n            ')}
          </section>`,
            )
            .join('\n          ')}
          <nav aria-label="Các trang chính">
            <a href="/">ICUE Vietnam</a>
            <a href="/contact">Liên hệ</a>
            <a href="/recruitment">Tuyển dụng</a>
          </nav>
        </main>
      </noscript>`

let html = fs.readFileSync(indexPath, 'utf8')
html = replaceRequired(
  html,
  /<script type="application\/ld\+json" data-generated="faq">[\s\S]*?<\/script>/,
  `<script type="application/ld+json" data-generated="faq">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>`,
  'the structured-data placeholder',
)
html = replaceRequired(
  html,
  /<noscript data-generated="faq">[\s\S]*?<\/noscript>/,
  noscript,
  'the no-JavaScript placeholder',
)
fs.writeFileSync(indexPath, html)

console.log(`Generated FAQPage data for ${structuredData.mainEntity.length} questions.`)
