import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTHORITATIVE_LANGUAGE, getJobs } from '../src/data/jobs.js'

/**
 * Writes the crawlable half of index.html: JobPosting structured data and the
 * no-JavaScript fallback, both built from the authored Vietnamese.
 *
 * The legacy page had neither — its route shell carried a generic `WebPage`
 * and its jobs container was an empty div with a "populated by JavaScript"
 * comment (src/pages/recruitment.html:404), so a crawler saw no postings at
 * all. Runs in `prebuild`, so this cannot drift from src/data/jobs.js.
 */
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const indexPath = path.join(appRoot, 'index.html')
const siteUrl = 'https://icue.vn'
const route = '/recruitment'

const jobs = getJobs(AUTHORITATIVE_LANGUAGE)

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`recruitment-app/index.html is missing ${label}`)
  return html.replace(pattern, replacement)
}

const organization = {
  '@type': 'Organization',
  name: 'ICUE Vietnam',
  sameAs: `${siteUrl}/`,
}

/* An array of JobPosting nodes rather than a single WebPage: each posting is
   its own entity as far as a job aggregator is concerned. */
const structuredData = jobs.map((job) => ({
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  '@id': `${siteUrl}${route}#job-${job.id}`,
  title: job.title,
  description: job.description,
  datePosted: job.meta.datePosted,
  employmentType: job.meta.employmentType,
  inLanguage: 'vi-VN',
  hiringOrganization: organization,
  jobLocation: {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: job.meta.locality,
      addressRegion: job.meta.region,
      addressCountry: job.meta.country,
    },
  },
  skills: job.tags.join(', '),
  url: `${siteUrl}${route}#job-${job.id}`,
}))

const noscript = `<noscript data-generated="jobs">
        <main>
          <p>ICUE VIETNAM</p>
          <h1>Tuyển dụng</h1>
          <p>Cơ hội nghề nghiệp tại ICUE Vietnam.</p>
          <h2>Các vị trí</h2>
          ${jobs
            .map(
              (job) => `<article>
            <h3>${escapeHtml(job.title)}</h3>
            <p>${escapeHtml(job.department)} — ${escapeHtml(job.location)}</p>
            <p>${escapeHtml(job.description)}</p>
            <p>${job.tags.map(escapeHtml).join(' · ')}</p>
          </article>`,
            )
            .join('\n          ')}
          <nav aria-label="Các trang chính">
            <a href="/">ICUE Vietnam</a>
            <a href="/contact">Liên hệ</a>
            <a href="/faqs">Câu hỏi thường gặp</a>
          </nav>
        </main>
      </noscript>`

let html = fs.readFileSync(indexPath, 'utf8')
html = replaceRequired(
  html,
  /<script type="application\/ld\+json" data-generated="jobs">[\s\S]*?<\/script>/,
  `<script type="application/ld+json" data-generated="jobs">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>`,
  'the structured-data placeholder',
)
html = replaceRequired(
  html,
  /<noscript data-generated="jobs">[\s\S]*?<\/noscript>/,
  noscript,
  'the no-JavaScript placeholder',
)
fs.writeFileSync(indexPath, html)

console.log(`Generated JobPosting data for ${jobs.length} open positions.`)
