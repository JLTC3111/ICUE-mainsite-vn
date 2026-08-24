/**
 * Generates the blur-up placeholders the highlights gallery paints while a
 * photograph is still in flight.
 *
 * Each placeholder is the photo resized to 24px on its long edge and encoded as
 * WebP — around 200 bytes, ~270 characters of base64 — so all nine together add
 * about 2.5 KB to the JS bundle and cost no requests at all. The gallery
 * upscales one into a panel's background, which the browser smooths into a
 * blur, so a panel shows the shape and colour of its photo from the first
 * frame instead of a dark rectangle. That dark rectangle was the whole reason
 * the gallery read as "still loading" on a phone.
 *
 * Sources are the JPEG fallbacks in public/aboutUs (cwebp does not decode
 * WebP), and the file list is read out of GALLERY_PHOTOS so this cannot drift
 * from what the page renders. It is read as text rather than imported:
 * aboutUsContent.js resolves `@icue/text` through a Vite alias that plain Node
 * knows nothing about.
 *
 *   node scripts/generate-gallery-placeholders.mjs      (npm run gallery:placeholders)
 *
 * Re-run it after adding, removing or re-cropping a gallery photograph. It
 * needs `sips` (macOS) and `cwebp` (brew install webp); without them it stops
 * without touching the checked-in output.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const siteRoot = path.resolve(appRoot, '..')
const publicDir = path.join(siteRoot, 'public')
const contentFile = path.join(appRoot, 'src/data/aboutUsContent.js')
const outFile = path.join(appRoot, 'src/data/galleryPlaceholders.js')

const LONG_EDGE = 24
const QUALITY = 45

/** The `key` / `image` / `fallback` of every GALLERY_PHOTOS entry, in order. */
function readGallery() {
  const source = fs.readFileSync(contentFile, 'utf8')
  const block = source.match(/const GALLERY_PHOTOS = \[([\s\S]*?)\n\]/)
  if (!block) {
    console.error(`Could not find GALLERY_PHOTOS in ${path.relative(siteRoot, contentFile)}.`)
    process.exit(1)
  }

  const items = []
  for (const entry of block[1].split(/\}\s*,?/)) {
    const key = entry.match(/key:\s*'([^']+)'/)
    const image = entry.match(/image:\s*'([^']+)'/)
    if (!key || !image) continue
    const fallback = entry.match(/fallback:\s*'([^']+)'/)
    items.push({ key: key[1], image: image[1], fallback: fallback?.[1] })
  }
  return items
}

function requireTool(name) {
  try {
    execFileSync('/bin/sh', ['-c', `command -v ${name}`], { stdio: 'ignore' })
  } catch {
    console.error(`Missing "${name}". Install it and re-run (cwebp: brew install webp).`)
    process.exit(1)
  }
}

requireTool('sips')
requireTool('cwebp')

const gallery = readGallery()
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-lqip-'))
const entries = []

try {
  for (const item of gallery) {
    // The JPEG is the decodable source; the WebP is what the page requests and
    // what the gallery keys its lookup on.
    const source = path.join(publicDir, (item.fallback || item.image).replace(/^\//, ''))
    if (!fs.existsSync(source)) {
      console.warn(`skip ${item.key}: missing ${path.relative(siteRoot, source)}`)
      continue
    }

    const tinyJpg = path.join(tmpDir, `${item.key}.jpg`)
    const tinyWebp = path.join(tmpDir, `${item.key}.webp`)
    execFileSync('sips', ['-Z', String(LONG_EDGE), source, '--out', tinyJpg], { stdio: 'ignore' })
    execFileSync('cwebp', ['-q', String(QUALITY), '-m', '6', tinyJpg, '-o', tinyWebp], { stdio: 'ignore' })

    const base64 = fs.readFileSync(tinyWebp).toString('base64')
    entries.push({ key: item.image, base64, bytes: fs.statSync(tinyWebp).size })
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

if (!entries.length) {
  console.error('No placeholders generated; leaving the existing file alone.')
  process.exit(1)
}

const body = entries
  .map((entry) => `  '${entry.key}':\n    'data:image/webp;base64,${entry.base64}',`)
  .join('\n')

const file = `/**
 * GENERATED FILE — do not edit by hand.
 * Run \`npm run gallery:placeholders\` in home-app after changing a gallery photo.
 *
 * ${LONG_EDGE}px WebP thumbnails of the highlights gallery, keyed by the full-size
 * path they stand in for. AccordionGallery paints one as a panel's background
 * so the panel is never an empty rectangle while the photograph downloads.
 */
export const GALLERY_PLACEHOLDERS = {
${body}
}

export default GALLERY_PLACEHOLDERS
`

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, file)

const total = entries.reduce((sum, entry) => sum + entry.bytes, 0)
console.log(
  `Wrote ${entries.length} placeholders to ${path.relative(siteRoot, outFile)} (${total} bytes of image data).`,
)
