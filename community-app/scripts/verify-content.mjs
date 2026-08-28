import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTHORITATIVE_LANGUAGE, PROGRAMME_IDS, getProgrammes } from '../src/data/programmes.js'

/**
 * Build gate for the programmes, their captions and their photographs.
 *
 * The failures this catches are all invisible at runtime — i18next falls back,
 * a missing caption renders as an empty string, a missing rendition shows a
 * broken frame — so they have to stop the build instead. Modelled on
 * faq-app/scripts/verify-content.mjs.
 */
const LOCALES = ['vi', 'en', 'de', 'fr', 'ko', 'ja']
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []

const source = getProgrammes(AUTHORITATIVE_LANGUAGE)

// --- programmes ----------------------------------------------------------
for (const locale of LOCALES) {
  const programmes = getProgrammes(locale)

  if (programmes.length !== PROGRAMME_IDS.length) {
    errors.push(`${locale}: expected ${PROGRAMME_IDS.length} programmes, got ${programmes.length}`)
  }

  for (const [index, programme] of programmes.entries()) {
    for (const field of ['kicker', 'name']) {
      if (!programme[field]?.trim()) errors.push(`${locale}: ${programme.id} has no ${field}`)
    }

    // A programme with prose must carry all of it; the archive section has none
    // by design, so summary/body/place are only required where the source has them.
    for (const field of ['place', 'summary']) {
      if (source[index][field] && !programme[field]?.trim()) {
        errors.push(`${locale}: ${programme.id} is missing ${field}`)
      }
    }
    if (source[index].body && (programme.body?.length ?? 0) !== source[index].body.length) {
      errors.push(`${locale}: ${programme.id} body has ${programme.body?.length ?? 0} paragraphs, source has ${source[index].body.length}`)
    }

    for (const id of programme.meta.photos) {
      if (!programme.captions?.[id]?.trim()) {
        errors.push(`${locale}: ${programme.id} has no caption for photograph "${id}"`)
      }
    }

    if (locale !== AUTHORITATIVE_LANGUAGE && programme.name === source[index].name) {
      errors.push(`${locale}: ${programme.id} still holds the Vietnamese name`)
    }
    if (programme.meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(programme.meta.date)) {
      errors.push(`${programme.id}: meta.date must be an ISO date when present`)
    }
  }
}

// --- photographs ---------------------------------------------------------
const media = path.join(appRoot, 'public/media')
const referenced = new Set(source.flatMap((p) => p.meta.photos))
for (const id of referenced) {
  for (const width of [400, 800, 1600]) {
    const file = path.join(media, `${id}-${width}.webp`)
    if (!fs.existsSync(file)) errors.push(`missing rendition: public/media/${id}-${width}.webp`)
  }
}
const onDisk = fs.existsSync(media)
  ? new Set(fs.readdirSync(media).filter((f) => f.endsWith('-400.webp')).map((f) => f.replace('-400.webp', '')))
  : new Set()
for (const id of onDisk) {
  if (!referenced.has(id)) errors.push(`orphan photograph, nothing references it: public/media/${id}-*.webp`)
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
for (const locale of LOCALES.filter((l) => l !== AUTHORITATIVE_LANGUAGE)) {
  const keys = flatten(read(locale)).sort()
  const plural = (key) => /_one$|_other$/.test(key)
  const missing = baseKeys.filter((k) => !keys.includes(k) && !plural(k))
  const extra = keys.filter((k) => !baseKeys.includes(k) && !plural(k))
  if (missing.length) errors.push(`${locale}.json missing: ${missing.join(', ')}`)
  if (extra.length) errors.push(`${locale}.json has unknown keys: ${extra.join(', ')}`)
}

// --- placeholders --------------------------------------------------------
/* Nothing carrying a review marker may ship. The page makes factual claims
   about charitable work, so a placeholder reaching production is the one
   failure mode worth blocking the build over. */
const dataFile = fs.readFileSync(path.join(appRoot, 'src/data/programmes.js'), 'utf8')
const markers = dataFile.split('\n').reduce((n, line, i) => {
  if (/TODO\(review\)/.test(line) && !line.trim().startsWith('*')) {
    errors.push(`src/data/programmes.js:${i + 1} still carries a TODO(review) marker`)
    return n + 1
  }
  return n
}, 0)

if (errors.length) {
  console.error('Community content verification failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

const photos = source.reduce((n, p) => n + p.meta.photos.length, 0)
console.log(
  `Community content OK: ${PROGRAMME_IDS.length} programmes, ${photos} photographs x 3 renditions, ${LOCALES.length} locales${markers ? `, ${markers} markers` : ''}.`,
)
