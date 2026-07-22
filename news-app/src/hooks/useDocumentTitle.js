import { useEffect } from 'react'

const SITE_NAME = 'ICUE News'

export function useDocumentTitle(pageTitle) {
  useEffect(() => {
    if (!pageTitle) return undefined
    document.title = `${pageTitle} · ${SITE_NAME}`
    return undefined
  }, [pageTitle])
}
