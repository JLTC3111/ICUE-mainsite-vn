import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { DEFAULT_META, ROUTE_META_BY_PATH } from '../lib/routeMeta'

/**
 * Keeps the browser tab title and meta description in sync with the current
 * route. The static SEO shells (contact.html, about-us.html, ...) only set
 * these on the initial server-rendered load; once React Router takes over
 * for client-side navigation, nothing else touches <title> or <meta
 * name="description">, so without this the tab title stays frozen on
 * whichever page was first loaded.
 */
export default function RouteHead() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = ROUTE_META_BY_PATH[pathname] || DEFAULT_META
    document.title = meta.title

    const descriptionTag = document.querySelector('meta[name="description"]')
    if (descriptionTag) descriptionTag.setAttribute('content', meta.description)

    const canonicalTag = document.querySelector('link[rel="canonical"]')
    if (canonicalTag) {
      canonicalTag.setAttribute('href', `https://icue.vn${pathname}`)
    }
  }, [pathname])

  return null
}
