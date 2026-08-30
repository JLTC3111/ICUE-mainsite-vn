import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchArticleTranslation,
  fetchArticleTitleTranslations,
} from '../lib/publicTranslate'
import {
  normalizeLang,
  shouldTranslateArticle,
} from '../lib/translateUtils'

const EMPTY = {}

/** Fold a finished lookup into the store, dropping it if the locale moved on. */
function mergeLookup(current, lang, ids, result) {
  const base = current.lang === lang
    ? current
    : { lang, titles: EMPTY, subtitles: EMPTY, resolved: EMPTY }
  const resolved = { ...base.resolved }
  for (const id of ids) resolved[id] = true
  return {
    lang,
    titles: { ...base.titles, ...(result.titles || EMPTY) },
    subtitles: { ...base.subtitles, ...(result.subtitles || EMPTY) },
    resolved,
  }
}

/**
 * Stored title/subtitle translations for a list of articles.
 *
 * The store is cumulative per locale, and each lookup asks only for the ids it
 * has not seen yet. That matters most for the newsroom's live search: the
 * visible list is rebuilt on every keystroke, and a store keyed to the current
 * list would blank every headline it had already translated — and re-request the
 * ones that come back into view — each time a character lands.
 */
export function useArticleTitleTranslations(
  articles,
  locale,
  fetchTitles = fetchArticleTitleTranslations,
) {
  const uiLang = normalizeLang(locale)
  const [store, setStore] = useState(
    () => ({ lang: uiLang, titles: EMPTY, subtitles: EMPTY, resolved: EMPTY }),
  )

  const needsTranslation = useMemo(() => {
    const ids = new Set()
    for (const article of articles || []) {
      if (article?.id && shouldTranslateArticle(article.language, uiLang, article.title)) {
        ids.add(String(article.id))
      }
    }
    return ids
  }, [articles, uiLang])

  const isCurrentLang = store.lang === uiLang
  // Serialized so the effect below re-runs on a change of contents rather than
  // of array identity.
  const missingKey = useMemo(() => {
    const missing = []
    for (const id of needsTranslation) {
      if (!isCurrentLang || !store.resolved[id]) missing.push(id)
    }
    return missing.join(',')
  }, [needsTranslation, isCurrentLang, store.resolved])

  useEffect(() => {
    if (!uiLang || !missingKey) return undefined

    const ids = missingKey.split(',')
    let active = true

    fetchTitles(ids, uiLang)
      .then((result) => {
        if (active) setStore((current) => mergeLookup(current, uiLang, ids, result))
      })
      .catch(() => {
        // Record the ids as looked-up regardless. A failure is indistinguishable
        // from "nothing stored" to the reader, and leaving them missing would
        // re-fire the request on the next keystroke.
        if (active) setStore((current) => mergeLookup(current, uiLang, ids, EMPTY))
      })

    return () => { active = false }
  }, [fetchTitles, missingKey, uiLang])

  const titles = isCurrentLang ? store.titles : EMPTY
  const subtitles = isCurrentLang ? store.subtitles : EMPTY
  const pending = Boolean(missingKey)

  // Per-article, not global: an article whose lookup already came back keeps its
  // headline while other articles in the same list are still being fetched.
  const isTitlePending = useCallback((articleId) => {
    const id = String(articleId)
    return needsTranslation.has(id) && !(isCurrentLang && store.resolved[id])
  }, [needsTranslation, isCurrentLang, store.resolved])

  return { titles, subtitles, isTitlePending, pending }
}

/** Full selected-locale text for the one article that owns the grid excerpt. */
export function useArticlePreviewTranslation(article, locale) {
  const [result, setResult] = useState({ key: '', translation: null })
  const uiLang = normalizeLang(locale)
  const needsTranslation = Boolean(
    article?.id && shouldTranslateArticle(article.language, uiLang, article.title),
  )
  const requestKey = needsTranslation ? `${article.id}:${uiLang}` : ''

  useEffect(() => {
    if (!requestKey) return undefined

    let active = true
    fetchArticleTranslation(article.id, uiLang)
      .then((translation) => {
        if (!active) return
        setResult({
          key: requestKey,
          translation: translation.original ? null : translation,
        })
      })
      .catch(() => {
        if (active) setResult({ key: requestKey, translation: null })
      })

    return () => {
      active = false
    }
  }, [article?.id, requestKey, uiLang])

  const isCurrent = result.key === requestKey
  return {
    translation: isCurrent ? result.translation : null,
    pending: Boolean(requestKey && !isCurrent),
  }
}
