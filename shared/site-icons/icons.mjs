import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const siteRoot = fileURLToPath(new URL('../../', import.meta.url))
const siteIconDir = path.join(siteRoot, 'public', 'logoIcons')
export const SITE_ICON_COMPATIBILITY_FILES = ['favicon.png', 'favicon.ico', 'apple-touch-icon.png', 'apple-touch-icon-precomposed.png']

function siteIconSourcePath(name) {
  return path.join(siteIconDir, name)
}

function pngSizes(bytes) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) {
    throw new Error('Site PNG icons must contain valid PNG image data')
  }
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`
}

/** Content-addressed URLs also refresh mobile browsers' separate favicon caches. */
export function siteIconLinks() {
  return [
    { source: 'favicon.ico', rel: 'icon', type: 'image/x-icon', sizes: '16x16 32x32 48x48' },
    { source: 'favicon-browser.png', rel: 'icon', type: 'image/png' },
    { source: 'apple-touch-icon.png', rel: 'apple-touch-icon' },
  ].map(icon => {
    const bytes = fs.readFileSync(siteIconSourcePath(icon.source))
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
    const extension = path.extname(icon.source)
    const sizes = icon.sizes ?? pngSizes(bytes)
    if (icon.type === 'image/png' && new Set(sizes.split('x')).size !== 1) {
      throw new Error('The explicit browser PNG favicon must be square')
    }
    return {
      ...icon,
      sizes,
      file: `${path.basename(icon.source, extension)}-${hash}${extension}`,
    }
  })
}

export function siteIconFiles() {
  return [...SITE_ICON_COMPATIBILITY_FILES, ...siteIconLinks().map(icon => icon.file)]
}

export function updateSiteIconHead(file) {
  const links = siteIconLinks().map(icon => {
    const type = icon.type ? ` type="${icon.type}"` : ''
    return `    <link rel="${icon.rel}"${type} href="/${icon.file}" sizes="${icon.sizes}" />`
  }).join('\n')
  const original = fs.readFileSync(file, 'utf8')
  const iconTags = /^[ \t]*<link\b[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>[ \t]*(?:\r?\n|$)/gm
  let replaced = false
  const updated = original.replace(iconTags, () => {
    if (replaced) return ''
    replaced = true
    return `${links}\n`
  }).replace(/(rel="apple-touch-icon"[^>]*>\n)(?:[ \t]*\n)+/g, '$1')
  if (!replaced) throw new Error(`Missing icon declaration in ${file}`)
  if (updated !== original) fs.writeFileSync(file, updated)
}

/** Copy public/logoIcons icons to each app root so browsers can still request /favicon.ico. */
export function syncSiteIcons(appRoot) {
  const publicDir = path.join(appRoot, 'public')
  fs.mkdirSync(publicDir, { recursive: true })
  for (const source of SITE_ICON_COMPATIBILITY_FILES) {
    fs.copyFileSync(siteIconSourcePath(source), path.join(publicDir, source))
  }
  for (const icon of siteIconLinks()) {
    fs.copyFileSync(siteIconSourcePath(icon.source), path.join(publicDir, icon.file))
  }
  updateSiteIconHead(path.join(appRoot, 'index.html'))
}
