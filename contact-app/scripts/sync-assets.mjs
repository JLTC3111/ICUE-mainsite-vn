import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const siteRoot = path.resolve(appRoot, '..')

/**
 * The page's one photograph. There is no picture of the Hoàng Ngân office in
 * the repository yet, so this borrows the drafting-table frame the Our Work
 * page uses — light-toned, ICUE's own, and it sits under a caption that says
 * what it actually shows. Drop an office photo into public/ and point this at
 * it; ContactPage.jsx and the caption key `figure.caption` are the only other
 * places that need to change.
 */
const FIGURE_SOURCE = 'public/work/ourWork_img1.webp'

/* The shared LanguageFlagMenu resolves flags against this app's BASE_URL, so
   every language it can show has to exist under contact-app/public/flags/.
   Keep in step with SUPPORTED_LANGUAGES in src/lib/i18n.js. */
const FLAG_FILES = ['vn', 'gb', 'de', 'fr', 'kr', 'jp']

const files = [
  [path.join(siteRoot, 'public/logoIcons/favicon.png'), path.join(appRoot, 'public/favicon.png'), 'favicon'],
  [path.join(siteRoot, FIGURE_SOURCE), path.join(appRoot, 'public/office.webp'), 'office figure'],
  ...FLAG_FILES.map((code) => [
    path.join(siteRoot, `public/flags/${code}.svg`),
    path.join(appRoot, `public/flags/${code}.svg`),
    `flag ${code}`,
  ]),
]

for (const [from, to, label] of files) {
  if (!fs.existsSync(from)) {
    console.error(`Missing ${label}: ${from}`)
    process.exit(1)
  }
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
}

console.log(`Synced ${files.length} assets into contact-app/public/`)
