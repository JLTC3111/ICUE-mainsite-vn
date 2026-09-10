import viCopy from './copy/vi.js'
import {
  NEWS_ARCHIVE_ARTICLE_SHELL,
  NEWS_ARCHIVE_CARD_SHELL,
} from './shell.js'
import { formatArchiveDate, pickCopy } from './lang.js'

export function localizeArticle(shell, copy, fallbackCopy = viCopy) {
  if (!shell) return null
  const local = copy?.articles?.[shell.id] || {}
  const fallback = fallbackCopy?.articles?.[shell.id] || {}
  const captions = Array.isArray(local.captions) ? local.captions : fallback.captions || []
  const fallbackCaptions = fallback.captions || []
  const lang = copy?.lang || fallbackCopy?.lang || 'vi'

  return {
    ...shell,
    title: pickCopy(local.title, fallback.title),
    lead: pickCopy(local.lead, fallback.lead),
    author: pickCopy(local.author, fallback.author),
    bodyMarkdown: pickCopy(local.bodyMarkdown, fallback.bodyMarkdown),
    pdfButtonText: pickCopy(local.pdfButtonText, fallback.pdfButtonText),
    date: formatArchiveDate(shell.dateIso, lang),
    images: (shell.images || []).map((image, index) => ({
      ...image,
      caption: pickCopy(captions[index], fallbackCaptions[index] || ''),
    })),
  }
}

export function localizeCard(shell, copy, fallbackCopy = viCopy, lang = 'vi') {
  if (!shell) return null
  const local = copy?.cards?.[shell.id] || {}
  const fallback = fallbackCopy?.cards?.[shell.id] || {}
  return {
    ...shell,
    title: pickCopy(local.title, fallback.title),
    description: pickCopy(local.description, fallback.description),
    location: pickCopy(local.location, fallback.location),
    date: formatArchiveDate(shell.dateIso, lang),
  }
}

export function getLocalizedCards(copy, lang = 'vi', fallbackCopy = viCopy) {
  return NEWS_ARCHIVE_CARD_SHELL.map((shell) => localizeCard(shell, copy, fallbackCopy, lang))
}

export function getNewsArchiveArticle(articleId, copy, fallbackCopy = viCopy) {
  const shell = NEWS_ARCHIVE_ARTICLE_SHELL.find((article) => article.id === String(articleId))
  return localizeArticle(shell, copy, fallbackCopy)
}

export function getAdjacentNewsArchiveArticles(articleId) {
  const index = NEWS_ARCHIVE_ARTICLE_SHELL.findIndex((article) => article.id === String(articleId))
  if (index < 0) return { previous: null, next: null }
  return {
    previous: NEWS_ARCHIVE_ARTICLE_SHELL[index - 1] || null,
    next: NEWS_ARCHIVE_ARTICLE_SHELL[index + 1] || null,
  }
}

export function getNewsArchiveCard(articleId, copy, lang = 'vi', fallbackCopy = viCopy) {
  const shell = NEWS_ARCHIVE_CARD_SHELL.find((card) => card.id === String(articleId))
  return localizeCard(shell, copy, fallbackCopy, lang)
}

export { NEWS_ARCHIVE_ARTICLE_SHELL, NEWS_ARCHIVE_CARD_SHELL }
