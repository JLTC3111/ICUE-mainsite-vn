/**
 * On-device translation via the Chromium built-in Translator API.
 *
 * This is the only machine translation left in the app, and it is deliberately
 * different in kind from the Google/DeepL pipeline that was removed: the model
 * runs inside the reader's own browser, no text leaves the device, there is no
 * API key, and the output is never written to the database. Anything persisted
 * in `comment_translations` is hand-authored by an editor.
 *
 * Every entry point degrades to "no translation" rather than throwing, so a
 * browser without the API (Safari, Firefox, older Chrome) simply shows the
 * original comment.
 */

// The API graduated from `self.ai.translator` (origin trial) to the `Translator`
// / `LanguageDetector` globals. Support both so the feature keeps working
// across Chrome versions rather than silently going dark on one of them.
function getTranslatorApi() {
  if (typeof self === 'undefined') return null
  if (typeof self.Translator?.create === 'function') return self.Translator
  const legacy = self.ai?.translator
  if (typeof legacy?.create === 'function') return legacy
  return null
}

function getDetectorApi() {
  if (typeof self === 'undefined') return null
  if (typeof self.LanguageDetector?.create === 'function') return self.LanguageDetector
  const legacy = self.ai?.languageDetector
  if (typeof legacy?.create === 'function') return legacy
  return null
}

export function isBrowserTranslationSupported() {
  return Boolean(getTranslatorApi())
}

/**
 * 'available' — model is ready, translation is instant.
 * 'downloadable' / 'downloading' — usable, but costs a model download first.
 * 'unavailable' — unsupported browser or language pair.
 */
export async function browserTranslationAvailability(sourceLanguage, targetLanguage) {
  const api = getTranslatorApi()
  if (!api || !sourceLanguage || !targetLanguage) return 'unavailable'
  if (sourceLanguage === targetLanguage) return 'unavailable'

  try {
    if (typeof api.availability === 'function') {
      const state = await api.availability({ sourceLanguage, targetLanguage })
      return state || 'unavailable'
    }
    // Origin-trial shape: capabilities().languagePairAvailable()
    if (typeof api.capabilities === 'function') {
      const caps = await api.capabilities()
      const state = caps?.languagePairAvailable?.(sourceLanguage, targetLanguage)
      if (state === 'readily') return 'available'
      if (state === 'after-download') return 'downloadable'
      return 'unavailable'
    }
  } catch {
    return 'unavailable'
  }
  return 'unavailable'
}

const USABLE = new Set(['available', 'downloadable', 'downloading'])

// Chrome ships its translation packs paired with English, so a direct
// non-English pair (vi->ja, vi->de, …) usually reports 'unavailable' even
// though both halves exist. Routing through English makes every supported
// locale reachable instead of only English.
const PIVOT = 'en'

const routeCache = new Map()

/**
 * How to get from `sourceLanguage` to `targetLanguage`: a list of hops plus the
 * worst availability across them ('downloadable' if any hop needs a model).
 * Returns null when the pair is unreachable.
 */
export async function resolveTranslationRoute(sourceLanguage, targetLanguage) {
  if (!sourceLanguage || !targetLanguage || sourceLanguage === targetLanguage) return null

  const key = `${sourceLanguage}->${targetLanguage}`
  if (routeCache.has(key)) return routeCache.get(key)

  const resolve = (async () => {
    const direct = await browserTranslationAvailability(sourceLanguage, targetLanguage)
    if (USABLE.has(direct)) {
      return { hops: [[sourceLanguage, targetLanguage]], availability: direct }
    }

    if (sourceLanguage !== PIVOT && targetLanguage !== PIVOT) {
      const [first, second] = await Promise.all([
        browserTranslationAvailability(sourceLanguage, PIVOT),
        browserTranslationAvailability(PIVOT, targetLanguage),
      ])
      if (USABLE.has(first) && USABLE.has(second)) {
        const ready = first === 'available' && second === 'available'
        return {
          hops: [[sourceLanguage, PIVOT], [PIVOT, targetLanguage]],
          availability: ready ? 'available' : 'downloadable',
        }
      }
    }

    return null
  })()

  routeCache.set(key, resolve)
  return resolve
}

// Translator instances are expensive to build and hold a model handle, so keep
// one per language pair for the life of the page.
const instances = new Map()

function pairKey(sourceLanguage, targetLanguage) {
  return `${sourceLanguage}->${targetLanguage}`
}

async function getTranslator(sourceLanguage, targetLanguage, onProgress) {
  const key = pairKey(sourceLanguage, targetLanguage)
  const existing = instances.get(key)
  if (existing) return existing

  const api = getTranslatorApi()
  if (!api) return null

  const pending = (async () => {
    try {
      return await api.create({
        sourceLanguage,
        targetLanguage,
        monitor(m) {
          if (typeof onProgress !== 'function') return
          m.addEventListener?.('downloadprogress', (event) => {
            // `loaded` is 0..1 in the shipped API; older builds sent bytes.
            const loaded = Number(event?.loaded)
            if (!Number.isFinite(loaded)) return
            const total = Number(event?.total)
            const ratio = total > 0 ? loaded / total : loaded
            onProgress(Math.max(0, Math.min(1, ratio)))
          })
        },
      })
    } catch {
      // A failed create is usually an unsupported pair or a declined download.
      instances.delete(key)
      return null
    }
  })()

  instances.set(key, pending)
  return pending
}

// Translating the same comment twice (locale toggled back and forth) should not
// re-run the model.
const resultCache = new Map()

function cacheKey(text, sourceLanguage, targetLanguage) {
  return `${sourceLanguage}->${targetLanguage}::${text}`
}

/**
 * Translate one string on-device. Resolves to the translated text, or null when
 * translation is unavailable or fails — callers show the original in that case.
 */
export async function translateWithBrowser(text, {
  sourceLanguage,
  targetLanguage,
  onProgress,
} = {}) {
  const source = String(text || '').trim()
  if (!source || !sourceLanguage || !targetLanguage) return null
  if (sourceLanguage === targetLanguage) return null

  const key = cacheKey(source, sourceLanguage, targetLanguage)
  if (resultCache.has(key)) return resultCache.get(key)

  const route = await resolveTranslationRoute(sourceLanguage, targetLanguage)
  if (!route) return null

  try {
    // One hop for a direct pair, two when pivoting through English.
    let text = source
    for (const [from, to] of route.hops) {
      const translator = await getTranslator(from, to, onProgress)
      if (!translator) return null
      text = String(await translator.translate(text) || '').trim()
      if (!text) return null
    }

    const result = text || null
    resultCache.set(key, result)
    return result
  } catch {
    return null
  }
}

/**
 * Best-effort source-language detection for a short string. Returns a bare
 * language code, or null when the API is unavailable or unsure — the caller
 * falls back to the app's own heuristic in `translateUtils.inferSourceLanguage`.
 */
export async function detectLanguage(text) {
  const api = getDetectorApi()
  const sample = String(text || '').trim()
  if (!api || !sample) return null

  try {
    const detector = await api.create()
    const results = await detector.detect(sample)
    const best = Array.isArray(results) ? results[0] : null
    detector.destroy?.()
    if (!best?.detectedLanguage) return null
    // Low-confidence guesses on short comments are worse than the heuristic.
    if (Number(best.confidence) < 0.5) return null
    return String(best.detectedLanguage).split('-')[0].toLowerCase()
  } catch {
    return null
  }
}
