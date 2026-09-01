import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const siteRoot = path.resolve(appRoot, '..')

/* The shared LanguageFlagMenu resolves flags against this app's BASE_URL, so
   every language it can show has to exist under <app>/public/flags/.
   Keep in step with SUPPORTED_LANGUAGES in src/lib/i18n.js. */
const FLAG_FILES = ['vn', 'gb', 'de', 'fr', 'kr', 'jp']

/* The chatbot fetches its knowledge base relative to BASE_URL rather than from
   /public/chatbot/, which only resolved in production because of a _redirects
   rule. Copying it in means the same path works in `vite dev`. */
const CHATBOT_KB = ['kb.vi.json', 'kb.en.json', 'kb.de.json', 'kb.fr.json', 'kb.ko.json', 'kb.ja.json']

const files = [
  [
    path.join(siteRoot, 'public/logoIcons/favicon.png'),
    path.join(appRoot, 'public/favicon.png'),
    'favicon',
  ],
  ...FLAG_FILES.map((code) => [
    path.join(siteRoot, `public/flags/${code}.svg`),
    path.join(appRoot, `public/flags/${code}.svg`),
    `flag ${code}`,
  ]),
  ...CHATBOT_KB.map((file) => [
    path.join(siteRoot, `public/chatbot/${file}`),
    path.join(appRoot, `public/chatbot/${file}`),
    `chatbot ${file}`,
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

console.log(`Synced ${files.length} assets into ${path.basename(appRoot)}/public/`)
