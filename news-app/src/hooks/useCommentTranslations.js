import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  normalizeLang,
  shouldTranslateComment,
  translateCommentsViaApi,
} from '../lib/translate'

export function useCommentTranslations(comments, locale, showOriginal = false) {
  const [bodies, setBodies] = useState({})
  const [pending, setPending] = useState(false)
  const uiLang = normalizeLang(locale)

  const translateIds = useMemo(() => {
    if (!comments?.length) return []
    return comments
      .filter((comment) => comment?.id && shouldTranslateComment(comment.body, uiLang))
      .map((comment) => comment.id)
  }, [comments, uiLang])

  const idsKey = translateIds.join(',')
  const canToggleTranslation = translateIds.length > 0 && (!pending || showOriginal)

  useEffect(() => {
    if (!idsKey) {
      setBodies({})
      setPending(false)
      return undefined
    }

    const commentIds = idsKey.split(',')
    let active = true
    setBodies({})
    setPending(true)

    translateCommentsViaApi(commentIds, uiLang)
      .then((result) => {
        if (active) setBodies(result.bodies || {})
      })
      .catch(() => {
        if (active) setBodies({})
      })
      .finally(() => {
        if (active) setPending(false)
      })

    return () => {
      active = false
    }
  }, [idsKey, uiLang])

  const isBodyPending = useCallback(
    (commentId) => !showOriginal && pending && translateIds.includes(commentId) && !bodies[commentId],
    [pending, translateIds, bodies, showOriginal],
  )

  const displayBody = useCallback(
    (comment) => {
      if (!comment?.body) return ''
      if (isBodyPending(comment.id)) return null
      if (showOriginal || !translateIds.includes(comment.id)) return comment.body
      return bodies[comment.id] || comment.body
    },
    [bodies, isBodyPending, showOriginal, translateIds],
  )

  return {
    bodies,
    isBodyPending,
    displayBody,
    pending,
    canToggleTranslation,
    translationLang: canToggleTranslation ? uiLang : null,
  }
}
