import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const siteRoot = path.resolve(__dirname, '../..')

const COVER_WIDTHS = [480, 960]
const GALLERY_WIDTHS = [960]
const LOGO_WIDTHS = [220, 440]
const WEBP_QUALITY = 80
const VARIANT_NAME = /-\d+\.webp$/i

const COVERS = [
  'public/news/articles/card_4.jpg',
  'public/news/articles/Card_1.webp',
  'public/news/articles/card_9.jpg',
  'public/news/articles/Card_3.jpg',
  'public/news/articles/Card_2.webp',
  'public/news/articles/card_8.jpg',
  'public/news/articles/card_6.jpg',
  'public/news/articles/card_7.jpg',
  'public/news/articles/card_5.jpg',
  'public/pastProjects/pp_1.webp',
  'public/pastProjects/pp_2.jpg',
  'public/pastProjects/pp_3.webp',
  'public/pastProjects/pp_4.jpg',
  'public/pastProjects/pp_5.jpg',
  'public/pastProjects/pp_6.jpg',
  'public/pastProjects/pp_7.jpg',
  'public/pastProjects/pp_8.jpg',
  'public/pastProjects/pp_9.jpg',
  'public/work/ourWork_img1.webp',
  'public/work/ourWork_img2.webp',
  'public/work/ourWork_img3.webp',
  'public/work/ourWork_img4.jpg',
]

const LOGOS = [
  'public/news/logos/greenviet_logo.png',
  'public/news/logos/srd_logo.png',
  'public/news/logos/L&L_logo.png',
  'public/news/logos/iki_logo.png',
  'public/news/logos/giz_logo.png',
  'public/news/logos/cecr_logo.png',
  'public/news/logos/ccd_logo.png',
  'public/news/logos/rocha_logo.png',
  'public/news/logos/viup_logo.png',
]

function pixelWidth(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', file], { encoding: 'utf8' })
  return Number(out.match(/pixelWidth:\s+(\d+)/)?.[1] || 0)
}

function writeVariant(src, dest, width) {
  execFileSync(
    'cwebp',
    ['-q', String(WEBP_QUALITY), '-m', '4', '-resize', String(width), '0', src, '-o', dest],
    { stdio: 'pipe' },
  )
}

function optimize(rel, widths) {
  const src = path.join(siteRoot, rel)
  if (!fs.existsSync(src)) {
    console.warn(`skip missing ${rel}`)
    return
  }

  const width = pixelWidth(src)
  const destBase = src.replace(/\.(jpe?g|png|webp)$/i, '')
  for (const variant of widths) {
    if (width <= variant) continue
    const dest = `${destBase}-${variant}.webp`
    writeVariant(src, dest, variant)
    console.log(`${rel} -> ${path.basename(dest)} (${variant}w)`)
  }
}

function galleryRels() {
  const dir = path.join(siteRoot, 'public/pastProjects')
  const rels = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('project_')) continue
    const folder = path.join(dir, entry.name)
    for (const name of fs.readdirSync(folder)) {
      if (!/\.(jpe?g|png|webp)$/i.test(name) || VARIANT_NAME.test(name)) continue
      rels.push(`public/pastProjects/${entry.name}/${name}`)
    }
  }
  return rels
}

function copyGalleryVariant(rel, variant) {
  const src = path.join(siteRoot, rel)
  const destName = path.basename(src).replace(/\.(jpe?g|png|webp)$/i, `-${variant}.webp`)
  const from = path.join(path.dirname(src), destName)
  if (!fs.existsSync(from)) return
  const pagesDest = path.join(
    siteRoot,
    'src/pages/public/pastProjects',
    path.basename(path.dirname(rel)),
    destName,
  )
  fs.mkdirSync(path.dirname(pagesDest), { recursive: true })
  fs.copyFileSync(from, pagesDest)
}

for (const rel of COVERS) optimize(rel, COVER_WIDTHS)
for (const rel of galleryRels()) {
  optimize(rel, GALLERY_WIDTHS)
  for (const variant of GALLERY_WIDTHS) copyGalleryVariant(rel, variant)
}
for (const rel of LOGOS) optimize(rel, LOGO_WIDTHS)
console.log('Card/logo/gallery variants written beside the originals (run home-app sync-assets to copy).')
