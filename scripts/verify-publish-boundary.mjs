import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publishDir = path.join(root, 'dist-home')

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
console.log(`Verified the static publish boundary and ${requiredFiles.length} required files.`)
