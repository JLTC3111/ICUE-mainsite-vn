// Run against the built apps served by the root Vite server. Playwright is a
// QA-only dependency; ICUE_PLAYWRIGHT_MODULE can point to an existing install.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const playwright = await import(process.env.ICUE_PLAYWRIGHT_MODULE || 'playwright')
const engine = process.env.ICUE_RECOVERY_ENGINE || 'chromium'
const origin = process.env.ICUE_RECOVERY_URL || 'http://127.0.0.1:3112'
const output = process.env.ICUE_RECOVERY_OUTPUT || '/private/tmp/icue-page-recovery-qa'
await fs.mkdir(output, { recursive: true })
const launch = () => playwright[engine].launch({
  headless: true,
  ...(process.env.ICUE_BROWSER_EXECUTABLE ? { executablePath: process.env.ICUE_BROWSER_EXECUTABLE } : {}),
})
let browser = await launch()
const sizes = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 } },
  { name: 'tablet', viewport: { width: 834, height: 1112 }, hasTouch: true, isMobile: true },
  { name: 'phone', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
]
const routes = [
  { name: 'awards', path: '/notable-awards', content: '.award-card' },
  { name: 'legal', path: '/legal/privacy', content: '.legal-section' },
  { name: 'faq', path: '/faqs', content: '.fq-card' },
  { name: 'recruitment', path: '/recruitment', content: '.rc-job' },
]
const scenarios = process.env.ICUE_RECOVERY_SCENARIOS?.split(',') || [
  'resume', 'entry-failure', 'offline-entry', 'stylesheet-failure', 'storage-denied', 'observer-stalled', 'chunk-failure', 'locale-failure',
  'persistent-entry-failure', 'persistent-chunk-failure',
]
const results = []

async function appVisible(page, route) {
  await page.locator(route.content).first().waitFor({ timeout: 25_000 })
  await page.waitForFunction(() => {
    const h1 = document.querySelector('h1')
    if (!h1) return false
    for (let node = h1; node; node = node.parentElement) {
      if (+getComputedStyle(node).opacity === 0) return false
    }
    return !document.getElementById('icue-boot-recovery')
  }, null, { timeout: 25_000 })
}

async function resume(page, context) {
  await context.setOffline(true)
  await page.evaluate(() => {
    document.dispatchEvent(new Event('freeze'))
    window.dispatchEvent(new Event('pagehide'))
  })
  await context.setOffline(false)
  await page.evaluate(() => {
    document.dispatchEvent(new Event('resume'))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
  })
}

async function runCase(route, size, scenario) {
  const label = `${engine}-${size.name}-${route.name}-${scenario}`
  const { name: _name, ...device } = size
  const context = await browser.newContext(device)
  const page = await context.newPage()
  page.setDefaultTimeout(12_000)
  const errors = []
  let result
  const persistentFailure = scenario.startsWith('persistent-')
  let blocking = true
  let failures = 0, navigations = 0
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++
  })
  try {
    if (scenario === 'storage-denied') await page.addInitScript(() => {
      for (const key of ['localStorage', 'sessionStorage']) {
        Object.defineProperty(window, key, { get() { throw new DOMException('Storage denied', 'SecurityError') } })
      }
    })
    if (scenario === 'observer-stalled') await page.addInitScript(() => {
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
    })
    const assetPattern = {
      'entry-failure': '**/assets/index-*.js',
      'offline-entry': '**/assets/index-*.js',
      'stylesheet-failure': '**/assets/index-*.css',
      'chunk-failure': '**/assets/NotableAwardsPage-*.js',
      'locale-failure': '**/assets/de-*.js',
      'persistent-entry-failure': /\/assets\/index-[^/]+\.js(?:\?.*)?$/,
      'persistent-chunk-failure': /\/assets\/NotableAwardsPage-[^/]+\.js(?:\?.*)?$/,
    }[scenario]
    if (assetPattern) await page.route(assetPattern, async request => {
      if (failures === 0 || (persistentFailure && blocking)) {
        failures++
        if (scenario === 'offline-entry') await context.setOffline(true)
        await request.abort('failed')
      } else await request.continue()
    })
    const language = scenario === 'locale-failure' ? 'de' : 'en'
    await page.goto(`${origin}${route.path}?lang=${language}&qa=restore#recovery-check`, { waitUntil: 'domcontentloaded' })
    if (scenario === 'offline-entry') {
      await page.locator('#icue-boot-recovery').waitFor()
      assert.equal(navigations, 1, 'An offline startup must wait before retrying')
      await context.setOffline(false)
    }
    if (persistentFailure) {
      await page.waitForFunction(() => new URLSearchParams(location.search).get('__icue_boot_retry') === '2' && document.getElementById('icue-boot-recovery'))
      await page.waitForTimeout(2200)
      assert.equal(navigations, 3, 'A persistent failure must stop after two automatic reloads')
      blocking = false
      await page.locator('#icue-boot-recovery button').click()
    }
    await appVisible(page, route)
    if (scenario === 'locale-failure') await page.waitForFunction(() => document.documentElement.lang === 'de')
    if (assetPattern && !persistentFailure) assert.equal(failures, 1, 'Failure injection must hit the built asset')
    if (scenario === 'restored-session') assert.equal(await page.locator('html').getAttribute('lang'), 'en')
    if (scenario === 'observer-stalled') {
      await page.waitForFunction(() => [...document.querySelectorAll('.awards-grid-item, .timeline-item, .legal-section')].every(element => {
        for (let node = element; node; node = node.parentElement) if (+getComputedStyle(node).opacity < 0.99) return false
        return true
      }))
    }
    if (scenario === 'resume') {
      if (route.name === 'faq') {
        await page.locator('.fq-card').first().click()
        await page.locator('.fq-answer__question').first().click()
        await page.locator('.fq-answer__body').first().waitFor()
      }
      if (route.name === 'recruitment') {
        await page.locator('#job-search').fill('Python')
        await page.locator('.rc-search__submit').click()
        await page.waitForFunction(() => document.querySelectorAll('.rc-job').length === 1)
      }
      await resume(page, context)
      await appVisible(page, route)
      assert.equal(navigations, 1, 'Resume must not reload an already usable page')
      if (route.name === 'faq') assert.equal(await page.locator('.fq-answer__body').count(), 1)
      if (route.name === 'recruitment') assert.equal(await page.locator('#job-search').inputValue(), 'Python')
      if (size.name !== 'desktop') {
        await page.setViewportSize({ width: size.viewport.height, height: size.viewport.width })
        await appVisible(page, route)
        if (route.name === 'faq') assert.equal(await page.locator('.fq-answer__body').count(), 1, 'An open answer must survive rotation')
        if (route.name === 'recruitment') assert.equal(await page.locator('#job-search').inputValue(), 'Python')
        await page.setViewportSize(size.viewport)
      }
      if (route.name === 'legal') {
        for (const slug of ['terms', 'gdpr', 'cookies', 'privacy']) {
          await page.locator(`.gooey-tabs a[href$="/${slug}"]`).click()
          await appVisible(page, route)
          assert.equal(new URL(page.url()).pathname, `/legal/${slug}`)
        }
      }
      for (const image of await page.locator('main img').all()) await image.scrollIntoViewIfNeeded()
      await page.waitForFunction(() => [...document.querySelectorAll('.awards-grid-item, .timeline-item, .legal-section')].every(element => {
        for (let node = element; node; node = node.parentElement) if (+getComputedStyle(node).opacity < 0.99) return false
        return true
      }))
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: path.join(output, `${label}.png`), fullPage: true })
      const restoredUrl = page.url()
      await page.reload({ waitUntil: 'domcontentloaded' })
      await appVisible(page, route)
      assert.equal(new URL(page.url()).pathname, new URL(restoredUrl).pathname)
    }
    if (scenario === 'storage-denied') {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await appVisible(page, route)
      assert.equal(await page.locator('html').getAttribute('lang'), 'en')
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No horizontal overflow')
    assert.equal(new URL(page.url()).searchParams.has('__icue_boot_retry'), false, 'Successful recovery clears its URL marker')
    assert.deepEqual(errors, [])
    result = { label, pass: true, navigations }
  } catch (error) {
    result = { label, pass: false, error: error.message, errors, url: page.url(), navigations }
    await page.screenshot({ path: path.join(output, `${label}-failed.png`) }).catch(() => {})
  } finally {
    results.push(result)
    console.log(JSON.stringify(result))
    await context.close()
  }
}

try {
  // Three isolated contexts at a time, with one independent test per viewport.
  for (const route of routes) {
    for (const scenario of scenarios) {
      if (scenario === 'chunk-failure' && route.name !== 'awards') continue
      if (scenario === 'observer-stalled' && !['awards', 'legal'].includes(route.name)) continue
      if (scenario.startsWith('persistent-')) {
        if (route.name === 'awards') await runCase(route, sizes[0], scenario)
        continue
      }
      await Promise.all(sizes.map(size => runCase(route, size, scenario)))
    }
  }
  if (!process.env.ICUE_RECOVERY_SCENARIOS) {
    // Restart the owned browser process, then reopen each restored deep link
    // in a new session. This does not claim to reboot a physical device.
    await browser.close()
    browser = await launch()
    for (const route of routes) await Promise.all(sizes.map(size => runCase(route, size, 'restored-session')))
  }
} finally {
  await browser.close()
  await fs.writeFile(path.join(output, `${engine}-results.json`), JSON.stringify(results, null, 2))
}
const failed = results.filter(result => !result.pass)
console.log(`${results.length - failed.length}/${results.length} browser recovery checks passed (${engine}).`)
if (failed.length) process.exitCode = 1
