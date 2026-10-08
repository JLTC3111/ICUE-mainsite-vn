import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceModule } from '../../shared/resilience/testHarness.js'

for (const app of ['people','structure','ourwork','contact','community','news']) {
  for (const search of ['', '?site=en', '?lang=en']) {
    test(`${app} entry-site detection survives blocked session storage (${search || 'default'})`, async () => {
      const storage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
      const mod = await sourceModule(`${app}-app/src/lib/siteOrigin.js`, { globals: {
        sessionStorage: storage, document: { referrer: '' }, window: { location: { search, hostname: 'icue.vn', pathname: `/${app}/` } },
      } })
      assert.ok(['vi','en'].includes(mod.detectEntrySite()))
      if (search === '?site=en') assert.equal(mod.detectEntrySite(), 'en')
    })
  }
}

test('schema fallback still reads articles when cover_info is absent and preferences cannot be written', async () => {
  const storage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  const mod = await sourceModule('news-app/src/lib/articleReadModel.js', { globals: { sessionStorage: storage } })
  let calls = 0
  const row = { id: 'article' }
  const data = await mod.runArticleSelect(async select => {
    calls++
    return select.includes('cover_info') ? { error: { code: '42703', message: 'column cover_info does not exist' } } : { data: row }
  })
  assert.equal(calls, 2)
  assert.deepEqual(data, row)
})
