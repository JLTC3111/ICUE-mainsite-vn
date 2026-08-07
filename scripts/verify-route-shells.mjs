import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist-home')
const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8')

const routes = [
  ['/', 'index.html'],
  ['/contact', 'route-shells/contact.html'],
  ['/about-us', 'route-shells/about-us.html'],
  ['/past-projects', 'route-shells/past-projects.html'],
  ['/recruitment', 'route-shells/recruitment.html'],
  ['/news-archive', 'route-shells/news-archive.html'],
  ['/notable-awards', 'route-shells/notable-awards.html'],
  ['/community-activities', 'route-shells/community-activities.html'],
  ['/faqs', 'route-shells/faqs.html'],
  ['/privacy', 'route-shells/privacy.html'],
  ['/terms', 'route-shells/terms.html'],
  ['/gdpr', 'route-shells/gdpr.html'],
  ['/cookies', 'route-shells/cookies.html'],
]

const values = {
  title: new Set(),
  description: new Set(),
  canonical: new Set(),
}

function capture(html, pattern, label, route) {
  const value = html.match(pattern)?.[1]?.trim()
  if (!value) throw new Error(`${route}: missing ${label}`)
  return value
}

for (const [route, relativeFile] of routes) {
  const file = path.join(dist, relativeFile)
  if (!fs.existsSync(file)) throw new Error(`${route}: missing shell ${relativeFile}`)
  const html = fs.readFileSync(file, 'utf8')

  const title = capture(html, /<title>([^<]+)<\/title>/i, 'title', route)
  const description = capture(
    html,
    /<meta\s+name="description"\s+content="([^"]+)"/i,
    'description',
    route,
  )
  const canonical = capture(
    html,
    /<link\s+rel="canonical"\s+href="([^"]+)"/i,
    'canonical',
    route,
  )
  const ogTitle = capture(
    html,
    /<meta\s+property="og:title"\s+content="([^"]+)"/i,
    'Open Graph title',
    route,
  )
  const twitterTitle = capture(
    html,
    /<meta\s+name="twitter:title"\s+content="([^"]+)"/i,
    'Twitter title',
    route,
  )

  if (ogTitle !== title || twitterTitle !== title) {
    throw new Error(`${route}: social title does not match document title`)
  }
  if (!html.includes('"@type":"WebPage"')) {
    throw new Error(`${route}: missing WebPage structured data`)
  }
  if (!html.includes('<main class="route-shell-fallback">') || !html.includes('<h1>')) {
    throw new Error(`${route}: missing static crawlable fallback content`)
  }
  if (!html.includes(`content="${route}"`)) {
    throw new Error(`${route}: route marker does not match shell`)
  }

  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!new RegExp(`^${escapedRoute}\\s+\\S+\\.html\\s+200$`, 'm').test(redirects)) {
    throw new Error(`${route}: missing explicit Netlify shell rewrite`)
  }

  values.title.add(title)
  values.description.add(description)
  values.canonical.add(canonical)
}

for (const [label, set] of Object.entries(values)) {
  if (set.size !== routes.length) {
    throw new Error(`Route shells do not have unique ${label} values`)
  }
}

// /our-work is served by ourwork-app, not by a route shell. Assert the app is
// actually there and reachable, since dropping it from `routes` above removed
// it from every other check in this file.
if (!/^\/our-work\s+\/our-work\/index\.html\s+200$/m.test(redirects)) {
  throw new Error('/our-work: missing Netlify rewrite to the Our Work app')
}
if (!fs.existsSync(path.join(dist, 'our-work/index.html'))) {
  throw new Error('/our-work: ourwork-app build output is missing from dist-home')
}

const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8')
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8')
if (!sitemap.includes('<urlset') || !sitemap.includes('https://icue.vn/about-us')) {
  throw new Error('sitemap.xml is missing expected routes')
}
if (!robots.includes('Sitemap: https://icue.vn/sitemap.xml')) {
  throw new Error('robots.txt is missing the sitemap declaration')
}

const redirectRules = redirects
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
if (redirectRules.at(-1) !== '/*                   /index.html                     200') {
  throw new Error('The future-route SPA catch-all must remain the final Netlify rule')
}

console.log(`Verified ${routes.length} route shells, sitemap.xml, robots.txt, and Netlify rewrites.`)
