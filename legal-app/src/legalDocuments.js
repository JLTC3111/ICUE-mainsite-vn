import { LEGAL_STRUCTURE } from './legal/structure.js'
import vi from './legal/content/vi.js'
import en from './legal/content/en.js'

/**
 * Legal documents, assembled per language.
 *
 * Structure and words are kept apart: ./legal/structure.js owns block types,
 * section ids, accents and hrefs; ./legal/content/<lang>.js owns every string.
 * They are matched by section id and block position, so adding a language means
 * writing prose only, and no translation can accidentally change the shape of a
 * document. `npm run verify:legal` asserts the six stay aligned.
 *
 * Vietnamese governs — Terms → Other terms says so explicitly, and the other
 * five are reference translations of it.
 */
const CONTENT = { vi, en }

/** de/fr/ko/ja are fetched on demand; vi and en cover the common entry paths. */
const LAZY_CONTENT = {
  de: () => import('./legal/content/de.js'),
  fr: () => import('./legal/content/fr.js'),
  ko: () => import('./legal/content/ko.js'),
  ja: () => import('./legal/content/ja.js'),
}

export const AUTHORITATIVE_LANGUAGE = 'vi'

function mergeDocument(structureDoc, contentDoc) {
  return {
    ...structureDoc,
    tabLabel: contentDoc.tabLabel,
    eyebrow: contentDoc.eyebrow,
    title: contentDoc.title,
    summary: contentDoc.summary,
    description: contentDoc.description,
    updated: contentDoc.updated,
    contact: contentDoc.contact,
    sections: structureDoc.sections.map((section) => {
      const sectionContent = contentDoc.sections[section.id] ?? { blocks: [] }
      return {
        ...section,
        title: sectionContent.title,
        blocks: section.blocks.map((block, index) => ({
          ...block,
          ...(sectionContent.blocks?.[index] ?? {}),
        })),
      }
    }),
  }
}

/** Build the four documents for a language, falling back to Vietnamese. */
export function buildLegalDocuments(language) {
  const content = CONTENT[language] ?? CONTENT[AUTHORITATIVE_LANGUAGE]
  return LEGAL_STRUCTURE.map((doc) => mergeDocument(doc, content[doc.slug]))
}

/** Pull in a lazily-shipped language, then make it available synchronously. */
export async function ensureLegalContent(language) {
  if (CONTENT[language] || !LAZY_CONTENT[language]) return
  const module = await LAZY_CONTENT[language]()
  CONTENT[language] = module.default
}

export function hasLegalContent(language) {
  return Boolean(CONTENT[language])
}

export { LEGAL_STRUCTURE }
