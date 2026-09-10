/** Partner logos and listing-card shells for `/news-archive`. */

import { withLocale } from '../../../shared/site-routes/mainSitePaths.js'

export { NEWS_ARCHIVE_LOGOS } from './newsArchive/shell.js'
export {
  NEWS_ARCHIVE_CARD_SHELL as NEWS_ARCHIVE_CARDS,
  getLocalizedCards,
  getNewsArchiveCard,
} from './newsArchive/resolve.js'

export const NEWS_SLIDER_STORAGE_KEY = 'newsSliderIndex'

export function newsArchiveListPath(lang) {
  return lang ? withLocale('/news-archive', lang) : '/news-archive'
}

export function newsArchiveArticlePath(id, lang) {
  const path = `/news-archive/${id}`
  return lang ? withLocale(path, lang) : path
}

export function isArchiveVideo(item) {
  if (!item) return false
  if (item.type === 'video') return true
  return /\.(mp4|mov|webm|avi|mkv)(?:$|\?)/i.test(item.src || '')
}

export function readNewsSliderIndex(cardCount) {
  let stored = '0'
  try {
    stored = localStorage.getItem(NEWS_SLIDER_STORAGE_KEY) || '0'
  } catch {
    stored = '0'
  }
  const raw = parseInt(stored, 10)
  if (Number.isNaN(raw)) return 0
  return Math.max(0, Math.min(cardCount - 1, raw))
}

export function saveNewsSliderIndex(index) {
  try {
    localStorage.setItem(NEWS_SLIDER_STORAGE_KEY, String(index))
  } catch {
    // Carousel navigation should still work when storage is unavailable.
  }
}
