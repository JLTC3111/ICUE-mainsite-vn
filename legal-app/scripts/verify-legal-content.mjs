/**
 * Assert the six legal translations stay structurally identical.
 *
 * The renderer matches content to ../src/legal/structure.js by section id and
 * block position, so a translation that drops a list item, renames a section id
 * or reorders blocks does not crash — it silently renders a half-empty
 * document. This catches that at build time instead.
 *
 *   node scripts/verify-legal-content.mjs
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGAL_STRUCTURE } from '../src/legal/structure.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LANGUAGES = ['vi', 'en', 'de', 'fr', 'ko', 'ja']

/** Block keys that carry prose and must be present in every language. */
const TEXT_KEYS = ['text', 'intro', 'label', 'headers', 'rows', 'items']

const failures = []

const content = {}
for (const lang of LANGUAGES) {
  const module = await import(`../src/legal/content/${lang}.js`)
  content[lang] = module.default
}

/** Describe the shape of a value without looking at the words inside it. */
function shapeOf(value) {
  if (Array.isArray(value)) return `[${value.map(shapeOf).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${k}:${shapeOf(value[k])}`).join(',')}}`
  }
  return typeof value
}

const reference = content.vi

for (const doc of LEGAL_STRUCTURE) {
  for (const lang of LANGUAGES) {
    const docContent = content[lang]?.[doc.slug]
    if (!docContent) {
      failures.push(`${lang}: missing document "${doc.slug}"`)
      continue
    }

    for (const key of ['tabLabel', 'eyebrow', 'title', 'summary', 'description', 'updated']) {
      if (!docContent[key]) failures.push(`${lang}/${doc.slug}: missing ${key}`)
    }
    if (!docContent.contact?.title || !docContent.contact?.response) {
      failures.push(`${lang}/${doc.slug}: incomplete contact block`)
    }

    for (const section of doc.sections) {
      const sectionContent = docContent.sections?.[section.id]
      if (!sectionContent) {
        failures.push(`${lang}/${doc.slug}: missing section "${section.id}"`)
        continue
      }
      if (!sectionContent.title) {
        failures.push(`${lang}/${doc.slug}/${section.id}: missing section title`)
      }

      const blocks = sectionContent.blocks ?? []
      if (blocks.length !== section.blocks.length) {
        failures.push(
          `${lang}/${doc.slug}/${section.id}: ${blocks.length} content blocks for ` +
          `${section.blocks.length} structural blocks`,
        )
        continue
      }

      // Compare each block's shape against Vietnamese: same keys, and for the
      // nested ones (list items, table rows, cards) the same cardinality.
      const referenceBlocks = reference[doc.slug].sections[section.id].blocks
      blocks.forEach((block, index) => {
        const refBlock = referenceBlocks[index]
        for (const key of TEXT_KEYS) {
          const hasRef = refBlock[key] !== undefined
          const has = block[key] !== undefined
          if (hasRef && !has) {
            failures.push(`${lang}/${doc.slug}/${section.id}[${index}]: missing "${key}"`)
          } else if (!hasRef && has) {
            failures.push(`${lang}/${doc.slug}/${section.id}[${index}]: unexpected "${key}"`)
          } else if (hasRef && has && shapeOf(refBlock[key]) !== shapeOf(block[key])) {
            failures.push(
              `${lang}/${doc.slug}/${section.id}[${index}]."${key}": shape differs from vi\n` +
              `      vi: ${shapeOf(refBlock[key])}\n` +
              `      ${lang}: ${shapeOf(block[key])}`,
            )
          }
        }
      })
    }
  }
}

if (failures.length) {
  console.error('Legal content audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

const strings = LANGUAGES.length * JSON.stringify(reference).match(/"/g).length
console.log(
  `Legal content audit passed: ${LEGAL_STRUCTURE.length} documents x ` +
  `${LANGUAGES.length} languages, structurally identical.`,
)
