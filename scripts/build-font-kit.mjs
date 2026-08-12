/**
 * Rebuild the self-hosted type kit in /fonts and regenerate
 * shared/fonts/fonts.css.
 *
 *   node scripts/build-font-kit.mjs
 *
 * The site renders in one family — Noto Sans — across all six locales. Latin
 * and Vietnamese come from Noto Sans, Japanese from Noto Sans JP, Korean from
 * Noto Sans KR. All three share metrics, so switching locale never reflows the
 * page around the text.
 *
 * Google Fonts is used here as a *build-time* subsetter only: this script asks
 * it for the css2 stylesheet, downloads every .woff2 it points at, and rewrites
 * the URLs to our own origin. Nothing contacts Google at runtime.
 *
 * The CJK families ship 124 subsets each, which is far more than we need — the
 * Japanese and Korean text on this site is UI copy from src/locales/*.json, not
 * article content. So for those two we keep only the subsets that actually
 * contain a glyph we use, which cuts 248 files down to ~67. The system-font
 * fallbacks in shared/styles/typography.css cover anything unexpected.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const siteRoot = path.resolve(__dirname, '..')
const fontsDir = path.join(siteRoot, 'fonts')
const cssOut = path.join(siteRoot, 'shared/fonts/fonts.css')

// Google serves woff2 only to browser-like clients; a bare fetch gets ttf.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** Recognisable names for the Latin-script slices; CJK stays numeric. */
const SUBSET_LABELS = [
  [/U\+1EA0-1EF9/, 'vietnamese'],
  [/U\+0100-02BA/, 'latin-ext'],
  [/U\+0000-00FF/, 'latin'],
  [/U\+0460-052F/, 'cyrillic-ext'],
  [/U\+0301, U\+0400-045F/, 'cyrillic'],
  [/U\+1F00-1FFF/, 'greek-ext'],
  [/U\+0370-0377/, 'greek'],
  [/U\+0900-097F/, 'devanagari'],
]

const FAMILIES = [
  { family: 'Noto Sans', query: 'Noto+Sans:wght@300..900', slug: 'noto-sans', locales: null },
  { family: 'Noto Sans JP', query: 'Noto+Sans+JP:wght@300..900', slug: 'noto-sans-jp', locales: ['ja'] },
  { family: 'Noto Sans KR', query: 'Noto+Sans+KR:wght@300..900', slug: 'noto-sans-kr', locales: ['ko'] },
]

/** Every character our locale files can render for the given languages. */
function localeCodepoints(langs) {
  if (!langs) return null
  const points = new Set()
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (langs.some((l) => entry.name === `${l}.json`) && full.includes('locales')) {
        for (const ch of fs.readFileSync(full, 'utf8')) points.add(ch.codePointAt(0))
      }
    }
  }
  walk(siteRoot)
  return points
}

function parseUnicodeRange(text) {
  return text.split(',').map((part) => {
    const v = part.trim().replace(/^U\+/i, '')
    if (v.includes('-')) {
      const [a, b] = v.split('-')
      return [parseInt(a, 16), parseInt(b, 16)]
    }
    if (v.includes('?')) {
      return [parseInt(v.replaceAll('?', '0'), 16), parseInt(v.replaceAll('?', 'F'), 16)]
    }
    const n = parseInt(v, 16)
    return [n, n]
  })
}

function parseFaces(css) {
  const faces = []
  for (const [block] of css.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    const url = block.match(/src:\s*url\((\S+?)\)/)?.[1]
    const range = block.match(/unicode-range:\s*([^;]+);/)?.[1]
    if (!url || !range) continue
    const rangeText = range.trim().replace(/\s+/g, ' ')
    faces.push({ url, rangeText, ranges: parseUnicodeRange(rangeText) })
  }
  return faces
}

async function get(url, asText = false) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  return asText ? res.text() : Buffer.from(await res.arrayBuffer())
}

fs.mkdirSync(fontsDir, { recursive: true })
fs.mkdirSync(path.dirname(cssOut), { recursive: true })

const kept = []
for (const spec of FAMILIES) {
  const css = await get(
    `https://fonts.googleapis.com/css2?family=${spec.query}&display=swap`,
    true,
  )
  const faces = parseFaces(css)
  const wanted = localeCodepoints(spec.locales)
  const used = new Set()

  for (const [index, face] of faces.entries()) {
    if (wanted) {
      const hit = [...wanted].some((cp) =>
        face.ranges.some(([a, b]) => cp >= a && cp <= b),
      )
      if (!hit) continue
    }
    const label = SUBSET_LABELS.find(([re]) => re.test(face.rangeText))?.[1]
    let name = label ? `${spec.slug}-${label}` : `${spec.slug}-${index}`
    while (used.has(name)) name = `${name}x`
    used.add(name)

    const file = `${name}.woff2`
    const data = await get(face.url)
    if (data.subarray(0, 4).toString('latin1') !== 'wOF2') {
      throw new Error(`Not a woff2 payload: ${face.url}`)
    }
    fs.writeFileSync(path.join(fontsDir, file), data)
    kept.push({ family: spec.family, file, range: face.rangeText, bytes: data.length })
  }
  const total = faces.length
  const n = kept.filter((k) => k.family === spec.family).length
  console.log(`${spec.family}: ${n}/${total} subsets kept`)
}

// Drop stale faces from previous runs so renames cannot leave orphans behind.
const current = new Set(kept.map((k) => k.file))
for (const file of fs.readdirSync(fontsDir)) {
  if (file.endsWith('.woff2') && !current.has(file)) {
    fs.unlinkSync(path.join(fontsDir, file))
    console.log(`removed stale ${file}`)
  }
}

const header = `/*
 * ICUE self-hosted type kit — Noto Sans.
 *
 * One family across all six locales: Latin and Vietnamese from Noto Sans,
 * Japanese from Noto Sans JP, Korean from Noto Sans KR. Matching metrics mean
 * switching locale never reflows the layout.
 *
 * Every .woff2 lives in the repo at /fonts and is served from our own origin —
 * there is no Google Fonts request at runtime. The CJK faces are subsetted to
 * the glyphs our locale files actually use, and \`unicode-range\` gates each
 * file so a Vietnamese page downloads only the Latin/Vietnamese slices.
 *
 * GENERATED — do not hand-edit. Regenerate with scripts/build-font-kit.mjs.
 */
`

const body = kept
  .map(
    (k) => `@font-face {
  font-family: "${k.family}";
  font-style: normal;
  font-weight: 300 900;
  font-display: swap;
  src: url("/fonts/${k.file}") format("woff2");
  unicode-range: ${k.range};
}`,
  )
  .join('\n\n')

fs.writeFileSync(cssOut, `${header}\n${body}\n`, 'utf8')

const kb = (kept.reduce((sum, k) => sum + k.bytes, 0) / 1024).toFixed(0)
console.log(`\nwrote ${kept.length} faces to /fonts (${kb} KB) and ${path.relative(siteRoot, cssOut)}`)
