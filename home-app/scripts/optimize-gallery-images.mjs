import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const siteRoot = path.resolve(__dirname, '../..')
const aboutDir = path.join(siteRoot, 'public/aboutUs')

const GALLERY_JPGS = [
  'UN-Habitat-HealthBridge.jpg',
  'laocai.jpg',
  'hoithaokhoahoc.jpg',
  'conference_nov5_2025.jpg',
  'dubai_2025_1.jpg',
  'dubai_2025_2.jpg',
  'dubai_2025_3.jpg',
  'dubai_2025_4.jpg',
  'dubai_2025_5.jpg',
]

const MAX_EDGE = 960
const WEBP_QUALITY = 82

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit' })
}

for (const file of GALLERY_JPGS) {
  const src = path.join(aboutDir, file)
  if (!fs.existsSync(src)) {
    console.warn(`skip missing ${file}`)
    continue
  }

  const base = file.replace(/\.jpg$/i, '')
  const opt = path.join(aboutDir, `${base}.opt.jpg`)
  const webp = path.join(aboutDir, `${base}.webp`)

  run('sips', ['-Z', String(MAX_EDGE), src, '--out', opt])
  fs.renameSync(opt, src)
  run('cwebp', ['-q', String(WEBP_QUALITY), '-m', '6', src, '-o', webp])
  console.log(`optimized ${file} -> ${base}.webp`)
}

console.log('Gallery images optimized in public/aboutUs (run npm run sync-assets in home-app to copy).')
