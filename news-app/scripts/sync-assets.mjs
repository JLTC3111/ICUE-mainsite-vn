import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const siteRoot = path.resolve(appRoot, '..')

const FLAG_FILES = ['vn', 'gb', 'de', 'fr', 'kr', 'jp']
const srcFlags = path.join(siteRoot, 'public/flags')
const destFlags = path.join(appRoot, 'public/flags')

fs.mkdirSync(destFlags, { recursive: true })

for (const file of FLAG_FILES) {
  const from = path.join(srcFlags, `${file}.svg`)
  const to = path.join(destFlags, `${file}.svg`)
  if (!fs.existsSync(from)) {
    console.error(`Missing flag: ${from}`)
    process.exit(1)
  }
  fs.copyFileSync(from, to)
}

console.log(`Synced ${FLAG_FILES.length} flags into news-app/public/`)
