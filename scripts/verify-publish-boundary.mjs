import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publishDir = path.join(root, 'dist-home')
const sourceFontsDir = path.join(root, 'fonts')
const publishedFontsDir = path.join(publishDir, 'fonts')

const requiredFiles = [
  'index.html',
  '_redirects',
  '_headers',
  'newsroom/index.html',
  'people/index.html',
  'structure/index.html',
  'our-work/index.html',
  'contact/index.html',
  'legal/index.html',
  'faqs/index.html',
  'recruitment/index.html',
  'community-activities/index.html',
]

const forbiddenRoots = [
  '.git',
  '.github',
  'netlify',
  'scripts',
  'node_modules',
  'package.json',
  'package-lock.json',
  'news-app',
  'home-app',
  'people-app',
  'structure-app',
  'ourwork-app',
  'contact-app',
  'legal-app',
  'faq-app',
  'recruitment-app',
  'community-app',
]

const sensitiveNames = new Set([
  '.env',
  '.env.local',
  '.env.production',
  'private-env.cjs',
])

function fail(message) {
  console.error(`[verify-publish-boundary] ${message}`)
  process.exitCode = 1
}

let verifiedFontCount = 0
let verifiedPrivacySafeEntry = false

if (!fs.existsSync(publishDir)) {
  fail('dist-home/ is missing. Run the full build first.')
} else {
  for (const relativePath of requiredFiles) {
    if (!fs.statSync(path.join(publishDir, relativePath), { throwIfNoEntry: false })?.isFile()) {
      fail(`required site output is missing: ${relativePath}`)
    }
  }

  for (const relativePath of forbiddenRoots) {
    if (fs.existsSync(path.join(publishDir, relativePath))) {
      fail(`source or infrastructure path crossed the publish boundary: ${relativePath}`)
    }
  }

  const homeIndexPath = path.join(publishDir, 'index.html')
  if (fs.statSync(homeIndexPath, { throwIfNoEntry: false })?.isFile()) {
    const homeIndex = fs.readFileSync(homeIndexPath, 'utf8')
    const entryMatch = homeIndex.match(/<script\b[^>]*\bsrc="([^"]+\.js)"[^>]*><\/script>/i)

    if (!entryMatch) {
      fail('home entry script could not be resolved from index.html')
    } else {
      const entryRelativePath = entryMatch[1].replace(/^\/+/, '')
      const entryPath = path.join(publishDir, entryRelativePath)

      if (!fs.statSync(entryPath, { throwIfNoEntry: false })?.isFile()) {
        fail(`home entry script is missing: ${entryRelativePath}`)
      } else {
        const entrySource = fs.readFileSync(entryPath, 'utf8')
        const privacySensitiveApis = ['toDataURL(', 'getImageData(']
        const detectedApi = privacySensitiveApis.find((api) => entrySource.includes(api))

        if (detectedApi) {
          fail(`home entry performs privacy-sensitive canvas readback: ${detectedApi}`)
        } else {
          verifiedPrivacySafeEntry = true
        }
      }
    }
  }

  if (!fs.statSync(sourceFontsDir, { throwIfNoEntry: false })?.isDirectory()) {
    fail('source font kit is missing: fonts/')
  } else {
    const fontFiles = fs.readdirSync(sourceFontsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.woff2'))
      .map((entry) => entry.name)
      .sort()

    if (fontFiles.length === 0) {
      fail('source font kit contains no WOFF2 files')
    }

    for (const fontFile of fontFiles) {
      const sourcePath = path.join(sourceFontsDir, fontFile)
      const publishedPath = path.join(publishedFontsDir, fontFile)

      if (!fs.statSync(publishedPath, { throwIfNoEntry: false })?.isFile()) {
        fail(`self-hosted font is missing from deploy output: fonts/${fontFile}`)
        continue
      }

      if (!fs.readFileSync(sourcePath).equals(fs.readFileSync(publishedPath))) {
        fail(`self-hosted font changed while assembling deploy output: fonts/${fontFile}`)
        continue
      }

      verifiedFontCount += 1
    }
  }

  const pending = [publishDir]
  while (pending.length) {
    const directory = pending.pop()
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name)
      const relativePath = path.relative(publishDir, absolutePath)

      if (entry.isSymbolicLink()) {
        fail(`symbolic links are not allowed in deploy output: ${relativePath}`)
        continue
      }
      if (entry.isDirectory()) {
        pending.push(absolutePath)
        continue
      }
      if (sensitiveNames.has(entry.name) || entry.name.startsWith('.env.')) {
        fail(`sensitive filename crossed the publish boundary: ${relativePath}`)
      }
    }
  }
}

if (process.exitCode) process.exit(process.exitCode)
console.log(
  `Verified the static publish boundary, ${requiredFiles.length} required files, ${verifiedFontCount} self-hosted fonts, and ${verifiedPrivacySafeEntry ? 'a privacy-safe home entry' : 'the home entry'}.`,
)
