import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { PAST_PROJECTS, pastProjectPath } from '../home-app/src/data/pastProjectsContent.js'
import { getJobs } from '../recruitment-app/src/data/jobs.js'
import { PROJECT_NAMES, SITE_TOPICS } from '../shared/chatbot/content/siteTopics.js'
import { QUESTION_VARIANTS } from '../shared/chatbot/content/questionVariants.js'
import { normalizeForSearch } from '../shared/chatbot/lib/matching.js'

const root = new URL('../', import.meta.url)
const languages = ['vi', 'en', 'de', 'fr', 'ko', 'ja']
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const plain = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').normalize('NFC').trim()
const unique = values => [...new Map(values.filter(Boolean).map(value => [normalizeForSearch(value), plain(value)])).values()]
const snake = value => value.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/-/g, '_').toLowerCase()

function record({ id, label, answer, aliases, url, path, facts = {}, entities = [] }) {
  const text = plain(answer)
  assert.ok(text && label && url, `${id}: incomplete site content`)
  return {
    id, label: plain(label), keywords: unique([label, ...aliases]), phrases: [],
    answer: text, links: [{ label: plain(label), url }], facts, entities: unique(entities),
    source: {
      kind: 'site', path, url,
      // A content fingerprint is provenance, not a claim of editorial approval.
      contentHash: createHash('sha256').update(JSON.stringify({ text, facts })).digest('hex'),
    },
  }
}

export async function generateSiteIntents(language) {
  const path = `home-app/src/locales/${language}.json`
  const home = await readJson(path)
  const people = await readJson('people-app/src/data/people.json')
  const vocabulary = SITE_TOPICS[language]
  const records = []
  const about = {
    about_icue: home.about.weAre.body,
    institute_history: home.about.slides[0],
    research_activities: home.about.slides[2],
    technology_transfer: home.about.slides[3],
  }
  for (const [id, answer] of Object.entries(about)) {
    records.push(record({ id, label: vocabulary[id][0], aliases: vocabulary[id].slice(1), answer, url: '/about-us', path }))
  }
  for (const project of PAST_PROJECTS) {
    const copy = home.projects.items[project.key]
    assert.ok(copy, `${language}: missing project ${project.key}`)
    records.push(record({
      id: `project_${snake(project.key)}`, label: copy.title,
      aliases: [...PROJECT_NAMES[project.key], ...PROJECT_NAMES[project.key].map(name => vocabulary.project.replace('{name}', name))],
      answer: `${copy.title}\n${copy.location}. ${copy.scale}\n\n${copy.body}`,
      url: pastProjectPath(project.id), path: `${path}#projects.items.${project.key}`,
      facts: { location: copy.location, scale: copy.scale },
      entities: PROJECT_NAMES[project.key],
    }))
  }
  for (const person of people) {
    const copy = person.i18n[language]
    assert.ok(copy, `${language}: missing profile ${person.id}`)
    const names = unique([copy.name, person.i18n.vi.name, person.i18n.en.name])
    records.push(record({
      id: `person_${snake(person.id)}`, label: copy.name,
      aliases: [...names, ...names.map(name => vocabulary.person.replace('{name}', name))],
      answer: `${[copy.honorific, copy.name].filter(Boolean).join(' ')} — ${copy.title}\n\n${copy.bio}`,
      url: `/people/${person.group === 'experts' ? 'experts' : 'core-team'}`,
      path: `people-app/src/data/people.json#${person.id}.i18n.${language}`,
      entities: names,
    }))
  }
  for (const job of getJobs(language)) {
    records.push(record({
      id: `job_${snake(job.id)}`, label: job.title,
      aliases: [vocabulary.job.replace('{name}', job.title)],
      answer: `${job.title} — ${job.location}\n\n${job.description}\n\n${job.tags.join(' · ')}`,
      url: '/recruitment', path: `recruitment-app/src/data/jobs.js#${job.id}.${language}`,
      facts: { location: job.location, requirements: job.tags.join(' · ') },
    }))
  }
  return records
}

export async function buildChatbotKnowledge({ check = false } = {}) {
  let changed = 0
  const people = await readJson('people-app/src/data/people.json')
  const entityNames = unique([
    ...Object.values(PROJECT_NAMES).flat(),
    ...people.flatMap(person => Object.values(person.i18n).map(copy => copy.name)),
  ])
  for (const language of languages) {
    const url = new URL(`public/chatbot/kb.${language}.json`, root)
    const original = await readFile(url, 'utf8')
    const kb = JSON.parse(original)
    kb.entityNames = entityNames
    // Authored service answers remain editable here; only site records regenerate.
    kb.intents = [
      ...kb.intents.filter(intent => intent.source?.kind !== 'site').map(intent => ({
        ...intent, aliases: QUESTION_VARIANTS[language][intent.id] || [],
      })),
      ...await generateSiteIntents(language),
    ]
    const output = `${JSON.stringify(kb, null, 2)}\n`
    if (output === original) continue
    assert.ok(!check, `${language}: site knowledge is stale. Run npm run prepare:chatbot.`)
    await writeFile(url, output)
    changed++
  }
  return changed
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const changed = await buildChatbotKnowledge({ check: process.argv.includes('--check') })
  console.log(`Chatbot site knowledge ${process.argv.includes('--check') ? 'verified' : 'prepared'} (${changed} files updated).`)
}
