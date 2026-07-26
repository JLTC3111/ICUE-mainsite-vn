/** Server-side translation providers (Google Cloud Translation v2; DeepL optional). */

import { LOCALE_CODE_SET } from './localeCodes.js'
import { googleTranslateKey } from './serverEnv.js'
import {
  inferSourceLanguage,
  normalizeLang,
  shouldTranslateArticle,
} from './translateUtils.js'

export { inferSourceLanguage, normalizeLang, shouldTranslateArticle } from './translateUtils.js'

function deeplBaseUrl(apiKey) {
  return String(apiKey || '').endsWith(':fx')
    ? 'https://api-free.deepl.com/v2'
    : 'https://api.deepl.com/v2'
}

function deeplTarget(code) {
  const map = {
    de: 'DE',
    fr: 'FR',
    en: 'EN-US',
    vi: 'VI',
    ja: 'JA',
    ko: 'KO',
  }
  return map[code] || String(code || '').toUpperCase()
}

const GOOGLE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2'
/** Set to true once DEEPL_API_KEY is configured on Netlify. */
const DEEPL_ENABLED = false
const DEEPL_LOCALES = new Set(['de', 'fr'])

const MAX_TEXT_CHARS = 4500
const MAX_HTML_CHARS = 28000

export function pickProvider(targetLocale, sourceLocale) {
  if (!DEEPL_ENABLED) return 'google'

  const target = normalizeLang(targetLocale)
  const source = normalizeLang(sourceLocale)

  if (DEEPL_LOCALES.has(target)) return 'deepl'
  if (target === 'en' && DEEPL_LOCALES.has(source)) return 'deepl'
  return 'google'
}

export function resolveProvider(targetLocale, sourceLocale, env = {}) {
  const googleKey = googleTranslateKey(env)
  const deeplKey = env.DEEPL_API_KEY || env.DEEPL_AUTH_KEY

  if (googleKey) return 'google'
  if (DEEPL_ENABLED && deeplKey) return 'deepl'
  throw new Error('google_not_configured')
}

function splitText(text, maxLen = MAX_TEXT_CHARS) {
  const source = String(text ?? '')
  if (source.length <= maxLen) return [source]
  const parts = []
  let remaining = source
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf(' ', maxLen)
    if (cut <= 0) cut = maxLen
    parts.push(remaining.slice(0, cut))
    remaining = remaining.slice(cut)
  }
  if (remaining) parts.push(remaining)
  return parts
}

function splitHtml(html, maxLen = MAX_HTML_CHARS) {
  const source = String(html ?? '')
  if (source.length <= maxLen) return [source]

  const parts = []
  let remaining = source
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf('</p>', maxLen)
    if (cut <= 0) cut = remaining.lastIndexOf('</div>', maxLen)
    if (cut <= 0) cut = maxLen
    parts.push(remaining.slice(0, cut + (cut === maxLen ? 0 : 4)))
    remaining = remaining.slice(cut + (cut === maxLen ? 0 : 4))
  }
  if (remaining) parts.push(remaining)
  return parts
}

async function googleDetect(text, apiKey) {
  const res = await fetch(`${GOOGLE_ENDPOINT}/detect?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: String(text || '').slice(0, 500) }),
  })
  if (!res.ok) throw new Error(`google_detect_${res.status}`)
  const data = await res.json()
  const lang = data?.data?.detections?.[0]?.[0]?.language
  return normalizeLang(lang || '')
}

async function googleTranslateText(text, target, apiKey, source) {
  const chunks = splitText(text)
  const out = []
  for (const chunk of chunks) {
    const body = {
      q: chunk,
      target: normalizeLang(target),
      format: 'text',
    }
    if (source) body.source = normalizeLang(source)
    const res = await fetch(`${GOOGLE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`google_translate_${res.status}`)
    const data = await res.json()
    out.push(data?.data?.translations?.[0]?.translatedText ?? chunk)
  }
  return out.join('')
}

async function googleTranslateHtml(html, target, apiKey, source) {
  const chunks = splitHtml(html)
  const out = []
  for (const chunk of chunks) {
    const body = {
      q: chunk,
      target: normalizeLang(target),
      format: 'html',
    }
    if (source) body.source = normalizeLang(source)
    const res = await fetch(`${GOOGLE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`google_translate_html_${res.status}`)
    const data = await res.json()
    out.push(data?.data?.translations?.[0]?.translatedText ?? chunk)
  }
  return out.join('')
}

async function deeplTranslate(text, target, apiKey, { html = false, source } = {}) {
  const chunks = splitText(text, html ? MAX_HTML_CHARS : MAX_TEXT_CHARS)
  const out = []
  for (const chunk of chunks) {
    const params = new URLSearchParams()
    params.set('text', chunk)
    params.set('target_lang', deeplTarget(target))
    if (html) params.set('tag_handling', 'html')
    if (source) params.set('source_lang', deeplTarget(source))

    const res = await fetch(`${deeplBaseUrl(apiKey)}/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    if (!res.ok) throw new Error(`deepl_translate_${res.status}`)
    const data = await res.json()
    out.push(data?.translations?.[0]?.text ?? chunk)
  }
  return out.join('')
}

export async function detectSourceLanguage(sample, env) {
  const googleKey = googleTranslateKey(env)
  if (googleKey && sample?.trim()) {
    try {
      return await googleDetect(sample, googleKey)
    } catch {
      // fall through
    }
  }
  return ''
}

export async function translateFields(
  { title, subtitle, content_html },
  targetLocale,
  sourceLocale,
  env,
) {
  const provider = resolveProvider(targetLocale, sourceLocale, env)
  const googleKey = googleTranslateKey(env)
  const deeplKey = env.DEEPL_API_KEY || env.DEEPL_AUTH_KEY

  if (provider === 'deepl') {
    if (!DEEPL_ENABLED || !deeplKey) throw new Error('deepl_not_configured')
    const [nextTitle, nextSubtitle, nextHtml] = await Promise.all([
      title ? deeplTranslate(title, targetLocale, deeplKey, { source: sourceLocale }) : '',
      subtitle ? deeplTranslate(subtitle, targetLocale, deeplKey, { source: sourceLocale }) : '',
      content_html
        ? deeplTranslate(content_html, targetLocale, deeplKey, {
            html: true,
            source: sourceLocale,
          })
        : '',
    ])
    return {
      provider: 'deepl',
      title: nextTitle,
      subtitle: nextSubtitle,
      content_html: nextHtml,
    }
  }

  if (!googleKey) throw new Error('google_not_configured')
  const source = sourceLocale || undefined
  const [nextTitle, nextSubtitle, nextHtml] = await Promise.all([
    title ? googleTranslateText(title, targetLocale, googleKey, source) : '',
    subtitle ? googleTranslateText(subtitle, targetLocale, googleKey, source) : '',
    content_html ? googleTranslateHtml(content_html, targetLocale, googleKey, source) : '',
  ])
  return {
    provider: 'google',
    title: nextTitle,
    subtitle: nextSubtitle,
    content_html: nextHtml,
  }
}

export async function translateSources(sources, targetLocale, _sourceLocale, env) {
  const list = Array.isArray(sources) ? sources : []
  if (!list.length) return []

  const results = await Promise.all(
    list.map(async (row) => {
      const [labelResult, publisherResult] = await Promise.all([
        row.label
          // Source labels and publishers are independent UGC and may not use
          // the article's declared language. Detect each value separately so
          // Google Cloud receives the correct source text/language pair.
          ? translatePlainText(row.label, targetLocale, '', env)
          : Promise.resolve({ text: '' }),
        row.publisher
          ? translatePlainText(row.publisher, targetLocale, '', env)
          : Promise.resolve({ text: '' }),
      ])

      return {
        id: row.id,
        label: labelResult.text || row.label || '',
        url: row.url,
        publisher: publisherResult.text || row.publisher || null,
        accessed_at: row.accessed_at || null,
      }
    }),
  )

  return results
}

export async function translatePlainText(text, targetLocale, sourceLocale, env) {
  const sample = String(text || '').trim()
  if (!sample) return { provider: null, text: '' }

  const target = normalizeLang(targetLocale)
  const source = sourceLocale || inferSourceLanguage('', sample)
  if (!shouldTranslateArticle(source, target, sample)) {
    return { provider: null, text: sample, original: true }
  }

  const provider = resolveProvider(target, source, env)
  const googleKey = googleTranslateKey(env)
  const deeplKey = env.DEEPL_API_KEY || env.DEEPL_AUTH_KEY

  if (provider === 'deepl') {
    if (!DEEPL_ENABLED || !deeplKey) throw new Error('deepl_not_configured')
    const next = await deeplTranslate(sample, target, deeplKey, { source })
    return { provider: 'deepl', text: next, original: false }
  }

  if (!googleKey) throw new Error('google_not_configured')
  const next = await googleTranslateText(sample, target, googleKey, source || undefined)
  return { provider: 'google', text: next, original: false }
}
