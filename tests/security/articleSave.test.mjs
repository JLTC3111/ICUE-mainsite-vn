import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { sourceModule } from '../../shared/resilience/testHarness.js'

// Fake only the network/storage boundary. Faults can occur before a commit or
// after it, matching the two outcomes of a disconnected write request.
async function fixture() {
  const tables = { articles: new Map(), article_media: new Map() }
  const uploads = new Map()
  const calls = []
  let fault = null
  const failure = () => ({ data: null, error: new Error('simulated connection loss') })
  class Query {
    constructor(table) { this.table = table; this.operation = 'select'; this.filters = [] }
    select() { return this }
    insert(payload) { this.operation = 'insert'; this.payload = payload; return this }
    update(payload) { this.operation = 'update'; this.payload = payload; return this }
    delete() { this.operation = 'delete'; return this }
    eq(key, value) { this.filters.push(row => row[key] === value); return this }
    in(key, values) { this.filters.push(row => values.includes(row[key])); return this }
    single() { this.one = true; return this }
    maybeSingle() { this.one = true; return this }
    then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject) }
    execute() {
      calls.push({ table: this.table, operation: this.operation, payload: structuredClone(this.payload) })
      const activeFault = fault?.table === this.table && fault?.operation === this.operation ? fault : null
      if (activeFault) fault = null
      if (activeFault?.when === 'before') return failure()
      const table = tables[this.table]
      let selected = [...table.values()].filter(row => this.filters.every(filter => filter(row)))
      if (this.operation === 'insert') {
        if (table.has(this.payload.id)) return { error: Object.assign(new Error('duplicate id'), { code: '23505' }) }
        if (this.table === 'article_media' && selected.filter(row => row.article_id === this.payload.article_id && row.kind === 'image').length >= 10) return { error: new Error('maximum images reached') }
        const row = { published_at: null, ...structuredClone(this.payload) }
        table.set(row.id, row)
        selected = [row]
      }
      if (this.operation === 'update') selected.forEach(row => Object.assign(row, structuredClone(this.payload)))
      if (this.operation === 'delete') selected.forEach(row => table.delete(row.id))
      if (activeFault?.when === 'after') return failure()
      return { data: structuredClone(this.one ? selected[0] ?? null : selected), error: null }
    }
  }
  const supabase = {
    from: table => new Query(table),
    storage: { from: () => ({
      async upload(path, file, options) {
        calls.push({ table: 'storage', operation: 'upload', path })
        const activeFault = fault?.table === 'storage' ? fault : null
        if (activeFault) fault = null
        if (activeFault?.when === 'before') return failure()
        if (uploads.has(path) && !options.upsert) return { error: new Error('duplicate upload') }
        uploads.set(path, file)
        return activeFault?.when === 'after' ? failure() : { error: null }
      },
      getPublicUrl: path => ({ data: { publicUrl: `https://storage.example.invalid/${path}` } }),
      async remove(paths) { paths.forEach(path => uploads.delete(path)); return { error: null } },
    }) },
  }
  const api = await sourceModule('news-app/src/lib/articles.js', {
    globals: { crypto: { randomUUID } },
    imports: { './supabase': { supabase, STORAGE_BUCKETS: { media: 'article-media' } } },
  })
  const input = {
    form: { title: 'Test article', contentHtml: '<p>Article body</p>' },
    items: [{ id: 'image-one', kind: 'image', isNew: true, file: { name: 'photo.jpg', type: 'image/jpeg' } }],
    userId: randomUUID(), status: 'published', saveSession: api.createArticleSaveSession(),
  }
  return { api, input, tables, uploads, calls, fail(table, operation, when = 'before') { fault = { table, operation, when } } }
}

test('failed media uploads leave one private draft and a retry publishes that same article', async () => {
  const f = await fixture()
  f.fail('storage', 'upload')
  await assert.rejects(f.api.createArticle(f.input), /connection loss/)
  assert.equal(f.tables.articles.size, 1)
  const draft = [...f.tables.articles.values()][0]
  assert.equal(draft.status, 'draft')
  assert.equal(draft.published_at, null)
  const saved = await f.api.createArticle(f.input)
  assert.equal(saved.id, draft.id)
  assert.equal(saved.slug, draft.slug)
  assert.equal(f.tables.articles.size, 1)
  assert.equal(f.tables.article_media.size, 1)
  assert.equal(draft.status, 'published')
  assert.equal(f.calls.at(-1).table, 'articles')
  assert.equal(f.calls.at(-1).payload.status, 'published')
})

for (const [table, operation] of [['articles', 'insert'], ['storage', 'upload'], ['article_media', 'insert'], ['articles', 'update']]) {
  test(`retry after a committed ${table} ${operation} loses its response does not duplicate data`, async () => {
    const f = await fixture()
    f.fail(table, operation, 'after')
    await assert.rejects(f.api.createArticle(f.input), /connection loss/)
    const timestamp = f.tables.articles.get(f.input.saveSession.id)?.published_at
    await f.api.createArticle(f.input)
    assert.equal(f.tables.articles.size, 1)
    assert.equal(f.tables.article_media.size, 1)
    assert.equal(f.uploads.size, 1)
    const article = f.tables.articles.get(f.input.saveSession.id)
    assert.equal(article.status, 'published')
    if (timestamp) assert.equal(article.published_at, timestamp)
  })
}

test('retrying a full ten-image draft reuses media rows instead of triggering the insert limit', async () => {
  const f = await fixture()
  f.input.items = Array.from({ length: 10 }, (_, i) => ({ id: `image-${i}`, kind: 'image', isNew: true, file: { name: `${i}.jpg` } }))
  f.fail('articles', 'update')
  await assert.rejects(f.api.createArticle(f.input), /connection loss/)
  assert.equal(f.tables.article_media.size, 10)
  assert.equal(f.tables.articles.get(f.input.saveSession.id).status, 'draft')
  await f.api.createArticle(f.input)
  assert.equal(f.tables.article_media.size, 10)
  assert.equal(f.uploads.size, 10)
  assert.equal(f.tables.articles.get(f.input.saveSession.id).status, 'published')
})

test('a reader never sees a draft promoted when the final article save fails', async () => {
  const f = await fixture()
  f.input.status = 'draft'
  const draft = await f.api.createArticle(f.input)
  f.fail('articles', 'update')
  await assert.rejects(f.api.updateArticle({ ...f.input, id: draft.id, status: 'published' }), /connection loss/)
  assert.equal(f.tables.articles.get(draft.id).status, 'draft')
  assert.equal(f.tables.articles.get(draft.id).published_at, null)
})

test('an upload failure during editing preserves the previous gallery and article', async () => {
  const f = await fixture()
  const saved = await f.api.createArticle(f.input)
  const oldMedia = structuredClone([...f.tables.article_media.values()])
  const oldArticle = structuredClone(f.tables.articles.get(saved.id))
  f.input.items = [{ id: 'replacement', kind: 'image', isNew: true, file: { name: 'replacement.jpg' } }]
  f.input.form.title = 'New title'
  f.fail('storage', 'upload')
  await assert.rejects(f.api.updateArticle({ ...f.input, id: saved.id }), /connection loss/)
  assert.deepEqual([...f.tables.article_media.values()], oldMedia)
  assert.deepEqual(f.tables.articles.get(saved.id), oldArticle)
})
