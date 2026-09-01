import { getFaqEntries, isSupportedFaqLanguage } from '../../faq-content/index.js'
import {
  findQuickTopic,
  isAmbiguousIntentMatch,
  normalizeForSearch,
  rankFaqEntries,
  rankIntents,
  tokenize,
} from './matching.js'

export { normalizeForSearch, scoreTokens, tokenize } from './matching.js'

/**
 * The chatbot's retrieval engine, originally ported from
 * `createChatbotKnowledge()` in src/script.js:4210-4535.
 *
 * It is a lexical scorer, not a model: every answer comes from an authored
 * intent in public/chatbot/kb.<lang>.json or from the FAQ corpus. The shared
 * implementation also:
 *
 *  - the FAQ corpus is imported rather than read off a `window.__icueFaqData`
 *    global the legacy runtime published;
 *  - the knowledge base is fetched relative to the app's base URL;
 *  - searches and localizes the FAQ corpus across all six site locales;
 *  - asks for clarification when two authored intents are effectively tied;
 *  - emits match metadata without retaining or transmitting visitor text.
 */

/** A single generic word in a long query must not be enough to route it. */
export const INTENT_THRESHOLD = 0.52
/** FAQ match must reach this, and beat the intent, to be preferred. */
export const FAQ_THRESHOLD = 0.58

/** Every language exposed by the site has a complete authored intent database. */
export const KB_LANGUAGES = ['vi', 'en', 'de', 'fr', 'ko', 'ja']

export function detectUserLanguage(text) {
  const raw = String(text || '')
  if (/[가-힯]/.test(raw)) return 'ko'
  if (/[぀-ヿ]/.test(raw)) return 'ja'

  // Latin-script languages are distinguished by common query words. This also
  // handles Vietnamese typed without diacritics and avoids treating French
  // accents such as é/à as proof that a message is Vietnamese.
  const tokens = normalizeForSearch(raw).split(' ').filter(Boolean)
  if (!tokens.length) return null

  const hintSets = {
    vi: new Set([
      'xin', 'chao', 'dich', 'vu', 'lien', 'he', 'tuyen', 'dung', 'du', 'an',
      'bao', 'gia', 'chi', 'phi', 'thoi', 'gian', 'quy', 'trinh', 'hop', 'tac',
    ]),
    en: new Set([
      'hello', 'what', 'how', 'where', 'when', 'services', 'service', 'projects',
      'project', 'recruitment', 'privacy', 'pricing', 'proposal', 'meeting',
      'internship', 'partner', 'press',
    ]),
    de: new Set([
      'hallo', 'danke', 'welche', 'was', 'wie', 'wo', 'leistungen', 'beratung',
      'kosten', 'honorar', 'projekt', 'karriere', 'datenschutz', 'termin',
    ]),
    fr: new Set([
      'bonjour', 'merci', 'quelles', 'comment', 'ou', 'prestations', 'conseil',
      'cout', 'honoraires', 'projet', 'recrutement', 'confidentialite', 'rendez',
    ]),
  }

  const ranked = Object.entries(hintSets)
    .map(([language, hints]) => ({
      language,
      score: tokens.reduce((total, token) => total + Number(hints.has(token)), 0),
    }))
    .sort((left, right) => right.score - left.score)

  if (ranked[0].score >= 1 && ranked[0].score > ranked[1].score) {
    return ranked[0].language
  }
  return null
}

/**
 * Returns a language tag when the message is clearly outside the six authored
 * languages, so the caller can say so rather than answering badly.
 */
export function detectUnsupportedLanguage(text) {
  const raw = String(text || '')

  // Script-based detection (high confidence).
  if (/[぀-ヿ]/.test(raw) || /[가-힯]/.test(raw)) return null
  // Han-only text is ambiguous between Chinese and Japanese, so do not reject
  // it before the Japanese intent scorer has a chance to evaluate it.
  if (/[一-鿿]/.test(raw)) return null
  if (/[฀-๿]/.test(raw)) return 'th'
  if (/[Ѐ-ӿ]/.test(raw)) return 'ru'
  if (/[؀-ۿ]/.test(raw)) return 'ar'
  if (/[֐-׿]/.test(raw)) return 'he'

  // Latin-script heuristics for common unsupported languages.
  const tokens = normalizeForSearch(raw).split(' ').filter(Boolean)
  if (!tokens.length) return null

  const hintSets = {
    es: new Set(['hola', 'gracias', 'por', 'favor', 'buenos', 'dias', 'buenas', 'noches', 'donde', 'precio', 'contacto', 'ayuda', 'necesito', 'quiero']),
  }

  const counts = { es: 0 }
  for (const t of tokens) {
    for (const [lang, hints] of Object.entries(hintSets)) {
      if (hints.has(t)) counts[lang]++
    }
  }

  const max = Math.max(...Object.values(counts))
  if (max >= 2) {
    return Object.keys(counts).find((lang) => counts[lang] === max)
  }
  return null
}

function fallbackKb(language, fallbackAnswer) {
  return {
    version: 2,
    language,
    intents: [],
    fallback: { answer: fallbackAnswer || '' },
  }
}

/** Precomputes the normalized/tokenized candidate strings once per load. */
function prepareKb(kb, language, fallbackAnswer) {
  const safe = {
    version: kb?.version || 2,
    language: kb?.language || language,
    intents: Array.isArray(kb?.intents) ? kb.intents : [],
    fallback: kb?.fallback || fallbackKb(language, fallbackAnswer).fallback,
  }

  safe.intents = safe.intents
    .filter((it) => it && typeof it.answer === 'string')
    .map((it) => {
      const keywords = Array.isArray(it.keywords) ? it.keywords.filter(Boolean) : []
      const phrases = Array.isArray(it.phrases) ? it.phrases.filter(Boolean) : []
      const ambiguousKeywords = Array.isArray(it.ambiguousKeywords)
        ? it.ambiguousKeywords.filter(Boolean)
        : []
      const links = Array.isArray(it.links) ? it.links.filter((l) => l && l.label && l.url) : []
      const candidates = [...keywords, ...phrases, ...ambiguousKeywords]
        .map((s) => normalizeForSearch(String(s)))
        .filter(Boolean)
      return {
        id: it.id || 'intent',
        label: String(it.label || it.id || 'intent'),
        answer: String(it.answer),
        links,
        candidates,
        candidateTokens: candidates.map((candidate) => tokenize(candidate, language)),
      }
    })

  return safe
}

function findBestIntents(kb, queryNorm, queryTokens) {
  return rankIntents(kb.intents || [], queryNorm, queryTokens)
}

/**
 * Search the authored FAQ corpus.
 *
 * The legacy version read `window.__icueFaqData`, which the FAQ page published
 * as Vietnamese only, and refused to answer at all when the reader's language
 * differed (src/script.js:4510-4515). The corpus is now translated into all six
 * locales, so this looks the question up in the reader's own language and only
 * falls back when that language has no corpus.
 */
function findBestFaq(queryNorm, queryTokens, language) {
  const corpusLanguage = isSupportedFaqLanguage(language) ? language : 'en'
  const eligibleEntries = getFaqEntries(corpusLanguage)
    .filter((entry) => entry.review?.chatbotEligible !== false)
  return rankFaqEntries(eligibleEntries, queryNorm, queryTokens, corpusLanguage)[0] || null
}

function localizeFaqMatch(match, language) {
  if (!match) return null
  const displayLanguage = isSupportedFaqLanguage(language) ? language : 'en'
  const localized = getFaqEntries(displayLanguage).find((entry) => entry.id === match.id)
  return localized ? { ...match, ...localized, score: match.score } : match
}

function formatClarification(template, first, second) {
  return String(template || '')
    .replace('{first}', first)
    .replace('{second}', second)
}

/**
 * @param {object} options
 * @param {string} options.siteLang     the reader's current UI language
 * @param {string} options.baseUrl      import.meta.env.BASE_URL of the host app
 * @param {(lang: string) => object} options.copy  UI strings for bot-authored replies
 */
export function createChatbotKnowledge({ siteLang = 'vi', baseUrl = '/', copy }) {
  const cache = Object.create(null)
  const loading = Object.create(null)

  /*
   * Resolved against the app's own base rather than the absolute
   * `/public/chatbot/…` the legacy runtime used: that path only worked in
   * production, where a _redirects rule rewrote /public/*, and it was fetched
   * with `cache: 'no-store'` so every mount paid for it again.
   */
  const kbUrl = (language) => `${baseUrl.replace(/\/$/, '')}/chatbot/kb.${language}.json`

  async function loadKb(language) {
    const res = await fetch(kbUrl(language))
    if (!res.ok) throw new Error(`KB fetch failed: ${res.status}`)
    const kb = await res.json()
    if (!kb || !Array.isArray(kb.intents)) throw new Error('KB invalid shape')
    return kb
  }

  function ensureKb(language) {
    const safeLang = KB_LANGUAGES.includes(language) ? language : 'en'
    if (cache[safeLang]) return Promise.resolve(cache[safeLang])
    if (!loading[safeLang]) {
      loading[safeLang] = loadKb(safeLang)
        .catch(() => fallbackKb(safeLang, copy(safeLang).fallback))
        .then((kb) => {
          cache[safeLang] = prepareKb(kb, safeLang, copy(safeLang).fallback)
          return cache[safeLang]
        })
    }
    return loading[safeLang]
  }

  /** The language the *bot* should answer in — one of KB_LANGUAGES. */
  const botLanguage = KB_LANGUAGES.includes(siteLang) ? siteLang : 'en'

  async function routeLanguage(raw, queryNorm) {
    const direct = detectUserLanguage(raw)
    if (direct) return direct

    // Detection was inconclusive: compare all six authored databases and only
    // move away from the active site language when one is a clear winner.
    const rankedLanguages = await Promise.all(KB_LANGUAGES.map(async (language) => {
      const kb = await ensureKb(language)
      const score = findBestIntents(
        kb,
        queryNorm,
        tokenize(queryNorm, language),
      )[0]?.score ?? 0
      return { language, score }
    }))
    rankedLanguages.sort((left, right) => right.score - left.score)

    if (
      rankedLanguages[0].score >= INTENT_THRESHOLD &&
      rankedLanguages[0].score - rankedLanguages[1].score >= 0.05
    ) {
      return rankedLanguages[0].language
    }
    return botLanguage
  }

  async function getResponse(userMessage) {
    const raw = String(userMessage || '').trim()
    if (!raw) {
      const kb = await ensureKb(botLanguage)
      return { content: kb.fallback?.answer || '', links: [], meta: { source: 'fallback' } }
    }

    const queryNorm = normalizeForSearch(raw)
    const directLanguage = detectUserLanguage(raw)
    const unsupported = detectUnsupportedLanguage(raw)
    const uiStrings = copy(botLanguage)
    const quickTopic = findQuickTopic(uiStrings.quickTopics, raw)

    if (quickTopic) {
      const topicLinks = (quickTopic.links || []).map((target) =>
        target === 'contact'
          ? { label: uiStrings.contact, url: uiStrings.contactUrl }
          : { label: uiStrings.faqs, url: uiStrings.faqsUrl },
      )
      return {
        content: quickTopic.answer,
        links: topicLinks,
        meta: { source: 'quick_topic', topic: quickTopic.id },
      }
    }

    if (unsupported) {
      return {
        content: uiStrings.unsupported,
        links: [],
        meta: { source: 'unsupported', language: unsupported },
      }
    }

    const detectedLang = directLanguage || await routeLanguage(raw, queryNorm)
    const queryTokens = tokenize(queryNorm, detectedLang)
    const kb = await ensureKb(detectedLang)
    const strings = copy(detectedLang)
    const matchedFaq = findBestFaq(queryNorm, queryTokens, detectedLang)
    const localizedFaq = localizeFaqMatch(matchedFaq, detectedLang)

    const rankedIntents = findBestIntents(kb, queryNorm, queryTokens)
    const bestIntent = rankedIntents[0] || null
    const secondIntent = rankedIntents[1] || null

    const intentScore = bestIntent?.score ?? 0
    const faqScore = matchedFaq?.score ?? 0

    if (faqScore >= FAQ_THRESHOLD && faqScore >= intentScore && localizedFaq) {
      return {
        content: String(localizedFaq.a),
        links: [{ label: strings.viewFaqs, url: strings.faqsUrl }],
        meta: {
          source: 'faq',
          faqId: localizedFaq.id,
          category: localizedFaq.category,
          score: faqScore,
        },
      }
    }

    if (isAmbiguousIntentMatch(bestIntent, secondIntent, INTENT_THRESHOLD)) {
      return {
        content: formatClarification(
          strings.clarification,
          bestIntent.intent.label,
          secondIntent.intent.label,
        ),
        links: [],
        meta: {
          source: 'clarification',
          intentIds: [bestIntent.intent.id, secondIntent.intent.id],
          score: bestIntent.score,
        },
      }
    }

    if (intentScore >= INTENT_THRESHOLD) {
      return {
        content: bestIntent.intent.answer,
        links: bestIntent.intent.links || [],
        meta: { source: 'intent', intentId: bestIntent.intent.id, score: intentScore },
      }
    }

    return {
      content: kb.fallback?.answer || strings.fallback,
      links: [
        { label: strings.faqs, url: strings.faqsUrl },
        { label: strings.contact, url: strings.contactUrl },
      ],
      meta: { source: 'fallback', score: Math.max(intentScore, faqScore) },
    }
  }

  // Warm every locale without blocking first paint.
  for (const language of KB_LANGUAGES) void ensureKb(language).catch(() => {})

  return { siteLang, botLanguage, ensureKb, getResponse }
}
