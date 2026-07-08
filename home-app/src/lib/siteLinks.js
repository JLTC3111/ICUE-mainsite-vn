/** Path-based links for the standalone home app (no hash routing). */

export const SITES = {
  vi: 'https://icue.vn',
  en: 'https://en.icue.vn',
}

export { ROUTE_PATHS } from './routes'

export function projectCardUrl(id) {
  return `${SITES.vi}/src/pages/card.html?id=${id}`
}

export function articleUrl(id) {
  return `${SITES.vi}/src/pages/article_template.html?id=${id}`
}
