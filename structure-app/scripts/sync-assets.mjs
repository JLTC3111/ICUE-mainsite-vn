import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const siteRoot = path.resolve(appRoot, '..')

const PHOTOS = [
  'hanhnguyenorgstructure.png',
  'tranthilananhorgstructure.png',
  'tranquoctoanorgstructure.png',
  'tamorgstructure.png',
  'longdoorgstructure.png',
  'hienorgstructure.png',
  'tinhorgstructure.png',
  'lyicueorgstructure.png',
  'lylyorgstructure.png',
  'duongorgstructure.png',
]

const FLAG_FILES = ['vn', 'gb', 'de', 'fr', 'kr', 'jp']

const srcPhotos = path.join(siteRoot, 'public/profilePhotos')
const destPhotos = path.join(appRoot, 'public/profilePhotos')
const srcFavicon = path.join(siteRoot, 'public/logoIcons/favicon.png')
const destFavicon = path.join(appRoot, 'public/favicon.png')
const srcFlags = path.join(siteRoot, 'public/flags')
const destFlags = path.join(appRoot, 'public/flags')

fs.mkdirSync(destPhotos, { recursive: true })
fs.mkdirSync(destFlags, { recursive: true })

for (const file of PHOTOS) {
  const from = path.join(srcPhotos, file)
  const to = path.join(destPhotos, file)
  if (!fs.existsSync(from)) {
    console.error(`Missing profile photo: ${from}`)
    process.exit(1)
  }
  fs.copyFileSync(from, to)
}

if (!fs.existsSync(srcFavicon)) {
  console.error(`Missing favicon: ${srcFavicon}`)
  process.exit(1)
}
fs.copyFileSync(srcFavicon, destFavicon)

for (const file of FLAG_FILES) {
  const from = path.join(srcFlags, `${file}.svg`)
  const to = path.join(destFlags, `${file}.svg`)
  if (!fs.existsSync(from)) {
    console.error(`Missing flag: ${from}`)
    process.exit(1)
  }
  fs.copyFileSync(from, to)
}

console.log(
  `Synced ${PHOTOS.length} org-structure photos, ${FLAG_FILES.length} flags, and favicon into structure-app/public/`,
)
