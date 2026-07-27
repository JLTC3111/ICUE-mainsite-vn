import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchArticleTitleTranslations,
  normalizeLang,
  shouldTranslateArticle,
} from '../lib/translate'

export function useArticleTitleTranslations(articles, locale) {
  const [titles, setTitles] = useState({})
  const [pending, setPending] = useState(false)
  const uiLang = normalizeLang(locale)

  const translateIds = useMemo(() => {
    if (!articles?.length) return []
    return articles
      .filter((article) => article?.id && shouldTranslateArticle(article.language, uiLang, article.title))
      .map((article) => article.id)
  }, [articles, uiLang])

  const idsKey = translateIds.join(',')

  useEffect(() => {
    if (!idsKey) {
      setTitles({})
      setPending(false)
      return undefined
    }

    const articleIds = idsKey.split(',')
    let active = true
    setTitles({})
    setPending(true)

    fetchArticleTitleTranslations(articleIds, uiLang)
      .then((result) => {
        if (active) setTitles(result.titles || {})
      })
      .catch(() => {
        if (active) setTitles({})
      })
      .finally(() => {
        if (active) setPending(false)
      })

    return () => {
      active = false
    }
  }, [idsKey, uiLang])

  const isTitlePending = useCallback(
    (articleId) => pending && translateIds.includes(articleId) && !titles[articleId],
    [pending, translateIds, titles],
  )

  return { titles, isTitlePending, pending }
}
