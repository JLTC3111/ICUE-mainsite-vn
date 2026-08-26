import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AUTHORITATIVE_LANGUAGE,
  FAQ_CATEGORY_KEYS,
  getFaqCategories,
} from '../../shared/faq-content/index.js'

/**
 * Build gate for the FAQ corpus and its locale files.
 *
 * A missing translation here is invisible at runtime — i18next falls back and
 * the page still renders, just in the wrong language — so it has to fail the
 * build instead. Modelled on legal-app/scripts/verify-legal-content.mjs.
 */
const LOCALES = ['vi', 'en', 'de', 'fr', 'ko', 'ja']
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []

// --- the shared corpus ---------------------------------------------------
const source = getFaqCategories(AUTHORITATIVE_LANGUAGE)
const expectedCount = source.reduce((total, category) => total + category.entries.length, 0)

for (const locale of LOCALES) {
  const categories = getFaqCategories(locale)

  if (categories.length !== FAQ_CATEGORY_KEYS.length) {
    errors.push(`${locale}: expected ${FAQ_CATEGORY_KEYS.length} categories, got ${categories.length}`)
  }

  let count = 0
  for (const { key, label, entries } of categories) {
    if (!label) errors.push(`${locale}: category "${key}" has no label`)
    if (!Array.isArray(entries) || entries.length === 0) {
      errors.push(`${locale}: category "${key}" has no entries`)
      continue
    }
    count += entries.length
    for (const [index, entry] of entries.entries()) {
      if (!entry?.q?.trim()) errors.push(`${locale}: ${key}[${index}] has no question`)
      if (!entry?.a?.trim()) errors.push(`${locale}: ${key}[${index}] has no answer`)
    }
  }

  if (count !== expectedCount) {
    errors.push(`${locale}: expected ${expectedCount} question/answer pairs, got ${count}`)
  }
}

// Every locale must be genuinely translated, not a copy of the source.
for (const locale of LOCALES.filter((l) => l !== AUTHORITATIVE_LANGUAGE)) {
  const translated = getFaqCategories(locale)
  const identical = translated.filter(
    (category, index) => category.entries[0]?.a === source[index]?.entries[0]?.a,
  )
  if (identical.length) {
    errors.push(
      `${locale}: ${identical.length} categories still hold the Vietnamese answer ` +
        `(${identical.map((c) => c.key).join(', ')})`,
    )
  }
}

// --- the locale files ----------------------------------------------------
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
  // `_one` / `_other` plural suffixes legitimately differ between languages.
  const plural = (key) => /_one$|_other$/.test(key)
  const missing = baseKeys.filter((key) => !keys.includes(key) && !plural(key))
  const extra = keys.filter((key) => !baseKeys.includes(key) && !plural(key))
  if (missing.length) errors.push(`${locale}.json missing: ${missing.join(', ')}`)
  if (extra.length) errors.push(`${locale}.json has unknown keys: ${extra.join(', ')}`)
}

// --- the icons -----------------------------------------------------------
for (const key of FAQ_CATEGORY_KEYS) {
  const icon = path.join(appRoot, 'src/icons', `${key}.svg`)
  if (!fs.existsSync(icon)) errors.push(`missing category icon: src/icons/${key}.svg`)
}

if (errors.length) {
  console.error('FAQ content verification failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log(
  `FAQ content OK: ${FAQ_CATEGORY_KEYS.length} categories, ${expectedCount} pairs, ${LOCALES.length} locales.`,
)
