import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchArticleTranslation,
  fetchArticleTitleTranslations,
  clearPublicTranslateCache,
} from '../lib/publicTranslate'
import { usePageResume } from './usePageResume'
import {
  normalizeLang,
  shouldTranslateArticle,
} from '../lib/translateUtils'

const EMPTY = {}

/** Fold a finished lookup into the store, dropping it if the locale moved on. */
function mergeLookup(current, lang, ids, result, revision, failed = false) {
  const base = current.lang === lang
    ? current
    : { lang, titles: EMPTY, subtitles: EMPTY, resolved: EMPTY }
  const resolved = { ...base.resolved }
  for (const id of ids) resolved[id] = revision
  const titles = { ...base.titles }
  const subtitles = { ...base.subtitles }
  if (!failed) for (const id of ids) { delete titles[id]; delete subtitles[id] }
  return {
    lang,
    titles: { ...titles, ...(result.titles || EMPTY) },
    subtitles: { ...subtitles, ...(result.subtitles || EMPTY) },
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
  clearCache = clearPublicTranslateCache,
) {
  const uiLang = normalizeLang(locale)
  const [revision, setRevision] = useState(0)
  usePageResume(() => {
    clearCache()
    setRevision((value) => value + 1)
  }, { minHiddenMs: 0 })
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
      if (!isCurrentLang || store.resolved[id] !== revision) missing.push(id)
    }
    return missing.join(',')
  }, [needsTranslation, isCurrentLang, store.resolved, revision])

  useEffect(() => {
    if (!uiLang || !missingKey) return undefined

    const ids = missingKey.split(',')
    let active = true

    fetchTitles(ids, uiLang)
      .then((result) => {
        if (active) setStore((current) => mergeLookup(current, uiLang, ids, result, revision))
      })
      .catch(() => {
        // Avoid a render/request loop, but retry this failed lookup on the
        // next resume/reconnect. Keep any previously translated headlines.
        if (active) setStore((current) => mergeLookup(current, uiLang, ids, EMPTY, revision, true))
      })

    return () => { active = false }
  }, [fetchTitles, missingKey, uiLang, revision])

  const titles = isCurrentLang ? store.titles : EMPTY
  const subtitles = isCurrentLang ? store.subtitles : EMPTY
  const pending = Boolean(missingKey)

  // Per-article, not global: an article whose lookup already came back keeps its
  // headline while other articles in the same list are still being fetched.
  const isTitlePending = useCallback((articleId) => {
    const id = String(articleId)
    return needsTranslation.has(id) && !(isCurrentLang && (store.resolved[id] === revision || store.titles[id]))
  }, [needsTranslation, isCurrentLang, store.resolved, store.titles, revision])

  return { titles, subtitles, isTitlePending, pending }
}

/** Full selected-locale text for the one article that owns the grid excerpt. */
export function useArticlePreviewTranslation(article, locale) {
  const [revision, setRevision] = useState(0)
  usePageResume(() => {
    clearPublicTranslateCache(article?.id, locale)
    setRevision((value) => value + 1)
  }, { minHiddenMs: 0 })
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
        if (active) setResult((current) => current.key === requestKey ? current : { key: requestKey, translation: null })
      })

    return () => {
      active = false
    }
  }, [article?.id, requestKey, uiLang, revision])

  const isCurrent = result.key === requestKey
  return {
    translation: isCurrent ? result.translation : null,
    pending: Boolean(requestKey && !isCurrent),
  }
}
