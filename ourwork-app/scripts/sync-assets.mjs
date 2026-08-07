import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const siteRoot = path.resolve(appRoot, '..')

/** The four scope photographs. 1B introduces no new images. */
const WORK_IMAGES = [
  'ourWork_img1.webp',
  'ourWork_img2.webp',
  'ourWork_img3.webp',
  'ourWork_img4.webp',
]

const FLAG_FILES = ['vn', 'gb', 'de', 'fr', 'kr', 'jp']

const srcWork = path.join(siteRoot, 'public/work')
const destWork = path.join(appRoot, 'public/work')
const srcFlags = path.join(siteRoot, 'public/flags')
const destFlags = path.join(appRoot, 'public/flags')
const srcFavicon = path.join(siteRoot, 'public/logoIcons/favicon.png')
const destFavicon = path.join(appRoot, 'public/favicon.png')

fs.mkdirSync(destWork, { recursive: true })
fs.mkdirSync(destFlags, { recursive: true })

function copyRequired(from, to, label) {
  if (!fs.existsSync(from)) {
    console.error(`Missing ${label}: ${from}`)
    process.exit(1)
  }
  fs.copyFileSync(from, to)
}

for (const file of WORK_IMAGES) {
  copyRequired(path.join(srcWork, file), path.join(destWork, file), 'scope image')
}

for (const file of FLAG_FILES) {
  copyRequired(path.join(srcFlags, `${file}.svg`), path.join(destFlags, `${file}.svg`), 'flag')
}

copyRequired(srcFavicon, destFavicon, 'favicon')

console.log(
  `Synced ${WORK_IMAGES.length} scope images, ${FLAG_FILES.length} flags, and favicon into ourwork-app/public/`,
)
