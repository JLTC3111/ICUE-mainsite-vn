import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGAL_DOCUMENTS } from '../src/legalDocuments.js'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = path.resolve(appRoot, '../legal')
const sourceIndex = path.join(outputRoot, 'index.html')
const siteUrl = 'https://icue.vn'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`Legal index is missing ${label}`)
  return html.replace(pattern, replacement)
}

function renderNoscript(document) {
  const links = LEGAL_DOCUMENTS.map(
    (item) =>
      `<a href="/legal/${escapeHtml(item.slug)}">${escapeHtml(item.tabLabel)}</a>`,
  ).join('\n            ')

  return `<noscript>
        <main>
          <p>ICUE VIETNAM · TRUNG TÂM PHÁP LÝ</p>
          <h1>${escapeHtml(document.title)}</h1>
          <p>${escapeHtml(document.summary)}</p>
          <p>Cập nhật lần cuối: ${escapeHtml(document.updated)}</p>
          <nav aria-label="Tài liệu pháp lý">
            ${links}
          </nav>
        </main>
      </noscript>`
}

function renderShell(baseHtml, document) {
  const route = `/legal/${document.slug}`
  const canonical = `${siteUrl}${route}`
  const title = `${document.title} | ICUE Vietnam`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    description: document.description,
    inLanguage: 'vi-VN',
    dateModified: '2025-08-18',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: 'ICUE Vietnam',
    },
  }

  let html = baseHtml
  html = replaceRequired(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`, 'title')
  html = replaceRequired(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(document.description)}" />`,
    'description',
  )
  html = replaceRequired(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`,
    'canonical link',
  )
  html = replaceRequired(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonical}" />`,
    'Open Graph URL',
  )
  html = replaceRequired(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    'Open Graph title',
  )
  html = replaceRequired(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(document.description)}" />`,
    'Open Graph description',
  )
  html = replaceRequired(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    'Twitter title',
  )
  html = replaceRequired(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(document.description)}" />`,
    'Twitter description',
  )
  html = replaceRequired(
    html,
    /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>`,
    'structured data',
  )
  html = replaceRequired(
    html,
    /<noscript>[\s\S]*?<\/noscript>/i,
    renderNoscript(document),
    'no-JavaScript fallback',
  )

  return html
}

if (!fs.existsSync(sourceIndex)) {
  throw new Error('legal/index.html is missing. Run the Vite build first.')
}

const baseHtml = fs.readFileSync(sourceIndex, 'utf8')
for (const document of LEGAL_DOCUMENTS) {
  const routeDirectory = path.join(outputRoot, document.slug)
  fs.rmSync(routeDirectory, { recursive: true, force: true })
  fs.mkdirSync(routeDirectory, { recursive: true })
  fs.writeFileSync(
    path.join(routeDirectory, 'index.html'),
    renderShell(baseHtml, document),
  )
}

console.log(`Generated ${LEGAL_DOCUMENTS.length} legal route shells.`)
