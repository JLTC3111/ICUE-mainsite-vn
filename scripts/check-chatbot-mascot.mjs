// Production browser QA. Uses real authored responses, with network/platform
// fault injection only. No test route or fake response is shipped in the app.
// Like check-page-recovery.mjs, Playwright is an external QA-only dependency.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const playwright = await import(process.env.ICUE_PLAYWRIGHT_MODULE || 'playwright')
const engine = process.env.ICUE_MASCOT_ENGINE || 'chromium'
const origin = process.env.ICUE_MASCOT_URL || 'http://127.0.0.1:3116'
const output = process.env.ICUE_MASCOT_OUTPUT || '/private/tmp/icue-mascot-qa'
await fs.mkdir(output, { recursive: true })
const browser = await playwright[engine].launch({ headless: true,
  ...(process.env.ICUE_BROWSER_EXECUTABLE ? { executablePath: process.env.ICUE_BROWSER_EXECUTABLE } : {}),
})
const results = []
const routes = ['/', '/newsroom/', '/people/experts', '/structure/', '/our-work/', '/contact/', '/legal/privacy', '/faqs/', '/recruitment/', '/community-activities/']
const labels = JSON.parse(await fs.readFile(new URL('../faq-app/src/locales/en.json', import.meta.url))).chat
const kb = JSON.parse(await fs.readFile(new URL('../public/chatbot/kb.en.json', import.meta.url)))
const question = 'do you supervise construction'
const expectedAnswer = kb.intents.find(intent => intent.id === 'supervision').answer

const mascotState = (page, state) => page.locator(`.icue-mascot--launcher[data-state="${state}"]`).waitFor({ state: 'attached' })
const shot = (page, name) => page.screenshot({ path: path.join(output, `${engine}-${name}.png`) })
async function send(page, value) {
  await page.locator('.icue-chat__input').fill(value)
  await page.locator('.icue-chat__send').click()
  await mascotState(page, 'thinking')
}
async function panelFits(page) {
  const result = await page.locator('.icue-chat__window').evaluate(panel => {
    const rect = panel.getBoundingClientRect()
    const viewport = window.visualViewport
    const top = viewport?.offsetTop || 0
    const bottom = top + (viewport?.height || innerHeight)
    const controls = ['.icue-chat__close', '.icue-chat__input', '.icue-chat__send'].map(selector => {
      const control = panel.querySelector(selector)
      const r = control.getBoundingClientRect()
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return { selector, visible: r.top >= top && r.bottom <= bottom + 1, reachable: hit === control || control.contains(hit) }
    })
    return { rect: rect.toJSON(), top, bottom, width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth + 1, controls,
      messagesHeight: panel.querySelector('.icue-chat__messages').clientHeight,
    }
  })
  assert.ok(result.rect.left >= 0 && result.rect.right <= result.width + 1, JSON.stringify(result))
  assert.ok(result.rect.top >= result.top && result.rect.bottom <= result.bottom + 1, JSON.stringify(result))
  assert.equal(result.overflow, false, JSON.stringify(result))
  assert.ok(result.messagesHeight >= 30, JSON.stringify(result))
  assert.ok(result.controls.every(control => control.visible && control.reachable), JSON.stringify(result))
  return result
}

async function run(name, device, task) {
  if (process.env.ICUE_MASCOT_CASE && !new RegExp(process.env.ICUE_MASCOT_CASE).test(name)) return
  const context = await browser.newContext(device)
  const page = await context.newPage()
  page.setDefaultTimeout(12_000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await task(page, context)
    assert.deepEqual(errors, [])
    results.push({ name, passed: true })
    process.stdout.write(`PASS ${engine}: ${name}\n`)
  } catch (error) {
    results.push({ name, passed: false, error: error.message, pageErrors: errors })
    await shot(page, `${name}-FAILED`).catch(() => {})
    process.stderr.write(`FAIL ${engine}: ${name}: ${error.message}\n`)
  } finally { await context.close() }
}

try {
  for (const route of routes) {
    const name = route.split('/')[1] || 'home'
    const locale = name === 'home' ? 'vi' : 'en'
    const routeLabels = JSON.parse(await fs.readFile(new URL(`../faq-app/src/locales/${locale}.json`, import.meta.url))).chat
    await run(`${name}-desktop`, { viewport: { width: 1440, height: 1000 } }, async page => {
      await page.goto(`${origin}${route}?lang=${locale}`)
      await page.locator('.icue-chat__toggle').waitFor()
      assert.equal(await page.locator('.icue-chat').count(), 1)
      const launcher = page.getByRole('button', { name: routeLabels.open, exact: true })
      await launcher.waitFor()
      assert.equal(await launcher.getAttribute('aria-expanded'), 'false')
      await page.locator('.icue-mascot__art').evaluate(img => img.decode())
      await shot(page, `${name}-closed`)
      await launcher.hover()
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.icue-mascot--launcher [data-face="curious"]')).opacity === '1')
      await shot(page, `${name}-hover`)
      await launcher.focus(); await page.keyboard.press('Enter')
      await mascotState(page, 'greeting')
      await page.mouse.move(800, 500)
      await page.waitForTimeout(350)
      await panelFits(page)
      assert.equal(await page.locator('.icue-chat__input').evaluate(input => input === document.activeElement), true)
      await shot(page, `${name}-open`)
      await send(page, question)
      await shot(page, `${name}-thinking`)
      await mascotState(page, 'happy')
      assert.ok((await page.locator('.icue-chat__messages').innerText()).includes(expectedAnswer))
      await shot(page, `${name}-happy`)
      await mascotState(page, 'idle')
      await send(page, 'quux quasar zyzzyva')
      await mascotState(page, 'confused')
      await shot(page, `${name}-fallback`)
      await page.keyboard.press('Escape')
      assert.equal(await launcher.getAttribute('aria-expanded'), 'false')
      assert.equal(await launcher.evaluate(el => el === document.activeElement), true)
      await launcher.click()
      assert.ok((await page.locator('.icue-chat__messages').innerText()).includes(expectedAnswer))
      await page.reload()
      // Existing behavior persists the transcript, never the open/closed state.
      await page.getByRole('button', { name: routeLabels.open, exact: true }).click()
      assert.ok((await page.locator('.icue-chat__messages').innerText()).includes(expectedAnswer))
    })

    await run(`${name}-phone`, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, async (page, context) => {
      await page.goto(`${origin}${route}?lang=${locale}`)
      const launcher = page.locator('.icue-chat__toggle')
      await launcher.waitFor()
      for (let count = 0; count < 3; count++) {
        await launcher.click()
        await page.waitForTimeout(350)
        await panelFits(page)
        assert.equal(await page.locator('.icue-chat__input').evaluate(input => input === document.activeElement), false)
        await page.locator('.icue-chat__close').click()
        assert.equal(await launcher.evaluate(el => el === document.activeElement), true)
      }
      await launcher.click()
      await page.locator('.icue-chat__input').fill('Draft survives a browser resume')
      await shot(page, `${name}-phone-open`)
      // Visual-viewport-only shrink models iOS/Chromium overlay keyboards. It
      // is not a native keyboard test; retain layout viewport height at 844.
      await page.evaluate(() => {
        Object.defineProperty(visualViewport, 'height', { configurable: true, value: 330 })
        visualViewport.dispatchEvent(new Event('resize'))
      })
      await page.locator('.icue-chat--compact').waitFor({ state: 'attached' })
      await panelFits(page)
      await shot(page, `${name}-keyboard-simulation`)
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true })
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
        document.dispatchEvent(new Event('visibilitychange'))
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
      })
      await page.locator('.icue-mascot--launcher[data-paused="true"]').waitFor({ state: 'attached' })
      assert.equal(await page.locator('.icue-mascot--launcher .icue-mascot__bird').evaluate(el => getComputedStyle(el).animationPlayState), 'paused')
      await context.setOffline(true)
      await context.setOffline(false)
      await page.evaluate(() => {
        delete visualViewport.height
        Object.defineProperty(document, 'hidden', { configurable: true, value: false })
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
        document.dispatchEvent(new Event('visibilitychange'))
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
      })
      await page.locator('.icue-mascot--launcher[data-paused="false"]').waitFor({ state: 'attached' })
      assert.equal(await page.locator('.icue-chat__input').inputValue(), 'Draft survives a browser resume')
      await page.setViewportSize({ width: 844, height: 390 })
      await page.waitForTimeout(200)
      await panelFits(page)
      await shot(page, `${name}-landscape`)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForTimeout(200)
      await panelFits(page)
      await send(page, question); await mascotState(page, 'happy')
      assert.ok((await page.locator('.icue-chat__messages').innerText()).includes(expectedAnswer))
      await page.locator('.icue-chat__close').click()
    })
  }

  await run('small-phone-reduced-motion', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }, async page => {
    await page.goto(`${origin}/faqs/?lang=en`)
    await page.locator('.icue-chat__toggle').click()
    await panelFits(page)
    assert.ok((await page.locator('.icue-mascot *').evaluateAll(elements => elements.map(el => getComputedStyle(el).animationName))).every(name => name === 'none'))
    await shot(page, 'small-phone-reduced-motion')
    await send(page, question); await mascotState(page, 'happy')
    await panelFits(page)
  })

  await run('network-loss-and-retry', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async (page, context) => {
    let blockKnowledge = true
    let blocked = 0
    await page.route(/\/kb\.[a-z]{2}(?:-[\w-]+)?\.json/, route => {
      if (blockKnowledge) { blocked++; return route.abort('internetdisconnected') }
      return route.continue()
    })
    await page.goto(`${origin}/faqs/?lang=en`)
    await page.locator('.icue-chat__toggle').click()
    await context.setOffline(true)
    await send(page, question)
    await mascotState(page, 'confused')
    assert.ok(blocked > 0)
    assert.ok(!(await page.locator('.icue-chat__messages').innerText()).includes(expectedAnswer))
    blockKnowledge = false
    await context.setOffline(false)
    await send(page, question)
    await mascotState(page, 'happy')
    assert.ok((await page.locator('.icue-chat__messages').innerText()).includes(expectedAnswer))
    await shot(page, 'reconnected')
  })

  await run('retrieval-error-and-retry', { viewport: { width: 1440, height: 1000 } }, async page => {
    await page.goto(`${origin}/faqs/?lang=en`)
    await page.locator('.icue-chat__toggle').click()
    // Throw from the platform boundary used by actual retrieval, without
    // replacing chatbot source, response data, or accessing React internals.
    await page.evaluate(() => {
      window.restoreChatSegmenter = Intl.Segmenter.prototype.segment
      Intl.Segmenter.prototype.segment = function () { throw new Error('QA: segmentation unavailable') }
    })
    await send(page, question); await mascotState(page, 'error')
    assert.ok((await page.locator('.icue-chat__messages').innerText()).includes(labels.error))
    await shot(page, 'error')
    await page.evaluate(() => {
      Intl.Segmenter.prototype.segment = window.restoreChatSegmenter
      delete window.restoreChatSegmenter
    })
    await send(page, question); await mascotState(page, 'happy')
    assert.ok((await page.locator('.icue-chat__messages').innerText()).includes(expectedAnswer))
  })

  await run('site-wide-history-and-sleep', { viewport: { width: 1440, height: 1000 } }, async page => {
    await page.goto(`${origin}/faqs/?lang=en`)
    await page.locator('.icue-chat__toggle').click()
    await send(page, question); await mascotState(page, 'happy')
    for (const route of ['/our-work/', '/people/experts', '/legal/privacy', '/newsroom/']) {
      await page.goto(`${origin}${route}?lang=en`)
      await page.locator('.icue-chat__toggle').click()
      assert.equal(await page.locator('.icue-chat').count(), 1)
      assert.ok((await page.locator('.icue-chat__messages').innerText()).includes(expectedAnswer))
    }
    await page.locator('.icue-chat__close').click()
    await page.clock.install()
    // Restart the idle timer using a real interaction, then advance browser time.
    await page.keyboard.press('Shift')
    await page.clock.fastForward(61_000)
    await page.locator('.icue-mascot--launcher[data-state="sleeping"]').waitFor()
    await page.locator('.icue-chat__toggle').hover()
    // CSS transition time in WebKit is independent of the mocked JS clock.
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.icue-mascot--launcher [data-face="curious"]')).opacity === '1')
    await page.locator('.icue-chat__toggle').click()
    await mascotState(page, 'greeting')
  })

  if (process.env.ICUE_SYNC_QA === '1') {
    await run('encrypted-cross-device-sync', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async (page, context) => {
      const second = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true })
      const other = await second.newPage()
      const ui = JSON.parse(await fs.readFile(new URL('../shared/chatbot/locales/en.json', import.meta.url))).sync
      const settings = async target => { await target.locator('.icue-chat__sync').click(); await target.locator('.icue-chat-sync').waitFor() }
      const status = (target, name) => target.locator('.icue-chat-sync__status').filter({ hasText: ui.status[name] }).waitFor()
      try {
        await page.goto(`${origin}/faqs/?lang=en`)
        await page.locator('.icue-chat__toggle').click()
        await send(page, question); await mascotState(page, 'happy')
        await settings(page)
        await page.getByRole('button', { name: ui.start, exact: true }).click()
        await status(page, 'ready')
        const code = await page.locator('.icue-chat-sync__code').inputValue()
        assert.match(code, /^icue1\./)
        await shot(page, 'sync-linked')
        await other.goto(`${origin}/our-work/?lang=en`)
        await other.locator('.icue-chat__toggle').click()
        await settings(other)
        await other.locator('.icue-chat-sync__code').fill(code)
        await other.getByRole('button', { name: ui.join, exact: true }).click()
        await status(other, 'ready')
        await other.getByRole('button', { name: ui.back, exact: false }).click()
        assert.ok((await other.locator('.icue-chat__messages').innerText()).includes(expectedAnswer))
        await second.setOffline(true)
        await send(other, 'quux quasar zyzzyva'); await mascotState(other, 'confused')
        await settings(other); await status(other, 'offline')
        await second.setOffline(false)
        await status(other, 'ready')
        await page.getByRole('button', { name: ui.retry, exact: true }).click()
        await status(page, 'ready')
        await page.getByRole('button', { name: ui.back, exact: false }).click()
        assert.ok((await page.locator('.icue-chat__messages').innerText()).includes('quux quasar zyzzyva'))
        await page.reload()
        await page.locator('.icue-chat__toggle').click()
        await settings(page); await status(page, 'ready')
        assert.equal(await page.locator('.icue-chat-sync__code').inputValue(), code)
        await page.getByRole('button', { name: ui.remove, exact: true }).click()
        await page.getByRole('button', { name: ui.confirm, exact: true }).click()
        await status(page, 'local')
        await other.getByRole('button', { name: ui.retry, exact: true }).click()
        await status(other, 'missing')
        await other.getByRole('button', { name: ui.disconnect, exact: true }).click()
        await other.getByRole('button', { name: ui.back, exact: false }).click()
        assert.ok((await other.locator('.icue-chat__messages').innerText()).includes(expectedAnswer))
        assert.ok(!(await page.locator('.icue-chat-sync__code').inputValue()))
      } finally { await second.close() }
    })
  }

  for (const locale of ['vi', 'en', 'de', 'fr', 'ko', 'ja']) {
    await run(`locale-${locale}`, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async page => {
      const copy = JSON.parse(await fs.readFile(new URL(`../faq-app/src/locales/${locale}.json`, import.meta.url))).chat
      await page.goto(`${origin}/faqs/?lang=${locale}`)
      await page.getByRole('button', { name: copy.open, exact: true }).click()
      await page.getByRole('dialog', { name: copy.title, exact: true }).waitFor()
      await page.waitForTimeout(350)
      await panelFits(page)
      await page.getByRole('button', { name: copy.suggestions[0], exact: true }).click()
      await mascotState(page, 'happy')
      assert.ok(!(await page.locator('.icue-chat__messages').innerText()).includes(copy.error))
      await page.getByRole('button', { name: copy.close, exact: true }).first().click()
    })
  }
} finally {
  await browser.close()
  await fs.writeFile(path.join(output, `${engine}-results.json`), JSON.stringify(results, null, 2))
}
assert.ok(results.every(result => result.passed), `${results.filter(result => !result.passed).length} browser cases failed`)
