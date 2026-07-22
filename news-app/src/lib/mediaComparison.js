function normalizeMediaComparisonPair(raw) {
  if (!raw || typeof raw !== 'object') return null
  const beforeId = String(raw.before_id ?? raw.beforeId ?? '').trim()
  const afterId = String(raw.after_id ?? raw.afterId ?? '').trim()
  if (!beforeId || !afterId || beforeId === afterId) return null
  return { before_id: beforeId, after_id: afterId }
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
export const MAX_COVER_COMPARISON_PAIRS = 1

function normalizeComparisonField(raw) {
  const pairs = normalizeMediaComparisons(raw)
  if (!pairs.length) return null
  if (pairs.length === 1) return pairs[0]
  return { pairs }
}

function resolveComparisonIds(pair, clientToDb, { allowCover = false, hasCover = false } = {}) {
  if (!pair?.beforeId || !pair?.afterId) return null

  const resolveId = (clientId) => {
    if (clientId === COVER_COMPARISON_ID) {
      if (!allowCover || !hasCover) return null
      return COVER_COMPARISON_ID
    }
    return clientToDb.get(clientId) ?? null
  }

  const before_id = resolveId(pair.beforeId)
  const after_id = resolveId(pair.afterId)
  if (!before_id || !after_id || before_id === after_id) return null
  return { before_id, after_id }
}

function resolveImageById(id, coverUrl, images) {
  if (id === COVER_COMPARISON_ID) {
    if (!coverUrl) return null
    return { id: COVER_COMPARISON_ID, url: coverUrl, kind: 'image' }
  }
  return images.find((img) => img.id === id) ?? null
}

function comparisonIdsToEditor(pair, items = []) {
  const toEditorId = (dbId) => {
    if (dbId === COVER_COMPARISON_ID) return COVER_COMPARISON_ID
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

export function resolveCoverComparisonForSave(comparison, clientToDb, hasCover) {
  const pairs = (comparison?.pairs ?? []).slice(0, MAX_COVER_COMPARISON_PAIRS)
  const resolved = pairs
    .map((pair) => resolveComparisonIds(pair, clientToDb, { allowCover: true, hasCover }))
    .filter(Boolean)

  if (!resolved.length) return null
  return resolved[0]
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

export function findEditorCoverComparisonPairs(coverUrl, images, comparison) {
  return findAllCoverComparisonImages(coverUrl, images, comparison)
}

export function findAllCoverComparisonImages(coverUrl, images, comparison) {
  const normalized = normalizeMediaComparisons(comparison).slice(0, MAX_COVER_COMPARISON_PAIRS)
  if (!normalized.length) return []

  return normalized
    .map((pair) => {
      const before = resolveImageById(pair.before_id, coverUrl, images)
      const after = resolveImageById(pair.after_id, coverUrl, images)
      if (!before?.url || !after?.url) return null
      return { before, after }
    })
    .filter(Boolean)
}

function collectComparisonSkipIds(comparison, { includeCover = false, coverUrl = null } = {}) {
  const skip = new Set()
  normalizeMediaComparisons(comparison).forEach((pair) => {
    if (includeCover || pair.before_id !== COVER_COMPARISON_ID) skip.add(pair.before_id)
    if (includeCover || pair.after_id !== COVER_COMPARISON_ID) skip.add(pair.after_id)
  })
  if (!includeCover && coverUrl) {
    skip.delete(COVER_COMPARISON_ID)
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
    if (id !== COVER_COMPARISON_ID) skip.add(id)
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
