import { normalizeUiLocale, SITES, withLocale } from './mainSitePaths.js'

/** Customer CTAs enter the checked chatroom route, including its sign-in gate.
 * Keep local/preview navigation local; the English home hands off to the
 * Vietnamese host, which owns the newsroom and customer authentication. */
export function customerChatroomUrl(locale = 'vi', sourceOrigin = typeof window === 'undefined' ? SITES.vi : window.location.origin) {
  const path = withLocale('/newsroom/chatrooms', normalizeUiLocale(locale, 'vi'))
  return sourceOrigin === SITES.en ? `${SITES.vi}${path}` : path
}
