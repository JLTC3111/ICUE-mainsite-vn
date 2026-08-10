import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchArticleTitleTranslations,
  normalizeLang,
  shouldTranslateArticle,
} from '../lib/translate'

export function useArticleTitleTranslations(articles, locale) {
  const [result, setResult] = useState({ key: '', titles: {}, subtitles: {} })
  const uiLang = normalizeLang(locale)

  const translateIds = useMemo(() => {
    if (!articles?.length) return []
    return articles
      .filter((article) => article?.id && shouldTranslateArticle(article.language, uiLang, article.title))
      .map((article) => article.id)
  }, [articles, uiLang])

  const idsKey = translateIds.join(',')
  const requestKey = idsKey ? `${uiLang}:${idsKey}` : ''

  useEffect(() => {
    if (!idsKey) return undefined

    const articleIds = idsKey.split(',')
    let active = true

    fetchArticleTitleTranslations(articleIds, uiLang)
      .then((result) => {
        if (!active) return
        setResult({
          key: requestKey,
          titles: result.titles || {},
          subtitles: result.subtitles || {},
        })
      })
      .catch(() => {
        if (!active) return
        setResult({ key: requestKey, titles: {}, subtitles: {} })
      })

    return () => {
      active = false
    }
  }, [idsKey, requestKey, uiLang])

  const isCurrent = result.key === requestKey
  const titles = useMemo(() => (isCurrent ? result.titles : {}), [isCurrent, result.titles])
  const subtitles = useMemo(
    () => (isCurrent ? result.subtitles : {}),
    [isCurrent, result.subtitles],
  )
  const pending = Boolean(requestKey && !isCurrent)

  const isTitlePending = useCallback(
    (articleId) => pending && translateIds.includes(articleId) && !titles[articleId],
    [pending, translateIds, titles],
  )

  return { titles, subtitles, isTitlePending, pending }
}
