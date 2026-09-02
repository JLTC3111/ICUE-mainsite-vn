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

/**
 * Variable commercial/legal claims stay visible on the FAQ page for editorial
 * review, but are not served as chatbot answers. The cautious intent responses
 * route the reader to ICUE for project-specific confirmation instead.
 */
export const FAQ_REVIEW_FLAGS = {
  'services.2': { owner: 'Services', status: 'needs-review', chatbotEligible: false, flaggedAt: '2026-09-01', reason: 'Scope varies by project type and location.' },
  'costs.1': { owner: 'Commercial', status: 'needs-review', chatbotEligible: false, flaggedAt: '2026-09-01', reason: 'Fee methods require current commercial approval.' },
  'costs.2': { owner: 'Commercial', status: 'needs-review', chatbotEligible: false, flaggedAt: '2026-09-01', reason: 'Payment terms must be confirmed per proposal or contract.' },
  'legal.1': { owner: 'Legal', status: 'needs-review', chatbotEligible: false, flaggedAt: '2026-09-01', reason: 'Permit support depends on jurisdiction and agreed scope.' },
  'legal.2': { owner: 'Legal', status: 'needs-review', chatbotEligible: false, flaggedAt: '2026-09-01', reason: 'English and Vietnamese land-rights wording differs.' },
  'timeline.1': { owner: 'Delivery', status: 'needs-review', chatbotEligible: false, flaggedAt: '2026-09-01', reason: 'Fixed duration ranges may not apply to every project.' },
  'timeline.2': { owner: 'Delivery', status: 'needs-review', chatbotEligible: false, flaggedAt: '2026-09-01', reason: 'Recovery commitments require project-specific approval.' },
  'clients.2': { owner: 'Services', status: 'needs-review', chatbotEligible: false, flaggedAt: '2026-09-01', reason: 'Post-handover maintenance is not necessarily included.' },
  'general.2': { owner: 'Operations', status: 'needs-review', chatbotEligible: false, flaggedAt: '2026-09-01', reason: 'The 24-hour response promise is an operational SLA.' },
}

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
    entries.map((entry, index) => {
      const id = `${key}.${index + 1}`
      return { id, category: key, ...entry, review: FAQ_REVIEW_FLAGS[id] || null }
    }),
  )
}
