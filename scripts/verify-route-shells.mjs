import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AWARDS_CERTIFICATIONS } from '../home-app/src/data/notableAwardsContent.js'
import { NOTABLE_AWARDS_REDIRECTS } from '../shared/site-routes/notableAwardsRedirects.js'
import { PAST_PROJECTS_LIST_REDIRECTS } from '../shared/site-routes/pastProjectsRedirects.js'
import { NEWS_ARCHIVE_LIST_REDIRECTS } from '../shared/site-routes/newsArchiveRedirects.js'
import { NEWS_ARCHIVE_ARTICLE_META } from '../home-app/src/data/newsArchive/meta.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist-home')
const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8')

const routes = [
  ['/', 'index.html'],
  ['/about-us', 'route-shells/about-us.html'],
  ['/past-projects', 'route-shells/past-projects.html'],
  ['/news-archive', 'route-shells/news-archive.html'],
  ['/notable-awards', 'route-shells/notable-awards.html'],
]

const values = {
  title: new Set(),
  description: new Set(),
  canonical: new Set(),
}

// Certificate references used to work on case-insensitive Macs but fail on
// the publish host. Check the actual filename and the final copied bytes.
for (const certificate of AWARDS_CERTIFICATIONS) {
  const relativePath = certificate.logo.replace(/^\//, '')
  const publishedPath = path.join(dist, relativePath)
  const filename = path.basename(publishedPath)
  if (!fs.readdirSync(path.dirname(publishedPath)).includes(filename)) {
    throw new Error(`Missing award certificate (case-sensitive): ${relativePath}`)
  }
  if (!fs.readFileSync(publishedPath).equals(fs.readFileSync(path.join(root, 'public', relativePath)))) {
    throw new Error(`Award certificate differs from its source: ${relativePath}`)
  }
}

for (const [oldPath, target] of Object.entries(NOTABLE_AWARDS_REDIRECTS)) {
  const escapedPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!new RegExp(`^${escapedPath}\\s+${target}\\s+301!?$`, 'm').test(redirects)) {
    throw new Error(`Missing awards redirect: ${oldPath}`)
  }
  if (oldPath.endsWith('.html') && fs.existsSync(path.join(dist, oldPath.slice(1)))) {
    throw new Error(`Retired awards HTML is still being published: ${oldPath}`)
  }
}

for (const [oldPath, target] of Object.entries(PAST_PROJECTS_LIST_REDIRECTS)) {
  const escapedPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!new RegExp(`^${escapedPath}\\s+${target}\\s+301!?$`, 'm').test(redirects)) {
    throw new Error(`Missing past-projects redirect: ${oldPath}`)
  }
}

if (!/^\/src\/pages\/card\.html id=:id\s+\/past-projects\/:id\s+301!?$/m.test(redirects)) {
  throw new Error('Missing forced redirect from /src/pages/card.html?id= to /past-projects/:id')
}
if (!/^\/past-projects\/\*\s+\/route-shells\/past-projects\.html\s+200$/m.test(redirects)) {
  throw new Error('/past-projects/*: missing shell rewrite for project detail routes')
}

for (const [oldPath, target] of Object.entries(NEWS_ARCHIVE_LIST_REDIRECTS)) {
  const escapedPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!new RegExp(`^${escapedPath}\\s+${target}\\s+301!?$`, 'm').test(redirects)) {
    throw new Error(`Missing news-archive redirect: ${oldPath}`)
  }
}

if (!/^\/src\/pages\/article_template\.html id=:id\s+\/news-archive\/:id\s+301!?$/m.test(redirects)) {
  throw new Error('Missing forced redirect from /src/pages/article_template.html?id= to /news-archive/:id')
}
if (!/^\/news-archive\/\*\s+\/route-shells\/news-archive\.html\s+200$/m.test(redirects)) {
  throw new Error('/news-archive/*: missing shell rewrite for archive article routes')
}

const newsArchiveSplatAt = redirects.search(/^\/news-archive\/\*\s+/m)
for (const articleId of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
  const articleRewrite = new RegExp(
    `^/news-archive/${articleId}\\s+/route-shells/news-archive-${articleId}\\.html\\s+200$`,
    'm',
  )
  const articleAt = redirects.search(articleRewrite)
  if (articleAt < 0) {
    throw new Error(`/news-archive/${articleId}: missing article-specific shell rewrite`)
  }
  if (articleAt > newsArchiveSplatAt) {
    throw new Error(`/news-archive/${articleId}: article shell rewrite must precede /news-archive/*`)
  }
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

// /our-work, /contact, /legal, /faqs and /recruitment are served by their own
// apps, not by a route shell.
// Assert each app is actually there and reachable, since dropping them from
// `routes` above removed them from every other check in this file.
const standaloneApps = [
  ['/newsroom', 'newsroom', 'news-app'],
  ['/structure', 'structure', 'structure-app'],
  ['/our-work', 'our-work', 'ourwork-app'],
  ['/contact', 'contact', 'contact-app'],
  ['/legal', 'legal', 'legal-app'],
  ['/faqs', 'faqs', 'faq-app'],
  ['/recruitment', 'recruitment', 'recruitment-app'],
  ['/community-activities', 'community-activities', 'community-app'],
]

for (const [route, dir, appName] of standaloneApps) {
  const rewrite = new RegExp(`^${route}\\s+${route}/index\\.html\\s+200$`, 'm')
  if (!rewrite.test(redirects)) {
    throw new Error(`${route}: missing Netlify rewrite to the ${appName} build`)
  }
  if (!fs.existsSync(path.join(dist, `${dir}/index.html`))) {
    throw new Error(`${route}: ${appName} build output is missing from dist-home`)
  }
}

// A locale query on a deep newsroom URL must still reach the newsroom SPA;
// otherwise Netlify's final main-site catch-all silently renders Home there.
if (!/^\/newsroom\/\*\s+\/newsroom\/index\.html\s+200$/m.test(redirects)) {
  throw new Error('/newsroom/*: missing catch-all before the main-site fallback')
}

// The contact form is submitted over fetch, so Netlify only knows the form
// exists because contact-app/index.html declares it in static HTML. Lose that
// declaration and the page still looks and behaves correctly while every
// message posted to it is discarded — which is why it is asserted here.
const contactHtml = fs.readFileSync(path.join(dist, 'contact/index.html'), 'utf8')
if (!/<form[^>]+name="contact"[^>]+data-netlify="true"/.test(contactHtml)) {
  throw new Error('/contact: the static Netlify form declaration is missing')
}
for (const field of ['name', 'email', 'message', 'topic', 'consent', 'bot-field']) {
  if (!contactHtml.includes(`name="${field}"`)) {
    throw new Error(`/contact: the Netlify form declaration is missing the "${field}" field`)
  }
}

const legalHtml = fs.readFileSync(path.join(dist, 'legal/index.html'), 'utf8')
for (const slug of ['privacy', 'terms', 'gdpr', 'cookies']) {
  if (!legalHtml.includes(`href="/legal/${slug}"`)) {
    throw new Error(`/legal/${slug}: missing from the legal app no-JS navigation`)
  }
  const legalRouteFile = path.join(dist, `legal/${slug}/index.html`)
  if (!fs.existsSync(legalRouteFile)) {
    throw new Error(`/legal/${slug}: route-specific legal shell is missing`)
  }
  const legalRouteHtml = fs.readFileSync(legalRouteFile, 'utf8')
  if (
    !legalRouteHtml.includes(`href="https://icue.vn/legal/${slug}"`)
    || !legalRouteHtml.includes('"@type":"WebPage"')
  ) {
    throw new Error(`/legal/${slug}: canonical metadata is incomplete`)
  }
  if (
    !new RegExp(`^/legal/${slug}\\s+/legal/${slug}/index\\.html\\s+200$`, 'm')
      .test(redirects)
  ) {
    throw new Error(`/legal/${slug}: missing route-specific Netlify rewrite`)
  }
  if (!new RegExp(`^/${slug}\\s+/legal/${slug}\\s+301!?$`, 'm').test(redirects)) {
    throw new Error(`/${slug}: missing permanent redirect to the legal app`)
  }
}

const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8')
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8')
if (
  !sitemap.includes('<urlset')
  || !sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
  || !sitemap.includes('https://icue.vn/about-us')
  || !sitemap.includes('https://icue.vn/past-projects/1')
  || !sitemap.includes('https://icue.vn/news-archive/1')
  || !sitemap.includes('https://icue.vn/news-archive/1?lang=en')
  || !sitemap.includes('hreflang="ja"')
  || !sitemap.includes('https://icue.vn/legal/privacy')
) {
  throw new Error('sitemap.xml is missing expected routes')
}
if (
  sitemap.includes('https://icue.vn/about-us?lang=')
  || sitemap.includes('https://icue.vn/past-projects/1?lang=')
) {
  throw new Error('sitemap.xml must only emit xhtml locale alternates for news-archive URLs')
}

const listingShell = fs.readFileSync(path.join(dist, 'route-shells/news-archive.html'), 'utf8')
if (
  !listingShell.includes('hreflang="ja"')
  || !listingShell.includes('https://icue.vn/news-archive?lang=en')
  || listingShell.includes('https://icue.vn/news-archive?lang=vi')
) {
  throw new Error('news-archive listing shell is missing locale alternate tags')
}

const articleOneMeta = NEWS_ARCHIVE_ARTICLE_META.vi['1']
const articleShell = fs.readFileSync(path.join(dist, 'route-shells/news-archive-1.html'), 'utf8')
if (!articleOneMeta?.title) {
  throw new Error('Vietnamese news-archive article 1 meta is missing')
}
if (
  !articleShell.includes(`${articleOneMeta.title} | ICUE Vietnam`)
  || !articleShell.includes(articleOneMeta.lead)
  || !articleShell.includes('hreflang="ja"')
  || !articleShell.includes('https://icue.vn/news-archive/1?lang=en')
  || articleShell.includes('Kho tin tức | ICUE Vietnam')
) {
  throw new Error('news-archive article 1 shell is missing Vietnamese title/lead or locale alternates')
}
for (const articleId of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
  const articleFile = path.join(dist, `route-shells/news-archive-${articleId}.html`)
  if (!fs.existsSync(articleFile)) {
    throw new Error(`/news-archive/${articleId}: missing article shell`)
  }
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

if (!/^\/about-us-legacy\s+\/about-us\s+301!?$/m.test(redirects)) {
  throw new Error('/about-us-legacy must force-redirect to the React About page')
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
  'about-us-legacy.html',
])
const pending = [dist]
while (pending.length) {
  const directory = pending.pop()
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'route-shells') continue
      pending.push(absolutePath)
      continue
    }
    if (publishedLegacyNames.has(entry.name)) {
      throw new Error(`Retired HTML is still being published: ${path.relative(dist, absolutePath)}`)
    }
  }
}

for (const routeFile of routes.map(([, relativeFile]) => path.join(dist, relativeFile))) {
  const html = fs.readFileSync(routeFile, 'utf8')
  if (html.includes('class="legacy-page"') || html.includes('data-legacy-standalone')) {
    throw new Error(`Route shell still carries a legacy-page payload: ${path.relative(dist, routeFile)}`)
  }
}

console.log(`Verified ${routes.length} route shells, sitemap.xml, robots.txt, and Netlify rewrites.`)
