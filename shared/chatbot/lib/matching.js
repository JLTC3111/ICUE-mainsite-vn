const STOP_WORDS = new Set([
  'la', 'va', 'hoac', 'cua', 'cho', 've', 'o', 'toi', 'ban', 'minh', 'chung',
  'xin', 'vui', 'long', 'nhe', 'a', 'oi',
  'the', 'an', 'to', 'for', 'and', 'or', 'of', 'in', 'on', 'at', 'is', 'are',
  'am', 'i', 'you', 'we', 'our', 'about', 'please',
])

const segmenters = new Map()

/**
 * Normalizes Latin diacritics while retaining non-Latin scripts. The previous
 * ASCII-only pass erased Korean and Japanese questions before FAQ matching.
 */
export function normalizeForSearch(text) {
  let value = String(text || '').toLowerCase()
  try {
    value = value
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .normalize('NFC')
  } catch {
    // Older engines without Unicode property escapes keep the original text.
  }
  value = value.replace(/đ/g, 'd')
  value = value.replace(/[^\p{L}\p{N}\s]/gu, ' ')
  return value.replace(/\s+/g, ' ').trim()
}

function getSegmenter(language) {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') return null
  const key = language || 'und'
  if (!segmenters.has(key)) {
    try {
      segmenters.set(key, new Intl.Segmenter(language || undefined, { granularity: 'word' }))
    } catch {
      segmenters.set(key, null)
    }
  }
  return segmenters.get(key)
}

function keepToken(token) {
  if (!token || STOP_WORDS.has(token)) return false
  // One-character Han/Kana tokens can be meaningful; short Latin noise is not.
  return /[^a-z0-9]/i.test(token) || token.length >= 2
}

export function tokenize(normText, language) {
  const value = String(normText || '').trim()
  if (!value) return []

  const segmenter = getSegmenter(language)
  if (segmenter) {
    return [...segmenter.segment(value)]
      .filter((part) => part.isWordLike)
      .map((part) => part.segment.trim())
      .filter(keepToken)
  }

  return value.split(' ').map((token) => token.trim()).filter(keepToken)
}

/**
 * Scores lexical overlap without granting a near-perfect result to any word
 * merely contained in a longer question. Multi-word authored phrases receive
 * a small specificity bonus when they occur intact.
 */
export function scoreTokens(queryTokens, candidateTokens, queryNorm, candidateNorm) {
  if (!candidateNorm) return 0
  if (queryNorm === candidateNorm) return 1

  const querySet = new Set(queryTokens)
  const candidateSet = new Set(candidateTokens)
  if (querySet.size === 0 || candidateSet.size === 0) return 0

  let intersection = 0
  for (const token of candidateSet) if (querySet.has(token)) intersection += 1
  if (intersection === 0) return 0

  const union = querySet.size + candidateSet.size - intersection
  const jaccard = union ? intersection / union : 0
  const coverage = intersection / candidateSet.size
  let score = 0.65 * jaccard + 0.35 * coverage

  const paddedQuery = ` ${queryNorm} `
  const paddedCandidate = ` ${candidateNorm} `
  if (candidateSet.size >= 2 && paddedQuery.includes(paddedCandidate)) score += 0.08
  else if (querySet.size >= 2 && paddedCandidate.includes(paddedQuery)) score += 0.04

  return Math.min(score, 0.96)
}

export function rankIntents(intents, queryNorm, queryTokens) {
  return (intents || [])
    .map((intent, order) => {
      let score = 0
      let candidate = ''
      let candidateSize = 0

      for (let index = 0; index < intent.candidates.length; index += 1) {
        const current = scoreTokens(
          queryTokens,
          intent.candidateTokens[index] || [],
          queryNorm,
          intent.candidates[index],
        )
        const size = intent.candidateTokens[index]?.length || 0
        if (current > score || (current === score && size > candidateSize)) {
          score = current
          candidate = intent.candidates[index]
          candidateSize = size
        }
      }

      return { intent, score, candidate, candidateSize, order }
    })
    .sort((left, right) =>
      right.score - left.score || right.candidateSize - left.candidateSize || left.order - right.order,
    )
}

export function rankFaqEntries(entries, queryNorm, queryTokens, language) {
  return (entries || [])
    .map((entry, order) => {
      const candidateNorm = normalizeForSearch(entry.q)
      const candidateTokens = tokenize(candidateNorm, language)
      return {
        ...entry,
        score: scoreTokens(queryTokens, candidateTokens, queryNorm, candidateNorm),
        candidateSize: candidateTokens.length,
        order,
      }
    })
    .sort((left, right) =>
      right.score - left.score || right.candidateSize - left.candidateSize || left.order - right.order,
    )
}

export function isAmbiguousIntentMatch(first, second, threshold, delta = 0.035) {
  return Boolean(
    first?.intent?.id &&
      second?.intent?.id &&
      first.intent.id !== second.intent.id &&
      first.score >= threshold &&
      second.score >= threshold &&
      Math.abs(first.score - second.score) <= delta,
  )
}

export function findQuickTopic(topics, text) {
  const query = normalizeForSearch(text)
  if (!query) return null
  for (const [id, topic] of Object.entries(topics || {})) {
    const matches = (topic.triggers || [])
      .some((trigger) => normalizeForSearch(trigger) === query)
    if (matches) return { id, ...topic }
  }
  return null
}
