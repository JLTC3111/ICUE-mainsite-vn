import { getFaqEntries, isSupportedFaqLanguage } from '@icue/faq-content'

/**
 * The chatbot's matching engine, ported from `createChatbotKnowledge()` in
 * src/script.js:4210-4535.
 *
 * It is a keyword scorer, not a model: every answer comes from an authored
 * intent in public/chatbot/kb.<lang>.json or from the FAQ corpus. Three things
 * changed in the port, all of them noted where they happen:
 *
 *  - the FAQ corpus is imported rather than read off a `window.__icueFaqData`
 *    global the legacy runtime published;
 *  - the knowledge base is fetched relative to the app's base URL;
 *  - answers can come from the FAQ corpus in any of the six locales, not only
 *    Vietnamese.
 */

/** Intent match must reach this to be used at all. */
const INTENT_THRESHOLD = 0.45
/** FAQ match must reach this, and beat the intent, to be preferred. */
const FAQ_THRESHOLD = 0.52

/** The two languages the authored knowledge base covers. */
export const KB_LANGUAGES = ['vi', 'en']

export function normalizeForSearch(text) {
  let s = String(text || '').toLowerCase()
  try {
    s = s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  } catch {
    // Older engines without full NFD support fall through to the ASCII pass.
  }
  s = s.replace(/đ/g, 'd')
  // After diacritics removal, keep it ASCII-only for compatibility.
  s = s.replace(/[^a-z0-9\s]/g, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

const STOP_WORDS = new Set([
  'la', 'va', 'hoac', 'cua', 'cho', 've', 'o', 'toi', 'ban', 'minh', 'chung',
  'xin', 'vui', 'long', 'nhe', 'a', 'oi',
  'the', 'an', 'to', 'for', 'and', 'or', 'of', 'in', 'on', 'at', 'is', 'are',
  'am', 'i', 'you', 'we', 'our', 'about', 'please',
])

export function tokenize(normText) {
  return String(normText || '')
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
}

/**
 * Blends Jaccard overlap with how much of the *candidate* the query covers, so
 * a short authored phrase fully contained in a long question still scores well.
 *
 * The containment test is whole-word, which the legacy version
 * (src/script.js:4473) was not: it did a bare `queryNorm.includes(candNorm)`,
 * so the greeting intent's two-letter keyword "hi" was found inside "c-hi phi"
 * and scored 0.92 — well past every threshold. Asking "Chi phí dịch vụ tính
 * thế nào?" got the greeting back instead of the fees answer, and the same
 * went for any Vietnamese question containing chi, thi, hien and so on.
 * Padding both sides with spaces confines the match to token boundaries.
 */
export function scoreTokens(queryTokens, candTokens, queryNorm, candNorm) {
  if (!candNorm) return 0
  if (queryNorm === candNorm) return 1

  const paddedQuery = ` ${queryNorm} `
  const paddedCandidate = ` ${candNorm} `
  if (paddedQuery.includes(paddedCandidate) || paddedCandidate.includes(paddedQuery)) return 0.92

  const qSet = new Set(queryTokens)
  const cSet = new Set(candTokens)
  if (qSet.size === 0 || cSet.size === 0) return 0

  let intersect = 0
  for (const t of cSet) if (qSet.has(t)) intersect++
  const union = qSet.size + cSet.size - intersect
  const jaccard = union ? intersect / union : 0
  const coverage = cSet.size ? intersect / cSet.size : 0

  return 0.65 * jaccard + 0.35 * coverage
}

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
    version: 1,
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
    version: kb?.version || 1,
    language: kb?.language || language,
    intents: Array.isArray(kb?.intents) ? kb.intents : [],
    fallback: kb?.fallback || fallbackKb(language).fallback,
  }

  safe.intents = safe.intents
    .filter((it) => it && typeof it.answer === 'string')
    .map((it) => {
      const keywords = Array.isArray(it.keywords) ? it.keywords.filter(Boolean) : []
      const phrases = Array.isArray(it.phrases) ? it.phrases.filter(Boolean) : []
      const links = Array.isArray(it.links) ? it.links.filter((l) => l && l.label && l.url) : []
      const candidates = [...keywords, ...phrases]
        .map((s) => normalizeForSearch(String(s)))
        .filter(Boolean)
      return {
        id: it.id || 'intent',
        answer: String(it.answer),
        links,
        candidates,
        candidateTokens: candidates.map(tokenize),
      }
    })

  return safe
}

function findBestIntent(kb, queryNorm, queryTokens) {
  let best = null
  for (const intent of kb.intents || []) {
    let bestScore = 0
    for (let i = 0; i < intent.candidates.length; i++) {
      const s = scoreTokens(queryTokens, intent.candidateTokens[i] || [], queryNorm, intent.candidates[i])
      if (s > bestScore) bestScore = s
    }
    if (!best || bestScore > best.score) best = { intent, score: bestScore }
  }
  return best
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
  let best = null
  for (const { q, a, category } of getFaqEntries(corpusLanguage)) {
    const qNorm = normalizeForSearch(q)
    const s = scoreTokens(queryTokens, tokenize(qNorm), queryNorm, qNorm)
    if (!best || s > best.score) best = { category, question: q, answer: String(a), score: s }
  }
  return best
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

  async function routeLanguage(raw, queryNorm, queryTokens) {
    const direct = detectUserLanguage(raw)
    if (direct) return direct

    // Detection was inconclusive: compare match strength across both KBs and
    // only move away from the site language when there is a clear winner.
    const [kbEn, kbVi] = await Promise.all([ensureKb('en'), ensureKb('vi')])
    const enScore = findBestIntent(kbEn, queryNorm, queryTokens)?.score ?? 0
    const viScore = findBestIntent(kbVi, queryNorm, queryTokens)?.score ?? 0

    if (Math.max(enScore, viScore) >= INTENT_THRESHOLD && Math.abs(enScore - viScore) >= 0.05) {
      return enScore > viScore ? 'en' : 'vi'
    }
    return botLanguage
  }

  async function getResponse(userMessage) {
    const raw = String(userMessage || '').trim()
    if (!raw) {
      const kb = await ensureKb(botLanguage)
      return { content: kb.fallback?.answer || '', links: [] }
    }

    const unsupported = detectUnsupportedLanguage(raw)
    if (unsupported) {
      return { content: copy(botLanguage).unsupported, links: [] }
    }

    const queryNorm = normalizeForSearch(raw)
    const queryTokens = tokenize(queryNorm)

    const detectedLang = await routeLanguage(raw, queryNorm, queryTokens)
    const kb = await ensureKb(detectedLang)
    const strings = copy(detectedLang)

    const bestIntent = findBestIntent(kb, queryNorm, queryTokens)
    // Look the question up in the reader's UI language when we have a corpus
    // for it, so a Korean reader gets the Korean answer to an English question.
    const bestFaq = findBestFaq(queryNorm, queryTokens, isSupportedFaqLanguage(siteLang) ? siteLang : detectedLang)

    const intentScore = bestIntent?.score ?? 0
    const faqScore = bestFaq?.score ?? 0

    if (faqScore >= FAQ_THRESHOLD && faqScore >= intentScore) {
      return {
        content: bestFaq.answer,
        links: [{ label: strings.viewFaqs, url: strings.faqsUrl }],
      }
    }

    if (intentScore >= INTENT_THRESHOLD) {
      return { content: bestIntent.intent.answer, links: bestIntent.intent.links || [] }
    }

    return {
      content: kb.fallback?.answer || strings.fallback,
      links: [
        { label: strings.faqs, url: strings.faqsUrl },
        { label: strings.contact, url: strings.contactUrl },
      ],
    }
  }

  // Warm both knowledge bases without blocking first paint.
  void ensureKb('vi').catch(() => {})
  void ensureKb('en').catch(() => {})

  return { siteLang, botLanguage, ensureKb, getResponse }
}
