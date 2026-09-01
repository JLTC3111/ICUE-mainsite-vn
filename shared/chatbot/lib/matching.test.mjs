import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { getFaqEntries } from '../../faq-content/index.js'
import { createBotCopy } from './botCopy.js'
import {
  findQuickTopic,
  isAmbiguousIntentMatch,
  normalizeForSearch,
  rankFaqEntries,
  rankIntents,
  scoreTokens,
  tokenize,
} from './matching.js'

const INTENT_THRESHOLD = 0.52
const FAQ_THRESHOLD = 0.58
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))

async function readKb(language) {
  const raw = await readFile(`${repoRoot}public/chatbot/kb.${language}.json`, 'utf8')
  return prepareKb(JSON.parse(raw))
}

function prepareKb(kb) {
  return {
    ...kb,
    intents: kb.intents.map((intent) => {
      const candidates = [
        ...(intent.keywords || []),
        ...(intent.phrases || []),
        ...(intent.ambiguousKeywords || []),
      ].map(normalizeForSearch)
      return {
        ...intent,
        candidates,
        candidateTokens: candidates.map((candidate) => tokenize(candidate, kb.language)),
      }
    }),
  }
}

function route(kb, query, faqLanguage = kb.language) {
  const queryNorm = normalizeForSearch(query)
  const queryTokens = tokenize(queryNorm, kb.language)
  const intents = rankIntents(kb.intents, queryNorm, queryTokens)
  const faq = rankFaqEntries(
    getFaqEntries(faqLanguage).filter((entry) => entry.review?.chatbotEligible !== false),
    queryNorm,
    tokenize(queryNorm, faqLanguage),
    faqLanguage,
  )[0]

  if ((faq?.score || 0) >= FAQ_THRESHOLD && faq.score >= (intents[0]?.score || 0)) {
    return { source: 'faq', id: faq.id }
  }
  if (isAmbiguousIntentMatch(intents[0], intents[1], INTENT_THRESHOLD)) {
    return { source: 'clarification', ids: [intents[0].intent.id, intents[1].intent.id] }
  }
  if ((intents[0]?.score || 0) >= INTENT_THRESHOLD) {
    return { source: 'intent', id: intents[0].intent.id }
  }
  return { source: 'fallback' }
}

test('a contained generic word no longer receives a near-perfect score', () => {
  const query = normalizeForSearch('Chi phí dịch vụ tính thế nào?')
  const candidate = normalizeForSearch('dịch vụ')
  const score = scoreTokens(tokenize(query, 'vi'), tokenize(candidate, 'vi'), query, candidate)
  assert.ok(score < 0.7)
})

test('normalization retains Korean and Japanese text', () => {
  assert.notEqual(normalizeForSearch('어떤 자문 서비스를 제공하나요?'), '')
  assert.notEqual(normalizeForSearch('どのようなコンサルティングを提供していますか。'), '')
})

test('English regressions route to the intended authored response', async () => {
  const kb = await readKb('en')
  assert.deepEqual(route(kb, 'design'), { source: 'intent', id: 'planning_design' })
  assert.deepEqual(route(kb, 'project management'), { source: 'intent', id: 'project_management' })
  assert.deepEqual(route(kb, 'community'), { source: 'intent', id: 'community' })
  assert.deepEqual(route(kb, 'press'), { source: 'intent', id: 'media_press' })
  assert.deepEqual(route(kb, 'Can I quote ICUE in my article?'), { source: 'intent', id: 'media_press' })
  assert.deepEqual(route(kb, 'I want to schedule a meeting'), { source: 'intent', id: 'schedule_meeting' })
  assert.deepEqual(route(kb, 'How are service fees calculated?'), { source: 'intent', id: 'pricing_fees' })
})

test('an intentionally ambiguous one-word query asks for clarification', async () => {
  const kb = await readKb('en')
  const result = route(kb, 'quote')
  assert.equal(result.source, 'clarification')
  assert.deepEqual(new Set(result.ids), new Set(['pricing_fees', 'media_press']))
})

test('Vietnamese regressions route to the intended authored response', async () => {
  const kb = await readKb('vi')
  assert.deepEqual(route(kb, 'thiết kế'), { source: 'intent', id: 'planning_design' })
  assert.deepEqual(route(kb, 'quản lý dự án'), { source: 'intent', id: 'project_management' })
  assert.deepEqual(route(kb, 'cộng đồng'), { source: 'intent', id: 'community' })
  assert.deepEqual(route(kb, 'Tôi muốn hẹn tư vấn'), { source: 'intent', id: 'schedule_meeting' })
  assert.deepEqual(route(kb, 'Chi phí dịch vụ tính thế nào?'), { source: 'intent', id: 'pricing_fees' })
})

test('localized non-Latin FAQ questions remain searchable', async () => {
  const kb = await readKb('en')
  assert.deepEqual(
    route(kb, '어떤 자문 서비스를 제공하나요?', 'ko'),
    { source: 'faq', id: 'services.1' },
  )
  assert.deepEqual(
    route(kb, 'どのようなコンサルティングを提供していますか。', 'ja'),
    { source: 'faq', id: 'services.1' },
  )
})

test('localized suggestion chips resolve without falling into unsupported-language copy', () => {
  const copy = createBotCopy({ faqsUrl: '/faqs', contactUrl: '/contact' })
  assert.equal(findQuickTopic(copy('de').quickTopics, 'Honorare')?.id, 'pricing')
  assert.equal(findQuickTopic(copy('fr').quickTopics, 'Prestations')?.id, 'services')
  assert.equal(findQuickTopic(copy('ko').quickTopics, '문의')?.id, 'contact')
  assert.equal(findQuickTopic(copy('ja').quickTopics, '費用')?.id, 'pricing')
})

test('variable commercial and legal FAQ claims are excluded from chatbot retrieval', () => {
  const excluded = getFaqEntries('en')
    .filter((entry) => entry.review?.chatbotEligible === false)
    .map((entry) => entry.id)
  assert.deepEqual(excluded, [
    'services.2',
    'costs.1',
    'costs.2',
    'legal.1',
    'legal.2',
    'timeline.1',
    'timeline.2',
    'clients.2',
    'general.2',
  ])
})
