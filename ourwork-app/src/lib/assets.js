/**
 * Scope photographs are synced into this app's own public/work/ by
 * scripts/sync-assets.mjs, so they must resolve against the app base
 * (/our-work/), not the site root. The site root happens to carry the same
 * files today — relying on that would break the moment the app is served from
 * anywhere else.
 */
export function assetUrl(assetPath) {
  if (!assetPath) return ''
  if (/^https?:\/\//.test(assetPath)) return assetPath
  return `${import.meta.env.BASE_URL}${assetPath.replace(/^\//, '')}`
}
