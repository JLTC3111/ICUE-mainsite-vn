import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDocumentMeta } from '@icue/site-meta/useDocumentMeta'
import {
  absoluteLocaleUrl,
  hreflangAlternates,
} from '../../../shared/site-routes/mainSitePaths.js'
import { getPastProject } from '../data/pastProjectsContent'
import { getNewsArchiveArticleMeta } from '../data/newsArchiveMeta'
import { DEFAULT_META, ROUTE_META, ROUTE_META_BY_PATH } from '../lib/routeMeta'
import { ROUTE_PATHS } from '../lib/routes'

function localizeMeta(entry, t) {
  if (!entry) return localizeMeta(DEFAULT_META, t)
  if (!entry.metaKey) return entry
  return {
    ...entry,
    title: t(`meta.${entry.metaKey}.title`, { defaultValue: entry.title }),
    description: t(`meta.${entry.metaKey}.description`, { defaultValue: entry.description }),
  }
}

function normalizedPath(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

function isNewsArchivePath(pathname) {
  return pathname === ROUTE_PATHS.newsArchive || pathname.startsWith(`${ROUTE_PATHS.newsArchive}/`)
}

function metaForPath(pathname, t, lang) {
  const normalized = normalizedPath(pathname)
  const exact = ROUTE_META_BY_PATH[normalized]
  if (exact) return localizeMeta(exact, t)

  if (normalized.startsWith(`${ROUTE_PATHS.pastProjects}/`)) {
    const project = getPastProject(normalized.slice(ROUTE_PATHS.pastProjects.length + 1))
    const listing = ROUTE_META.find((entry) => entry.path === ROUTE_PATHS.pastProjects)
    if (project) {
      const title = t(`projects.items.${project.key}.title`)
      const description = t(`projects.items.${project.key}.body`)
      return {
        title: t('meta.pastProjects.itemTitle', {
          title,
          defaultValue: `${title} | ICUE Vietnam`,
        }),
        description,
      }
    }
    return localizeMeta(listing || DEFAULT_META, t)
  }

  if (normalized.startsWith(`${ROUTE_PATHS.newsArchive}/`)) {
    const article = getNewsArchiveArticleMeta(normalized.slice(ROUTE_PATHS.newsArchive.length + 1), lang)
    const listing = ROUTE_META.find((entry) => entry.path === ROUTE_PATHS.newsArchive)
    if (article) {
      return {
        title: t('meta.newsArchive.itemTitle', {
          title: article.title,
          defaultValue: `${article.title} | ICUE Vietnam`,
        }),
        description: article.lead || listing?.description,
      }
    }
    return localizeMeta(listing || DEFAULT_META, t)
  }

  return localizeMeta(DEFAULT_META, t)
}

function syncArchiveHeadLinks(pathname, lang) {
  const canonicalHref = isNewsArchivePath(pathname)
    ? absoluteLocaleUrl(pathname, lang)
    : `https://icue.vn${pathname === '/' ? '/' : pathname}`
  const canonicalTag = document.querySelector('link[rel="canonical"]')
  if (canonicalTag) canonicalTag.setAttribute('href', canonicalHref)
  const ogUrl = document.querySelector('meta[property="og:url"]')
  if (ogUrl) ogUrl.setAttribute('content', canonicalHref)

  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => node.remove())
  if (!isNewsArchivePath(pathname)) return

  const head = document.head
  for (const { hreflang, href } of hreflangAlternates(pathname)) {
    const link = document.createElement('link')
    link.setAttribute('rel', 'alternate')
    link.setAttribute('hreflang', hreflang)
    link.setAttribute('href', href)
    link.setAttribute('data-icue-hreflang', '')
    head.appendChild(link)
  }
}

/**
 * Keeps the browser tab title and meta description in sync with the current
 * route and UI language. The static SEO shells only set Vietnamese strings on
 * the first HTML response; once React takes over, this rewrites them.
 *
 * Look the strings up during render. Lazy locales (ko, ja, de, fr) load after
 * `lng` is already set, so depending on `lang` would leave the Vietnamese
 * fallback in the tab.
 */
export default function RouteHead() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const lang = i18n.language || i18n.resolvedLanguage || 'vi'
  const path = normalizedPath(pathname)
  const meta = metaForPath(pathname, t, lang)

  useDocumentMeta({
    title: meta.title,
    description: meta.description,
  })

  useEffect(() => {
    syncArchiveHeadLinks(path, lang)
  }, [path, lang])

  return null
}
