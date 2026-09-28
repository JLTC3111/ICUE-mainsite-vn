// Real browser retrieval checks, including operation after going offline.
// Playwright is an external QA-only dependency, as in check-chatbot-mascot.mjs.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { FOLLOW_UPS } from '../shared/chatbot/lib/conversation.js'

const playwright = await import(process.env.ICUE_PLAYWRIGHT_MODULE || 'playwright')
const engine = process.env.ICUE_KNOWLEDGE_ENGINE || 'chromium'
const origin = process.env.ICUE_KNOWLEDGE_URL || 'http://127.0.0.1:3118'
const output = process.env.ICUE_KNOWLEDGE_OUTPUT || '/private/tmp/icue-knowledge-qa'
await mkdir(output, { recursive: true })
const browser = await playwright[engine].launch({ headless: true,
  ...(process.env.ICUE_BROWSER_EXECUTABLE ? { executablePath: process.env.ICUE_BROWSER_EXECUTABLE } : {}),
})
const results = []
const routes = { vi: '/', en: '/faqs/', de: '/recruitment/', fr: '/people/experts', ko: '/our-work/', ja: '/community-activities/' }
try {
  for (const language of ['vi', 'en', 'de', 'fr', 'ko', 'ja']) {
    const context = await browser.newContext({ viewport: engine === 'webkit' ? { width: 390, height: 844 } : { width: 1440, height: 1000 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.setDefaultTimeout(15_000)
    await page.addInitScript(() => {
      window.knowledgeResponses = []
      window.addEventListener('icue:chatbot-event', event => {
        if (event.detail.type === 'response') window.knowledgeResponses.push(event.detail)
      })
    })
    const kb = JSON.parse(await readFile(new URL(`../public/chatbot/kb.${language}.json`, import.meta.url)))
    const labels = JSON.parse(await readFile(new URL(`../faq-app/src/locales/${language}.json`, import.meta.url))).chat
    const intent = id => kb.intents.find(item => item.id === id)
    async function ask(question, expected) {
      const count = await page.evaluate(() => window.knowledgeResponses.length)
      await page.locator('.icue-chat__input').fill(question)
      await page.locator('.icue-chat__send').click()
      await page.waitForFunction(count => window.knowledgeResponses.length > count, count)
      const meta = await page.evaluate(() => window.knowledgeResponses.at(-1))
      for (const [key, value] of Object.entries(expected)) assert.equal(meta[key], value, `${language}: ${question}: ${JSON.stringify(meta)}`)
      return page.locator('.icue-chat__message--bot .icue-chat__bubble').last()
    }
    try {
      await page.goto(`${origin}${routes[language]}?lang=${language}`)
      await page.getByRole('button', { name: labels.open, exact: true }).click()
      await ask(intent('planning_design').keywords[0], { intentId: 'planning_design' })
      // All subsequent answers must come from the already-loaded static corpus.
      await context.setOffline(true)
      await ask(FOLLOW_UPS[language].documents[0], { intentId: 'documents_required', contextIntentId: 'planning_design' })
      await ask(FOLLOW_UPS[language].timeline[0], { intentId: 'timeline_duration', contextIntentId: 'planning_design' })
      let bubble = await ask(intent('project_hop_thanh').label, { intentId: 'project_hop_thanh' })
      assert.ok((await bubble.innerText()).includes(intent('project_hop_thanh').facts.scale))
      assert.equal(await bubble.locator('a').first().getAttribute('href'), '/past-projects/2')
      bubble = await ask(FOLLOW_UPS[language].location[0], { intentId: 'project_hop_thanh' })
      assert.ok((await bubble.innerText()).includes(intent('project_hop_thanh').facts.location))
      await ask(intent('job_research_intern').label, { intentId: 'job_research_intern' })
      bubble = await ask(FOLLOW_UPS[language].documents[0], { intentId: 'recruitment', contextIntentId: 'job_research_intern' })
      assert.ok((await bubble.innerText()).includes(intent('recruitment').answer))
      await page.screenshot({ path: `${output}/${engine}-${language}-follow-up.png` })
      await ask(FOLLOW_UPS[language].timeline[0], { source: 'clarification' })
      await ask('quux quasar zyzzyva', { source: 'fallback' })
      if (language === 'en') {
        await ask('project managment', { intentId: 'project_management' })
        await ask('quote', { source: 'clarification' })
      }
      const layout = await page.locator('.icue-chat__window').evaluate(panel => {
        const rect = panel.getBoundingClientRect()
        const input = panel.querySelector('.icue-chat__input').getBoundingClientRect()
        return { fits: rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1,
          inputVisible: input.bottom <= innerHeight && input.top >= rect.top,
          pageOverflow: document.documentElement.scrollWidth > innerWidth + 1 }
      })
      assert.deepEqual(layout, { fits: true, inputVisible: true, pageOverflow: false })
      assert.deepEqual(errors, [])
      results.push({ engine, language, passed: true })
      console.log(`PASS ${engine}: ${language} sources, follow-ups, offline answers and layout`)
    } catch (error) {
      results.push({ engine, language, passed: false, error: error.message, errors })
      await page.screenshot({ path: `${output}/${engine}-${language}-FAILED.png` }).catch(() => {})
      console.error(`FAIL ${engine}: ${language}: ${error.message}`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
  await writeFile(`${output}/${engine}-results.json`, JSON.stringify(results, null, 2))
}
if (results.some(result => !result.passed)) process.exitCode = 1
