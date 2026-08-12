import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const siteRoot = path.resolve(appRoot, '..')

function copyDir(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing shared asset directory: ${source}`)
  }

  fs.mkdirSync(destination, { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(destination, entry.name)
    if (entry.isDirectory()) copyDir(from, to)
    else fs.copyFileSync(from, to)
  }
}

for (const directory of ['bgVideos', 'flags', 'logoIcons']) {
  copyDir(
    path.join(siteRoot, 'public', directory),
    path.join(appRoot, 'public', directory),
  )
}

console.log('Synced legal-app navigation assets.')
