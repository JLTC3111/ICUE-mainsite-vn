import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { siteIconFiles, siteIconLinks } from '../shared/site-icons/icons.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publishDir = path.join(root, 'dist-home')
const sourceFontsDir = path.join(root, 'fonts')
const publishedFontsDir = path.join(publishDir, 'fonts')

const requiredFiles = [
  'index.html',
  '_redirects',
  '_headers',
  ...siteIconFiles(),
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
let verifiedBrowserHeads = 0

function attributes(tag = '') {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), match[2]]))
}

function verifyBrowserHead(relativePath) {
  const htmlPath = path.join(publishDir, relativePath)
  if (!fs.statSync(htmlPath, { throwIfNoEntry: false })?.isFile()) return
  const html = fs.readFileSync(htmlPath, 'utf8')
  const htmlAttributes = attributes(html.match(/<html\b[^>]*>/i)?.[0])
  if (htmlAttributes.translate !== 'no' || !htmlAttributes.class?.split(/\s+/).includes('notranslate')) {
    fail(`${relativePath}: browser translation opt-out is missing from the document root`)
  }
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]))
  if (!meta.some(tag => tag.name === 'google' && tag.content === 'notranslate')) {
    fail(`${relativePath}: automatic-translation opt-out meta tag is missing`)
  }
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0]))
  for (const icon of siteIconLinks()) {
    const declaration = links.find(link => link.rel === icon.rel && link.href?.split('/').at(-1) === icon.file)
    if (!declaration) {
      fail(`${relativePath}: missing current ${icon.rel} declaration (${icon.file})`)
      continue
    }
    const url = new URL(declaration.href, `https://icue.test/${relativePath}`)
    const file = path.join(publishDir, url.pathname.replace(/^\/+/, ''))
    if (url.origin !== 'https://icue.test' || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
      fail(`${relativePath}: icon does not resolve to a local published image (${declaration.href})`)
    } else if (!fs.readFileSync(file).equals(fs.readFileSync(path.join(root, 'public', 'logoIcons', icon.source)))) {
      fail(`${relativePath}: icon differs from public/logoIcons/${icon.source}`)
    }
  }
  verifiedBrowserHeads += 1
}

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

  const browserHeads = new Set(requiredFiles.filter(file => file.endsWith('.html')))
  const collectHtml = directory => {
    if (!fs.existsSync(directory)) return
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) collectHtml(file)
      else if (entry.isFile() && entry.name.endsWith('.html')) browserHeads.add(path.relative(publishDir, file))
    }
  }
  collectHtml(path.join(publishDir, 'route-shells'))
  collectHtml(path.join(publishDir, 'legal'))
  browserHeads.forEach(verifyBrowserHead)

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

  // A successful SPA fallback is still HTML, not a usable mobile icon.
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  for (const file of ['favicon.png', 'apple-touch-icon.png', 'apple-touch-icon-precomposed.png']) {
    const iconPath = path.join(publishDir, file)
    const sourcePath = path.join(root, 'public', 'logoIcons', file)
    if (!fs.existsSync(iconPath)) continue
    const bytes = fs.readFileSync(iconPath)
    const source = fs.readFileSync(sourcePath)
    const samePng = bytes.length >= 24 && source.length >= 24 &&
      bytes.subarray(0, 8).equals(pngSignature) &&
      bytes.readUInt32BE(16) === source.readUInt32BE(16) &&
      bytes.readUInt32BE(20) === source.readUInt32BE(20)
    if (!samePng) {
      fail(`mobile icon must match public/logoIcons/${file}`)
    }
  }
  const faviconIcoPath = path.join(publishDir, 'favicon.ico')
  if (fs.existsSync(faviconIcoPath) && !fs.readFileSync(faviconIcoPath).subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))) {
    fail('favicon.ico must be a real ICO image')
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

  for (const leakedRoot of ['src/pages', 'legacy/pages', 'legacy-embed/pages', 'about-us-legacy.html']) {
    if (fs.existsSync(path.join(publishDir, leakedRoot))) {
      fail(`retired HTML crossed the publish boundary: ${leakedRoot}`)
    }
  }

  const publishedLegacyNames = new Set([
    'aboutUs.html',
    'Contact.html',
    'ourWork.html',
    'pastProjects.html',
    'News.html',
    'card.html',
    'article_template.html',
    'notableAwards.html',
    'communityActivities.html',
    'FAQs.html',
    'recruitment.html',
    'orgStructure.html',
    'Home.html',
    'Home_OLD.html',
  ])
  const htmlPending = [publishDir]
  while (htmlPending.length) {
    const directory = htmlPending.pop()
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'route-shells') continue
        htmlPending.push(absolutePath)
        continue
      }
      if (publishedLegacyNames.has(entry.name)) {
        fail(`retired HTML crossed the publish boundary: ${path.relative(publishDir, absolutePath)}`)
      }
    }
  }
}

if (process.exitCode) process.exit(process.exitCode)
console.log(
  `Verified the static publish boundary, ${requiredFiles.length} required files, ${verifiedBrowserHeads} browser metadata heads, ${verifiedFontCount} self-hosted fonts, and ${verifiedPrivacySafeEntry ? 'a privacy-safe home entry' : 'the home entry'}.`,
)
