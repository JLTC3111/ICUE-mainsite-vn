/**
 * The authored FAQ corpus, shared by the FAQ page and the chatbot.
 *
 * This lives in shared/ rather than inside faq-app for one reason: the chatbot
 * answers FAQ questions too, and it used to do that by reading a
 * `window.__icueFaqData` global that the legacy runtime published (see
 * src/script.js:3001). Two copies of the same answers drifted apart with
 * nothing to catch it. Both consumers now import this module, so an answer is
 * written once.
 *
 * Vietnamese is the authored language. The other five are hand-written
 * translations — never machine-translated, the same rule the newsroom captions
 * and the legal documents follow.
 */
import vi from './content/vi.js'
import en from './content/en.js'
import de from './content/de.js'
import fr from './content/fr.js'
import ko from './content/ko.js'
import ja from './content/ja.js'

const CONTENT = { vi, en, de, fr, ko, ja }

export const AUTHORITATIVE_LANGUAGE = 'vi'

/**
 * Display order of the eight category cards. The legacy page hardcoded this
 * order in markup (src/pages/FAQs.html:249-330); it is content, so it lives
 * with the content. Icons are looked up by the same key in
 * faq-app/src/icons/<key>.svg.
 */
export const FAQ_CATEGORY_KEYS = [
  'services',
  'process',
  'costs',
  'legal',
  'timeline',
  'technology',
  'clients',
  'general',
]

export function isSupportedFaqLanguage(language) {
  return Object.prototype.hasOwnProperty.call(CONTENT, language)
}

/** Falls back to the authored Vietnamese rather than returning nothing. */
export function getFaqContent(language) {
  return CONTENT[language] || CONTENT[AUTHORITATIVE_LANGUAGE]
}

/**
 * `[{ key, label, entries: [{ q, a }] }]` in display order — what the page
 * renders and what the chatbot searches.
 */
export function getFaqCategories(language) {
  const content = getFaqContent(language)
  return FAQ_CATEGORY_KEYS.map((key) => ({
    key,
    label: content.labels[key],
    entries: content.entries[key],
  }))
}

/** Flat `[{ category, q, a }]`, the shape the chatbot's scorer wants. */
export function getFaqEntries(language) {
  return getFaqCategories(language).flatMap(({ key, entries }) =>
    entries.map((entry) => ({ category: key, ...entry })),
  )
}
