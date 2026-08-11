import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const siteRoot = path.resolve(appRoot, '..')

const FLAG_FILES = ['vn', 'gb', 'de', 'fr', 'kr', 'jp']
const PROFILE_PHOTOS = [
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
const srcFlags = path.join(siteRoot, 'public/flags')
const destFlags = path.join(appRoot, 'public/flags')
const srcProfilePhotos = path.join(siteRoot, 'public/profilePhotos')
const destProfilePhotos = path.join(appRoot, 'public/profilePhotos')

fs.mkdirSync(destFlags, { recursive: true })
fs.mkdirSync(destProfilePhotos, { recursive: true })

for (const file of FLAG_FILES) {
  const from = path.join(srcFlags, `${file}.svg`)
  const to = path.join(destFlags, `${file}.svg`)
  if (!fs.existsSync(from)) {
    console.error(`Missing flag: ${from}`)
    process.exit(1)
  }
  fs.copyFileSync(from, to)
}

for (const file of PROFILE_PHOTOS) {
  const from = path.join(srcProfilePhotos, file)
  const to = path.join(destProfilePhotos, file)
  if (!fs.existsSync(from)) {
    console.error(`Missing profile photo: ${from}`)
    process.exit(1)
  }
  fs.copyFileSync(from, to)
}

console.log(
  `Synced ${FLAG_FILES.length} flags and ${PROFILE_PHOTOS.length} profile photos into news-app/public/`,
)
