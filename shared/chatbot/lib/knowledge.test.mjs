import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createChatbotKnowledge, KB_LANGUAGES } from './knowledge.js'
import { createBotCopy } from './botCopy.js'
import { FOLLOW_UPS } from './conversation.js'
import { generateSiteIntents } from '../../../scripts/build-chatbot-knowledge.mjs'

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const questions = await readJson('../content/questions.json')
const databases = Object.fromEntries(await Promise.all(KB_LANGUAGES.map(async language =>
  [language, await readJson(`../../../public/chatbot/kb.${language}.json`)],
)))
const copy = createBotCopy({ faqsUrl: '/faqs', contactUrl: '/contact' })

function fixture(t, language) {
  t.mock.method(globalThis, 'fetch', async url => {
    const lang = String(url).match(/kb\.([a-z]{2})\.json$/)?.[1]
    assert.ok(databases[lang], `Unexpected network request: ${url}`)
    return { ok: true, json: async () => databases[lang] }
  })
  return createChatbotKnowledge({ siteLang: language, copy })
}

for (const language of KB_LANGUAGES) {
  test(`${language}: the maintained question bank retrieves the expected source`, async t => {
    const knowledge = fixture(t, language)
    const failures = []
    for (const item of questions.filter(item => item.language === language)) {
      const response = await knowledge.getResponse(item.query)
      if (item.intent ? response.meta.intentId !== item.intent || response.meta.source !== 'intent'
        : response.meta.source !== item.source) failures.push({ ...item, actual: response.meta })
      if (item.intent && response.meta.intentId === item.intent) {
        const intent = databases[language].intents.find(intent => intent.id === item.intent)
        assert.equal(response.content, intent.answer, `${item.query}: wrong answer language or text`)
        assert.deepEqual(response.links, intent.links || [])
      }
    }
    assert.deepEqual(failures, [])
  })

  test(`${language}: chained follow-ups retain the service, respect topic changes and avoid guessing`, async t => {
    const knowledge = fixture(t, language)
    const question = databases[language].intents.find(intent => intent.id === 'planning_design').keywords[0]
    let reply = await knowledge.getResponse(question)
    assert.equal(reply.context.intentId, 'planning_design')
    for (const [type, expected] of [['documents', 'documents_required'], ['timeline', 'timeline_duration'], ['pricing', 'pricing_fees']]) {
      reply = await knowledge.getResponse(FOLLOW_UPS[language][type][0], { context: reply.context })
      assert.equal(reply.meta.intentId, expected)
      assert.equal(reply.meta.contextIntentId, 'planning_design')
      assert.equal(reply.context.intentId, 'planning_design')
      assert.ok(reply.content.includes(databases[language].intents.find(intent => intent.id === expected).answer))
    }
    const job = databases[language].intents.find(intent => intent.id === 'job_research_intern')
    reply = await knowledge.getResponse(job.label, { context: reply.context })
    assert.equal(reply.context.intentId, job.id)
    reply = await knowledge.getResponse(FOLLOW_UPS[language].documents[0], { context: reply.context })
    assert.equal(reply.meta.intentId, 'recruitment', 'job application must not request land-use documents')
    assert.equal(reply.context.intentId, job.id)
    reply = await knowledge.getResponse(FOLLOW_UPS[language].location[0], { context: reply.context })
    assert.ok(reply.content.includes(job.facts.location))
    reply = await knowledge.getResponse(FOLLOW_UPS[language].timeline[0], { context: reply.context })
    assert.equal(reply.meta.source, 'clarification', 'do not invent a job or internship duration')
    assert.equal(reply.context.intentId, job.id)
    const project = databases[language].intents.find(intent => intent.id === 'project_hop_thanh')
    reply = await knowledge.getResponse(project.label, { context: reply.context })
    for (const type of ['location', 'scale']) {
      reply = await knowledge.getResponse(FOLLOW_UPS[language][type][0], { context: reply.context })
      assert.equal(reply.meta.intentId, project.id)
      assert.ok(reply.content.includes(project.facts[type]))
    }
    reply = await knowledge.getResponse('quux quasar zyzzyva', { context: reply.context })
    assert.equal(reply.meta.source, 'fallback')
    assert.ok(!reply.context, 'unrelated requests must release the topic')
  })
}

test('generated answers stay identical to current site sources and exclude held FAQ claims', async () => {
  for (const language of KB_LANGUAGES) {
    const generated = await generateSiteIntents(language)
    assert.deepEqual(databases[language].intents.filter(intent => intent.source?.kind === 'site'), generated)
    assert.equal(generated.length, 26)
    assert.ok(generated.every(intent => intent.source.path && intent.links.length && intent.answer.length < 4000))
    assert.ok(generated.every(intent => !intent.source.path.includes('faq-content')))
  }
})

test('a forged, stale or differently localized context never supplies an answer', async t => {
  const knowledge = fixture(t, 'en')
  for (const context of [{ intentId: 'nonexistent', language: 'en' }, { intentId: 'job_research_intern', language: 'vi' }]) {
    const reply = await knowledge.getResponse('What documents?', { context })
    assert.equal(reply.meta.contextIntentId, undefined)
    assert.notEqual(reply.meta.intentId, 'recruitment')
  }
})
