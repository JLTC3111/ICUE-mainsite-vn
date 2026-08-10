/**
 * Media captions (`article_media.info`) are AUTHOR-WRITTEN CONTENT, not UI chrome.
 *
 * A caption is free text the editor types per media item — "Ảnh Tạo Bởi A.I",
 * "Source: Joby Aviation website". The word "Source:" is part of that authored
 * string; there is no separate label and no i18n key for it. Captions must never
 * be passed through t(): you cannot key arbitrary author prose. Their translated
 * versions are authored per locale and stored in article_translations.media.
 *
 * REGRESSION GUARD — read before changing this file:
 * The gallery list MUST always be derived from the original media. A translation
 * row only ever overlays caption text on top of it. Deriving the list from the
 * translated array instead caused two silent production failures:
 *
 *   1. A translation row with `media: []` made the whole gallery vanish, because
 *      `translated?.filter(...) || originals` returns the empty array — `[]` is
 *      truthy, so the fallback never fired.
 *   2. Legacy rows with blank caption strings rendered no caption at all, since
 *      `{info && <figcaption/>}` hides an empty string, instead of falling back
 *      to the caption the author actually wrote.
 *
 * Both failed with no console error. See mediaTranslations.test.js.
 */

// Keep authoring and translation inputs aligned. The database stores these
// values as text/JSONB, so this is a UI guard rather than a schema constraint.
export const MEDIA_CAPTION_MAX_LENGTH = 1000

/**
 * Overlay translated captions onto the original media list.
 *
 * @param {Array} originals  media rows from the article (source of truth)
 * @param {Array|null} translated  media entries from article_translations.media
 * @returns {Array} originals, with `info` replaced only where a non-empty
 *                  translated caption exists. Never shorter than `originals`.
 */
export function applyMediaCaptions(originals = [], translated = null) {
  const list = Array.isArray(originals) ? originals : []
  if (!Array.isArray(translated) || translated.length === 0) return list

  const byId = new Map()
  for (const entry of translated) {
    if (entry && entry.id != null) byId.set(String(entry.id), entry)
  }

  return list.map((item) => {
    const match = byId.get(String(item?.id))
    const caption = typeof match?.info === 'string' ? match.info.trim() : ''
    // Blank translated caption → keep the author's original caption rather than
    // rendering nothing.
    return caption ? { ...item, info: caption } : item
  })
}

/**
 * Media items that have an authored caption but no usable translated one.
 * Callers log this in development so a missing caption translation is visible
 * instead of failing silently.
 */
export function findUntranslatedCaptions(originals = [], translated = null) {
  const list = Array.isArray(originals) ? originals : []
  const byId = new Map()
  for (const entry of Array.isArray(translated) ? translated : []) {
    if (entry && entry.id != null) byId.set(String(entry.id), entry)
  }

  return list.filter((item) => {
    const original = typeof item?.info === 'string' ? item.info.trim() : ''
    if (!original) return false
    const caption = byId.get(String(item?.id))?.info
    return !(typeof caption === 'string' && caption.trim())
  })
}
