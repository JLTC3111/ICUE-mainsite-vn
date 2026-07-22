function normalizeMediaComparisonPair(raw) {
  if (!raw || typeof raw !== 'object') return null
  const beforeId = String(raw.before_id ?? raw.beforeId ?? '').trim()
  const afterId = String(raw.after_id ?? raw.afterId ?? '').trim()
  if (!beforeId || !afterId || beforeId === afterId) return null
  return {
    before_id: beforeId,
    after_id: afterId,
    ...(raw.before_url ? { before_url: String(raw.before_url) } : {}),
    ...(raw.after_url ? { after_url: String(raw.after_url) } : {}),
  }
}

export function normalizeMediaComparisons(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map(normalizeMediaComparisonPair).filter(Boolean)
  }
  if (Array.isArray(raw.pairs)) {
    return raw.pairs.map(normalizeMediaComparisonPair).filter(Boolean)
  }
  const single = normalizeMediaComparisonPair(raw)
  return single ? [single] : []
}

/** @deprecated Use normalizeMediaComparisons — returns first pair or null. */
export function normalizeMediaComparison(raw) {
  return normalizeMediaComparisons(raw)[0] ?? null
}

function findClientId(dbId, items = []) {
  const match = items.find((item) => item.dbId === dbId || item.id === dbId)
  return match?.id ?? null
}

export const COVER_COMPARISON_ID = '__cover__'
export const COVER_COMPARISON_ID_2 = '__cover_2__'
export const MAX_COVER_COMPARISON_PAIRS = 1

function normalizeComparisonField(raw) {
  const pairs = normalizeMediaComparisons(raw)
  if (!pairs.length) return null
  if (pairs.length === 1) return pairs[0]
  return { pairs }
}

function coverUrlsFrom(primary, alt) {
  return {
    primary: primary || null,
    alt: alt || null,
  }
}

function resolveComparisonIds(
  pair,
  clientToDb,
  { allowCover = false, hasCover = false, hasCoverAlt = false } = {},
) {
  if (!pair?.beforeId || !pair?.afterId) return null

  const resolveId = (clientId) => {
    if (clientId === COVER_COMPARISON_ID) {
      if (!allowCover || !hasCover) return null
      return COVER_COMPARISON_ID
    }
    if (clientId === COVER_COMPARISON_ID_2) {
      if (!allowCover || !hasCoverAlt) return null
      return COVER_COMPARISON_ID_2
    }
    return clientToDb.get(clientId) ?? null
  }

  const before_id = resolveId(pair.beforeId)
  const after_id = resolveId(pair.afterId)
  if (!before_id || !after_id || before_id === after_id) return null
  return { before_id, after_id }
}

function resolveImageById(id, coverUrls, images) {
  if (id === COVER_COMPARISON_ID) {
    if (!coverUrls.primary) return null
    return { id: COVER_COMPARISON_ID, url: coverUrls.primary, kind: 'image' }
  }
  if (id === COVER_COMPARISON_ID_2) {
    if (!coverUrls.alt) return null
    return { id: COVER_COMPARISON_ID_2, url: coverUrls.alt, kind: 'image' }
  }
  return images.find((img) => img.id === id) ?? null
}

function comparisonIdsToEditor(pair, items = []) {
  const toEditorId = (dbId) => {
    if (dbId === COVER_COMPARISON_ID) return COVER_COMPARISON_ID
    if (dbId === COVER_COMPARISON_ID_2) return COVER_COMPARISON_ID_2
    return findClientId(dbId, items)
  }

  return {
    beforeId: toEditorId(pair.before_id),
    afterId: toEditorId(pair.after_id),
  }
}

const EMPTY_EDITOR_PAIR = { beforeId: null, afterId: null }

export function coverComparisonToEditorIds(comparison, items = []) {
  const normalized = normalizeMediaComparisons(comparison).slice(0, MAX_COVER_COMPARISON_PAIRS)
  if (!normalized.length) return { pairs: [{ ...EMPTY_EDITOR_PAIR }] }

  return {
    pairs: normalized.map((pair) => comparisonIdsToEditor(pair, items)),
  }
}

export function comparisonToEditorIds(comparison, items = []) {
  const normalized = normalizeMediaComparisons(comparison)
  if (!normalized.length) return { pairs: [{ ...EMPTY_EDITOR_PAIR }] }

  return {
    pairs: normalized.map((pair) => ({
      beforeId: findClientId(pair.before_id, items),
      afterId: findClientId(pair.after_id, items),
    })),
  }
}

export function pruneEditorComparison(comparison, itemId) {
  if (!comparison?.pairs) return comparison
  return {
    pairs: comparison.pairs.map((pair) => ({
      beforeId: pair.beforeId === itemId ? null : pair.beforeId,
      afterId: pair.afterId === itemId ? null : pair.afterId,
    })),
  }
}

export function resolveCoverComparisonForSave(
  comparison,
  clientToDb,
  hasCover,
  hasCoverAlt = false,
) {
  const pairs = (comparison?.pairs ?? []).slice(0, MAX_COVER_COMPARISON_PAIRS)
  const resolved = pairs
    .map((pair) => resolveComparisonIds(pair, clientToDb, {
      allowCover: true,
      hasCover,
      hasCoverAlt,
    }))
    .filter(Boolean)

  if (!resolved.length) return null
  return resolved[0]
}

export function enrichCoverComparisonForSave(
  pair,
  coverUrl,
  coverAltUrl,
  editorImages,
  clientToDb,
) {
  if (!pair) return null

  const dbImages = (editorImages ?? [])
    .filter((item) => item?.kind === 'image' && item?.url)
    .map((item) => ({
      id: clientToDb.get(item.id) ?? item.dbId ?? item.id,
      url: item.url,
      kind: 'image',
    }))

  const coverUrls = coverUrlsFrom(coverUrl, coverAltUrl)
  const before = resolveImageById(pair.before_id, coverUrls, dbImages)
  const after = resolveImageById(pair.after_id, coverUrls, dbImages)

  return {
    ...pair,
    ...(before?.url ? { before_url: before.url } : {}),
    ...(after?.url ? { after_url: after.url } : {}),
  }
}

export function resolveMediaComparisonForSave(comparison, clientToDb) {
  const pairs = comparison?.pairs ?? []
  const resolved = pairs
    .map((pair) => resolveComparisonIds(pair, clientToDb))
    .filter(Boolean)

  if (!resolved.length) return null
  if (resolved.length === 1) return resolved[0]
  return { pairs: resolved }
}

export function findEditorCoverComparisonPairs(coverUrl, images, comparison, coverAltUrl = null) {
  return findAllCoverComparisonImages(coverUrl, images, comparison, coverAltUrl)
}

export function findAllCoverComparisonImages(coverUrl, images, comparison, coverAltUrl = null) {
  const normalized = normalizeMediaComparisons(comparison).slice(0, MAX_COVER_COMPARISON_PAIRS)
  if (!normalized.length) return []

  const coverUrls = coverUrlsFrom(coverUrl, coverAltUrl)

  return normalized
    .map((pair) => {
      let before = resolveImageById(pair.before_id, coverUrls, images)
      let after = resolveImageById(pair.after_id, coverUrls, images)

      if (!before?.url && pair.before_url) {
        before = { id: pair.before_id, url: pair.before_url, kind: 'image' }
      }
      if (!after?.url && pair.after_url) {
        after = { id: pair.after_id, url: pair.after_url, kind: 'image' }
      }

      if (!before?.url || !after?.url) return null
      return { before, after }
    })
    .filter(Boolean)
}

export function galleryImagesFromArticleMedia(media = []) {
  return media
    .filter((item) => item?.kind === 'image' && item?.url)
    .map((item) => ({ id: item.id, url: item.url, kind: 'image' }))
}

/** First resolved cover comparison pair for an article, or null when using a static cover only. */
export function resolveArticleCoverComparison(article) {
  if (!article) return null
  const images = galleryImagesFromArticleMedia(article.media)
  return findAllCoverComparisonImages(
    article.cover_image_url,
    images,
    article.cover_comparison,
    article.cover_image_alt_url,
  )[0] ?? null
}

function collectComparisonSkipIds(comparison, { includeCover = false, coverUrl = null, coverAltUrl = null } = {}) {
  const skip = new Set()
  normalizeMediaComparisons(comparison).forEach((pair) => {
    if (includeCover || pair.before_id !== COVER_COMPARISON_ID) skip.add(pair.before_id)
    if (includeCover || pair.after_id !== COVER_COMPARISON_ID) skip.add(pair.after_id)
    if (includeCover || pair.before_id !== COVER_COMPARISON_ID_2) skip.add(pair.before_id)
    if (includeCover || pair.after_id !== COVER_COMPARISON_ID_2) skip.add(pair.after_id)
  })
  if (!includeCover && coverUrl) {
    skip.delete(COVER_COMPARISON_ID)
  }
  if (!includeCover && coverAltUrl) {
    skip.delete(COVER_COMPARISON_ID_2)
  }
  return skip
}

export function findEditorComparisonPairs(images, comparison) {
  const pairs = comparison?.pairs ?? []
  return pairs
    .map((pair) => {
      if (!pair?.beforeId || !pair?.afterId) return null
      const before = images.find((img) => img.id === pair.beforeId)
      const after = images.find((img) => img.id === pair.afterId)
      if (!before || !after) return null
      return { before, after }
    })
    .filter(Boolean)
}

/** @deprecated Use findEditorComparisonPairs — returns first resolved pair or null. */
export function findEditorComparisonPair(images, comparison) {
  return findEditorComparisonPairs(images, comparison)[0] ?? null
}

export function findAllComparisonImages(images, comparison) {
  const normalized = normalizeMediaComparisons(comparison)
  if (!normalized.length || !images?.length) return []

  return normalized
    .map((pair) => {
      const before = images.find((img) => img.id === pair.before_id)
      const after = images.find((img) => img.id === pair.after_id)
      if (!before || !after) return null
      return { before, after }
    })
    .filter(Boolean)
}

/** @deprecated Use findAllComparisonImages — returns first pair or null. */
export function findComparisonImages(images, comparison) {
  return findAllComparisonImages(images, comparison)[0] ?? null
}

export function imagesWithoutComparison(images, mediaComparison, coverComparison = null) {
  const skip = new Set()

  collectComparisonSkipIds(mediaComparison).forEach((id) => skip.add(id))
  collectComparisonSkipIds(coverComparison).forEach((id) => {
    if (id !== COVER_COMPARISON_ID && id !== COVER_COMPARISON_ID_2) skip.add(id)
  })

  if (!skip.size) return images
  return images.filter((img) => !skip.has(img.id))
}

export function normalizeCoverComparisonField(raw) {
  return normalizeComparisonField(raw)
}

export function normalizeMediaComparisonField(raw) {
  return normalizeComparisonField(raw)
}
