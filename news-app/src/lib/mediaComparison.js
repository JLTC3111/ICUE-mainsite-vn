export function normalizeMediaComparison(raw) {
  if (!raw || typeof raw !== 'object') return null
  const beforeId = String(raw.before_id ?? raw.beforeId ?? '').trim()
  const afterId = String(raw.after_id ?? raw.afterId ?? '').trim()
  if (!beforeId || !afterId || beforeId === afterId) return null
  return { before_id: beforeId, after_id: afterId }
}

/** Map persisted DB ids to editor client ids. */
export function comparisonToEditorIds(comparison, items = []) {
  const normalized = normalizeMediaComparison(comparison)
  if (!normalized) return { beforeId: null, afterId: null }

  const findClientId = (dbId) => {
    const match = items.find((item) => item.dbId === dbId || item.id === dbId)
    return match?.id ?? null
  }

  return {
    beforeId: findClientId(normalized.before_id),
    afterId: findClientId(normalized.after_id),
  }
}

export function resolveMediaComparisonForSave(comparison, clientToDb) {
  if (!comparison?.beforeId || !comparison?.afterId) return null
  const before_id = clientToDb.get(comparison.beforeId)
  const after_id = clientToDb.get(comparison.afterId)
  if (!before_id || !after_id || before_id === after_id) return null
  return { before_id, after_id }
}

export function findEditorComparisonPair(images, comparison) {
  if (!comparison?.beforeId || !comparison?.afterId) return null
  const before = images.find((img) => img.id === comparison.beforeId)
  const after = images.find((img) => img.id === comparison.afterId)
  if (!before || !after) return null
  return { before, after }
}

export function findComparisonImages(images, comparison) {
  const normalized = normalizeMediaComparison(comparison)
  if (!normalized || !images?.length) return null

  const before = images.find((img) => img.id === normalized.before_id)
  const after = images.find((img) => img.id === normalized.after_id)
  if (!before || !after) return null

  return { before, after }
}

export function imagesWithoutComparison(images, comparison) {
  const pair = findComparisonImages(images, comparison)
  if (!pair) return images
  const skip = new Set([pair.before.id, pair.after.id])
  return images.filter((img) => !skip.has(img.id))
}
