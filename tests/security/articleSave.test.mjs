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
  const cleanup = new Map()
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
    async rpc(name, args = {}) {
      calls.push({ table: 'rpc', operation: name, payload: structuredClone(args) })
      if (name === 'pending_article_storage_cleanup') return { data: [...cleanup.values()], error: null }
      if (name === 'finish_article_storage_cleanup') {
        args.p_paths.forEach(path => cleanup.delete(path))
        return { error: null }
      }
      assert.equal(name, 'save_article')
      const activeFault = fault?.table === 'rpc' ? fault : null
      if (activeFault) fault = null
      if (activeFault?.when === 'before') return failure()
      const article = tables.articles.get(args.p_id)
      if (article.last_save_id !== args.p_save_id) {
        const keptIds = new Set(args.p_media.map(row => row.id))
        for (const row of tables.article_media.values()) {
          if (row.article_id === args.p_id && !keptIds.has(row.id)) {
            cleanup.set(row.storage_path, { path: row.storage_path, source_url: row.url })
            tables.article_media.delete(row.id)
          }
        }
        args.p_media.forEach(row => tables.article_media.set(row.id, { ...structuredClone(row), article_id: args.p_id }))
        Object.assign(article, structuredClone(args.p_payload), { last_save_id: args.p_save_id, updated_at: new Date().toISOString() })
        if (article.status === 'published') article.published_at ||= new Date().toISOString()
      }
      if (activeFault?.when === 'after') return failure()
      return { data: { id: article.id, slug: article.slug, updated_at: article.updated_at }, error: null }
    },
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
      getPublicUrl: path => ({ data: { publicUrl: `https://storage.example.invalid/storage/v1/object/public/article-media/${path}` } }),
      async remove(paths) {
        calls.push({ table: 'storage', operation: 'remove', paths })
        paths.forEach(path => uploads.delete(path))
        return { data: paths.map(name => ({ name })), error: null }
      },
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
  const commit = f.calls.find(call => call.table === 'rpc' && call.operation === 'save_article')
  assert.equal(commit.payload.p_payload.status, 'published')
})

for (const [table, operation] of [['articles', 'insert'], ['storage', 'upload'], ['rpc', 'save_article']]) {
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
  f.fail('rpc', 'save_article')
  await assert.rejects(f.api.createArticle(f.input), /connection loss/)
  assert.equal(f.tables.article_media.size, 0)
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
  f.fail('rpc', 'save_article')
  await assert.rejects(f.api.updateArticle({ ...f.input, id: draft.id, status: 'published' }), /connection loss/)
  assert.equal(f.tables.articles.get(draft.id).status, 'draft')
  assert.equal(f.tables.articles.get(draft.id).published_at, null)
})

test('a failed gallery/article transaction preserves every published row and old file', async () => {
  const f = await fixture()
  const saved = await f.api.createArticle(f.input)
  const oldMedia = structuredClone([...f.tables.article_media.values()])
  const oldArticle = structuredClone(f.tables.articles.get(saved.id))
  f.input.items = [{ id: 'replacement', kind: 'image', isNew: true, file: { name: 'replacement.jpg' } }]
  f.input.form.title = 'New title'
  f.fail('rpc', 'save_article')
  await assert.rejects(f.api.updateArticle({ ...f.input, id: saved.id }), /connection loss/)
  assert.deepEqual([...f.tables.article_media.values()], oldMedia)
  assert.deepEqual(f.tables.articles.get(saved.id), oldArticle)
  assert.ok(f.uploads.has(oldMedia[0].storage_path))
  assert.equal(f.calls.some(call => call.table === 'storage' && call.operation === 'remove'), false)
})

test('incomplete account drafts save without promoting them or duplicating retries', async () => {
  const f = await fixture()
  f.input.form = { title: '', contentHtml: '' }
  f.input.items = []
  f.input.status = 'draft'
  const first = await f.api.createArticle(f.input)
  const second = await f.api.createArticle(f.input)
  assert.equal(first.id, second.id)
  assert.equal(f.tables.articles.size, 1)
  const row = f.tables.articles.get(first.id)
  assert.equal(row.author_id, f.input.userId)
  assert.equal(row.status, 'draft')
  assert.equal(row.title, '')
})

test('saving requires a signed-in account before creating rows or uploading files', async () => {
  const f = await fixture()
  await assert.rejects(f.api.createArticle({ ...f.input, userId: null }), /Sign in/)
  assert.equal(f.calls.length, 0)
})

test('admin edits keep new files in the article owner folder for later owner cleanup', async () => {
  const f = await fixture()
  const saved = await f.api.createArticle(f.input)
  const ownerId = f.input.userId
  const replacement = { id: 'admin-file', kind: 'image', isNew: true, file: { name: 'admin.jpg' } }
  await f.api.updateArticle({ ...f.input, id: saved.id, userId: randomUUID(), items: [replacement] })
  const row = [...f.tables.article_media.values()][0]
  assert.ok(row.storage_path.startsWith(`${ownerId}/`))
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
