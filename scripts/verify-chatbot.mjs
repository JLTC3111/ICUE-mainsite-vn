import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getFaqEntries, FAQ_REVIEW_FLAGS } from '../shared/faq-content/index.js'
import BOT_COPY from '../shared/chatbot/lib/botCopy.js'
import { findQuickTopic, normalizeForSearch } from '../shared/chatbot/lib/matching.js'

const KB_LANGUAGES = ['en', 'vi']
const FAQ_LANGUAGES = ['vi', 'en', 'de', 'fr', 'ko', 'ja']

async function readKb(language) {
  const raw = await readFile(new URL(`../public/chatbot/kb.${language}.json`, import.meta.url), 'utf8')
  return JSON.parse(raw)
}

function validateKb(kb, expectedLanguage) {
  assert.equal(kb.version, 2, `${expectedLanguage}: expected knowledge-base version 2`)
  assert.equal(kb.language, expectedLanguage, `${expectedLanguage}: language mismatch`)
  assert.ok(Array.isArray(kb.intents) && kb.intents.length > 0, `${expectedLanguage}: no intents`)
  assert.equal(typeof kb.fallback?.answer, 'string', `${expectedLanguage}: fallback is missing`)

  const ids = new Set()
  const candidates = new Map()

  for (const intent of kb.intents) {
    assert.match(intent.id || '', /^[a-z][a-z0-9_]*$/, `${expectedLanguage}: invalid intent id`)
    assert.ok(!ids.has(intent.id), `${expectedLanguage}: duplicate intent id ${intent.id}`)
    ids.add(intent.id)
    assert.ok(String(intent.label || '').trim(), `${expectedLanguage}:${intent.id}: label is missing`)
    assert.ok(String(intent.answer || '').trim(), `${expectedLanguage}:${intent.id}: answer is missing`)

    const groups = [
      ['keyword', intent.keywords],
      ['phrase', intent.phrases],
      ['ambiguous', intent.ambiguousKeywords || []],
    ]
    assert.ok(groups.some(([, values]) => Array.isArray(values) && values.length > 0),
      `${expectedLanguage}:${intent.id}: no authored candidates`)

    for (const [kind, values] of groups) {
      assert.ok(Array.isArray(values), `${expectedLanguage}:${intent.id}: ${kind} candidates must be an array`)
      for (const value of values) {
        const normalized = normalizeForSearch(value)
        assert.ok(normalized, `${expectedLanguage}:${intent.id}: empty normalized ${kind}`)
        const occurrences = candidates.get(normalized) || []
        occurrences.push({ intentId: intent.id, kind, value })
        candidates.set(normalized, occurrences)
      }
    }

    for (const link of intent.links || []) {
      assert.ok(String(link.label || '').trim(), `${expectedLanguage}:${intent.id}: link label missing`)
      assert.match(link.url || '', /^\/[a-z0-9/_-]*$/i, `${expectedLanguage}:${intent.id}: invalid link`)
    }
  }

  for (const [candidate, occurrences] of candidates) {
    const intentIds = new Set(occurrences.map(({ intentId }) => intentId))
    if (intentIds.size <= 1) continue
    assert.ok(
      occurrences.every(({ kind }) => kind === 'ambiguous'),
      `${expectedLanguage}: cross-intent collision "${candidate}" in ${[...intentIds].join(', ')}`,
    )
  }

  return kb.intents.map(({ id }) => id)
}

function validateFaqParity() {
  const sourceIds = getFaqEntries('vi').map(({ id }) => id)
  for (const language of FAQ_LANGUAGES) {
    const entries = getFaqEntries(language)
    assert.deepEqual(entries.map(({ id }) => id), sourceIds, `${language}: FAQ id/order drift`)
    for (const entry of entries) {
      assert.ok(String(entry.q || '').trim(), `${language}:${entry.id}: question missing`)
      assert.ok(String(entry.a || '').trim(), `${language}:${entry.id}: answer missing`)
    }
  }

  for (const [id, review] of Object.entries(FAQ_REVIEW_FLAGS)) {
    assert.ok(sourceIds.includes(id), `FAQ review flag references unknown id ${id}`)
    assert.ok(review.owner, `${id}: review owner missing`)
    assert.match(review.flaggedAt || '', /^\d{4}-\d{2}-\d{2}$/, `${id}: review flag date missing`)
    assert.ok(review.reason, `${id}: review reason missing`)
    assert.equal(review.status, 'needs-review', `${id}: unexpected review status`)
    assert.equal(review.chatbotEligible, false, `${id}: risky claim must be excluded from chatbot`)
  }

  return sourceIds.length
}

async function validateLegacyMirrors() {
  const paths = [
    '../src/script.js',
    '../legacy/script.js',
    '../home-app/public/legacy/script.js',
  ]
  const [source, ...mirrors] = await Promise.all(
    paths.map((path) => readFile(new URL(path, import.meta.url), 'utf8')),
  )
  for (let index = 0; index < mirrors.length; index += 1) {
    assert.equal(mirrors[index], source, `${paths[index + 1]} drifted from src/script.js`)
  }
  assert.ok(source.includes('ambiguousKeywords'), 'legacy runtime ignores deliberate ambiguities')
  assert.ok(!source.includes('return 0.92;'), 'legacy runtime still contains the overconfident match shortcut')
}

async function validateLocalizedSuggestions() {
  for (const language of ['de', 'fr', 'ko', 'ja']) {
    const [faqLocale, recruitmentLocale] = await Promise.all([
      readFile(new URL(`../faq-app/src/locales/${language}.json`, import.meta.url), 'utf8'),
      readFile(new URL(`../recruitment-app/src/locales/${language}.json`, import.meta.url), 'utf8'),
    ])
    const faqSuggestions = JSON.parse(faqLocale).chat.suggestions
    const recruitmentSuggestions = JSON.parse(recruitmentLocale).chat.suggestions
    assert.deepEqual(recruitmentSuggestions, faqSuggestions, `${language}: chatbot suggestion drift`)
    for (const suggestion of faqSuggestions) {
      const topic = findQuickTopic(BOT_COPY[language]?.quickTopics, suggestion)
      assert.ok(topic, `${language}: suggestion "${suggestion}" has no quick-topic response`)
      assert.ok(topic.answer, `${language}:${topic.id}: quick-topic answer missing`)
      assert.ok((topic.links || []).every((target) => ['faqs', 'contact'].includes(target)),
        `${language}:${topic.id}: invalid quick-topic link target`)
    }
  }
}

const knowledgeBases = Object.fromEntries(
  await Promise.all(KB_LANGUAGES.map(async (language) => [language, await readKb(language)])),
)
const enIds = validateKb(knowledgeBases.en, 'en')
const viIds = validateKb(knowledgeBases.vi, 'vi')
assert.deepEqual(viIds, enIds, 'English/Vietnamese intent id or order drift')
const faqCount = validateFaqParity()
await validateLegacyMirrors()
await validateLocalizedSuggestions()

console.log(
  `Chatbot verified: ${enIds.length} intents in ${KB_LANGUAGES.length} languages; ` +
    `${faqCount} FAQ records in ${FAQ_LANGUAGES.length} languages; ` +
    `${Object.keys(FAQ_REVIEW_FLAGS).length} variable claims held for review.`,
)
