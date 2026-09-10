import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HOME_BG_VIDEOS, HOME_MODELS } from './deployMedia.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const siteRoot = path.resolve(appRoot, '..')

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Missing directory: ${src}`)
    process.exit(1)
  }
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(from, to)
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

function copyAllowlistedFiles(srcDir, destDir, files) {
  fs.rmSync(destDir, { recursive: true, force: true })
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of files) {
    const from = path.join(srcDir, file)
    if (!fs.existsSync(from)) {
      console.error(`Missing file: ${from}`)
      process.exit(1)
    }
    copyFile(from, path.join(destDir, file))
  }
}

const ASSET_DIRS = [
  'aboutUs',
  'certs',
  'pastProjects',
  'work',
  // Full news tree: article photos + partner logos used by the archive page
  'news',
  'logoIcons',
  'flags',
]

// Home React uses the 540/720 playlist plus the title mask clip. Unused files
// stay in the repo source trees — see deployMedia.mjs.

for (const rel of ASSET_DIRS) {
  copyDir(path.join(siteRoot, 'public', rel), path.join(appRoot, 'public', rel))
}

copyAllowlistedFiles(
  path.join(siteRoot, 'public', 'bgVideos'),
  path.join(appRoot, 'public', 'bgVideos'),
  HOME_BG_VIDEOS,
)
copyAllowlistedFiles(
  path.join(siteRoot, 'public', 'models'),
  path.join(appRoot, 'public', 'models'),
  HOME_MODELS,
)

// Card detail galleries live under src/pages/public/pastProjects/project_*.
// Merge them into public/pastProjects so /public/pastProjects/project_N/* resolves in production.
const cardGalleriesSrc = path.join(siteRoot, 'src/pages/public/pastProjects')
const cardGalleriesDest = path.join(siteRoot, 'public/pastProjects')
const cardGalleriesAppDest = path.join(appRoot, 'public/pastProjects')
if (fs.existsSync(cardGalleriesSrc)) {
  for (const entry of fs.readdirSync(cardGalleriesSrc, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('project_')) continue
    copyDir(path.join(cardGalleriesSrc, entry.name), path.join(cardGalleriesDest, entry.name))
    copyDir(path.join(cardGalleriesSrc, entry.name), path.join(cardGalleriesAppDest, entry.name))
  }
}

// Click-to-download only (article 1 speech, article 3 photo zip). Nothing
// on the page prefetches these; they still have to live on this origin
// because the archive links are same-host `/files/...` paths.
for (const file of ['speech.pdf', 'photos.zip']) {
  copyFile(
    path.join(siteRoot, 'public/files', file),
    path.join(appRoot, 'public/files', file),
  )
}

fs.rmSync(path.join(appRoot, 'public/legacy'), { recursive: true, force: true })
fs.rmSync(path.join(appRoot, 'public/legacy-embed'), { recursive: true, force: true })
fs.rmSync(path.join(appRoot, 'public/src'), { recursive: true, force: true })
copyFile(path.join(siteRoot, '_redirects'), path.join(appRoot, 'public/_redirects'))
copyFile(
  path.join(siteRoot, 'public/logoIcons/favicon.png'),
  path.join(appRoot, 'public/logoIcons/favicon.png'),
)

console.log(
  `Synced home-app assets: ${ASSET_DIRS.join(', ')}, ${HOME_BG_VIDEOS.length} bg videos, ${HOME_MODELS.length} models, card galleries, and redirects`,
)
