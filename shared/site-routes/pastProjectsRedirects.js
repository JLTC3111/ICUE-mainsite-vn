/** Legacy past-project URLs that now enter the native React routes. */

export const PAST_PROJECTS_LIST_REDIRECTS = {
  '/src/pages/pastProjects.html': '/past-projects',
  '/legacy/pages/pastProjects.html': '/past-projects',
  '/legacy-embed/pages/pastProjects.html': '/past-projects',
  '/past-projects/': '/past-projects',
}

export const PAST_PROJECT_CARD_PATHS = [
  '/src/pages/card.html',
  '/legacy/pages/card.html',
  '/legacy-embed/pages/card.html',
]

const PAST_PROJECTS_HASH = '#/pastProjects'

export function pastProjectPath(id) {
  return `/past-projects/${id}`
}

export function resolvePastProjectRedirect(pathname, search = '', hash = '') {
  if (hash === PAST_PROJECTS_HASH) return '/past-projects'

  if (PAST_PROJECTS_LIST_REDIRECTS[pathname]) {
    return PAST_PROJECTS_LIST_REDIRECTS[pathname]
  }

  if (!PAST_PROJECT_CARD_PATHS.includes(pathname)) return null

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const id = String(params.get('id') || '').trim()
  if (/^\d+$/.test(id)) return pastProjectPath(id)
  return '/past-projects'
}
