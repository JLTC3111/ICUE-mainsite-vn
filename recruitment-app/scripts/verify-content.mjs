import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTHORITATIVE_LANGUAGE, JOB_IDS, getJobs } from '../src/data/jobs.js'
import { BENEFIT_KEYS, GALLERY_KEYS } from '../src/data/contentKeys.js'

/**
 * Build gate for the postings and the locale files.
 *
 * A missing translation here is invisible at runtime — the job module falls
 * back to Vietnamese and the page still renders — so it has to fail the build
 * instead. Modelled on legal-app/scripts/verify-legal-content.mjs.
 */
const LOCALES = ['vi', 'en', 'de', 'fr', 'ko', 'ja']
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []

// --- postings ------------------------------------------------------------
const source = getJobs(AUTHORITATIVE_LANGUAGE)

for (const locale of LOCALES) {
  const jobs = getJobs(locale)

  if (jobs.length !== JOB_IDS.length) {
    errors.push(`${locale}: expected ${JOB_IDS.length} postings, got ${jobs.length}`)
  }

  for (const [index, job] of jobs.entries()) {
    for (const field of ['title', 'department', 'location', 'description']) {
      if (!job[field]?.trim()) errors.push(`${locale}: ${job.id} has no ${field}`)
    }
    if (!Array.isArray(job.tags) || job.tags.length === 0) {
      errors.push(`${locale}: ${job.id} has no tags`)
    }
    if (!job.meta?.employmentType) errors.push(`${job.id}: meta.employmentType is required`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(job.meta?.datePosted || '')) {
      errors.push(`${job.id}: meta.datePosted must be an ISO date`)
    }
    // A translation that still reads as the Vietnamese source is a missing one.
    if (locale !== AUTHORITATIVE_LANGUAGE && job.description === source[index]?.description) {
      errors.push(`${locale}: ${job.id} still holds the Vietnamese description`)
    }
  }
}

// --- locale files --------------------------------------------------------
function flatten(value, prefix = '', out = []) {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, next, out)
    else out.push(next)
  }
  return out
}

const read = (locale) =>
  JSON.parse(fs.readFileSync(path.join(appRoot, 'src/locales', `${locale}.json`), 'utf8'))

const baseKeys = flatten(read(AUTHORITATIVE_LANGUAGE)).sort()
for (const locale of LOCALES) {
  const json = read(locale)

  if (locale !== AUTHORITATIVE_LANGUAGE) {
    const keys = flatten(json).sort()
    // `_one` / `_other` plural suffixes legitimately differ between languages.
    const plural = (key) => /_one$|_other$/.test(key)
    const missing = baseKeys.filter((key) => !keys.includes(key) && !plural(key))
    const extra = keys.filter((key) => !baseKeys.includes(key) && !plural(key))
    if (missing.length) errors.push(`${locale}.json missing: ${missing.join(', ')}`)
    if (extra.length) errors.push(`${locale}.json has unknown keys: ${extra.join(', ')}`)
  }

  // Every key the components index dynamically, which the flat diff above
  // cannot catch on its own if it is missing from *every* locale.
  for (const key of BENEFIT_KEYS) {
    if (!json.benefits?.items?.[key]?.title) errors.push(`${locale}.json: benefits.items.${key}.title`)
    if (!json.benefits?.items?.[key]?.body) errors.push(`${locale}.json: benefits.items.${key}.body`)
  }
  for (const key of GALLERY_KEYS) {
    if (!json.gallery?.items?.[key]?.label) errors.push(`${locale}.json: gallery.items.${key}.label`)
    if (!json.gallery?.items?.[key]?.alt) errors.push(`${locale}.json: gallery.items.${key}.alt`)
  }
}

// --- assets --------------------------------------------------------------
for (const key of BENEFIT_KEYS) {
  const icon = path.join(appRoot, 'src/icons', `${key}.svg`)
  if (!fs.existsSync(icon)) errors.push(`missing benefit icon: src/icons/${key}.svg`)
}
for (const key of GALLERY_KEYS) {
  const icon = path.join(appRoot, 'src/icons', `gallery-${key}.svg`)
  if (!fs.existsSync(icon)) errors.push(`missing gallery icon: src/icons/gallery-${key}.svg`)
  // The photographs live here now, not in the site-wide public/ — if a build
  // ever deletes them again this is what catches it.
  const photo = path.join(appRoot, 'public/media', `${key}.webp`)
  if (!fs.existsSync(photo)) errors.push(`missing gallery photo: public/media/${key}.webp`)
}
if (!fs.existsSync(path.join(appRoot, 'src/icons/pin.svg'))) {
  errors.push('missing location icon: src/icons/pin.svg')
}

if (errors.length) {
  console.error('Recruitment content verification failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log(
  `Recruitment content OK: ${JOB_IDS.length} postings, ${BENEFIT_KEYS.length} benefits, ` +
    `${GALLERY_KEYS.length} photos, ${LOCALES.length} locales.`,
)
