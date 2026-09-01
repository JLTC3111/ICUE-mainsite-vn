import { getFaqEntries, isSupportedFaqLanguage } from '@icue/faq-content'
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

/** The two languages the authored knowledge base covers. */
export const KB_LANGUAGES = ['vi', 'en']

export function detectUserLanguage(text) {
  const raw = String(text || '')
  const hasVietnameseDiacritics =
    /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(raw)
  if (hasVietnameseDiacritics) return 'vi'

  // Vietnamese typed WITHOUT diacritics is common ("xin chao", "dich vu").
  const tokens = normalizeForSearch(raw).split(' ').filter(Boolean)

  const viHints = new Set([
    'xin', 'chao', 'camon', 'cam', 'on', 'dich', 'vu', 'lien', 'he', 'tuyen',
    'dung', 'ung', 'du', 'an', 'bao', 'gia', 'chi', 'phi', 'thoi', 'gian',
    'quy', 'trinh', 'hop', 'tac', 'doi', 'truyen', 'thong',
  ])
  const enHints = new Set([
    'what', 'how', 'where', 'when', 'services', 'service', 'projects',
    'project', 'contact', 'recruitment', 'privacy', 'terms', 'cookies', 'gdpr',
    'price', 'pricing', 'quote', 'proposal', 'meeting', 'schedule',
    'internship', 'partner', 'press',
  ])

  let viScore = 0
  let enScore = 0
  for (const t of tokens) {
    if (viHints.has(t)) viScore++
    if (enHints.has(t)) enScore++
  }

  if (viScore >= 2 && viScore > enScore) return 'vi'
  if (enScore >= 1 && enScore > viScore) return 'en'
  return null
}

/**
 * Returns a language tag when the message is clearly in something the knowledge
 * base does not cover, so the caller can say so rather than answering badly.
 *
 * The four UI locales the site now supports but the KB does not — de, fr, ko,
 * ja — are deliberately still reported here. The reply tells the reader which
 * languages the bot itself handles; it does not change the page language.
 */
export function detectUnsupportedLanguage(text) {
  const raw = String(text || '')

  // Script-based detection (high confidence).
  if (/[぀-ヿ]/.test(raw)) return 'ja'
  if (/[一-鿿]/.test(raw)) return 'zh'
  if (/[가-힯]/.test(raw)) return 'ko'
  if (/[฀-๿]/.test(raw)) return 'th'
  if (/[Ѐ-ӿ]/.test(raw)) return 'ru'
  if (/[؀-ۿ]/.test(raw)) return 'ar'
  if (/[֐-׿]/.test(raw)) return 'he'

  // Latin-script heuristics for common unsupported languages.
  const tokens = normalizeForSearch(raw).split(' ').filter(Boolean)
  if (!tokens.length) return null

  const hintSets = {
    es: new Set(['hola', 'gracias', 'por', 'favor', 'buenos', 'dias', 'buenas', 'noches', 'donde', 'precio', 'contacto', 'ayuda', 'necesito', 'quiero']),
    fr: new Set(['bonjour', 'merci', 'svp', 'silvousplait', 'ou', 'prix', 'contact', 'aide', 'besoin', 'je', 'veux']),
    de: new Set(['hallo', 'danke', 'bitte', 'preis', 'kontakt', 'hilfe', 'ich', 'brauche', 'mochte']),
  }

  const counts = { es: 0, fr: 0, de: 0 }
  for (const t of tokens) {
    for (const [lang, hints] of Object.entries(hintSets)) {
      if (hints.has(t)) counts[lang]++
    }
  }

  const max = Math.max(counts.es, counts.fr, counts.de)
  if (max >= 2) {
    return Object.keys(counts).find((lang) => counts[lang] === max)
  }
  return null
}

function fallbackKb(language) {
  return {
    version: 2,
    language,
    intents: [],
    fallback: {
      answer:
        language === 'vi'
          ? 'Mình chưa chắc mình hiểu đúng câu hỏi. Bạn có thể nói rõ hơn bạn đang hỏi về mục nào không (Dịch vụ / Dự án / Tuyển dụng / Liên hệ)?'
          : 'I’m not fully sure I understood. Could you clarify what you’re asking about (Services / Projects / Recruitment / Contact)?',
    },
  }
}

/** Precomputes the normalized/tokenized candidate strings once per load. */
function prepareKb(kb, language) {
  const safe = {
    version: kb?.version || 2,
    language: kb?.language || language,
    intents: Array.isArray(kb?.intents) ? kb.intents : [],
    fallback: kb?.fallback || fallbackKb(language).fallback,
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
        .catch(() => fallbackKb(safeLang))
        .then((kb) => {
          cache[safeLang] = prepareKb(kb, safeLang)
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

    // Detection was inconclusive: compare match strength across both KBs and
    // only move away from the site language when there is a clear winner.
    const [kbEn, kbVi] = await Promise.all([ensureKb('en'), ensureKb('vi')])
    const enScore = findBestIntents(kbEn, queryNorm, tokenize(queryNorm, 'en'))[0]?.score ?? 0
    const viScore = findBestIntents(kbVi, queryNorm, tokenize(queryNorm, 'vi'))[0]?.score ?? 0

    if (Math.max(enScore, viScore) >= INTENT_THRESHOLD && Math.abs(enScore - viScore) >= 0.05) {
      return enScore > viScore ? 'en' : 'vi'
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
    const detectedFaqLanguage = [directLanguage, unsupported]
      .find((language) => isSupportedFaqLanguage(language))
    const faqSearchLanguage =
      detectedFaqLanguage ||
      (!unsupported && isSupportedFaqLanguage(siteLang) ? siteLang : 'en')
    const faqQueryTokens = tokenize(queryNorm, faqSearchLanguage)
    const matchedFaq = findBestFaq(queryNorm, faqQueryTokens, faqSearchLanguage)
    const localizedFaq = localizeFaqMatch(matchedFaq, siteLang)
    const uiStrings = copy(isSupportedFaqLanguage(siteLang) ? siteLang : botLanguage)
    const quickTopic = !KB_LANGUAGES.includes(siteLang)
      ? findQuickTopic(uiStrings.quickTopics, raw)
      : null

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

    // Supported site locales can use their authored FAQ corpus even though the
    // broader intent knowledge base is currently limited to Vietnamese/English.
    if (unsupported && matchedFaq?.score >= FAQ_THRESHOLD && localizedFaq) {
      return {
        content: String(localizedFaq.a),
        links: [{ label: uiStrings.viewFaqs, url: uiStrings.faqsUrl }],
        meta: {
          source: 'faq',
          faqId: localizedFaq.id,
          category: localizedFaq.category,
          score: matchedFaq.score,
        },
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
    const strings = copy(isSupportedFaqLanguage(siteLang) ? siteLang : detectedLang)

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

  // Warm both knowledge bases without blocking first paint.
  void ensureKb('vi').catch(() => {})
  void ensureKb('en').catch(() => {})

  return { siteLang, botLanguage, ensureKb, getResponse }
}
