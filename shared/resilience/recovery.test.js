import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { subscribeToPageResume } from './pageResume.js'
import { withDeadline, fetchWithDeadline, createRetryableLoader } from './requests.js'
import { ExpiringCache } from './ExpiringCache.js'
import { platform, sourceModule, deferred, silenceRenderer } from './testHarness.js'
const dispatch = (target, type, properties = {}) => target.dispatchEvent(Object.assign(new Event(type), properties))
function lifecycle() {
  const f = platform(); let time = 1_000; const events = []
  const stop = subscribeToPageResume(e => events.push(e), { documentTarget: f.document, windowTarget: f.window, navigatorTarget: f.navigator, now: () => time })
  return { ...f, events, stop, advance: ms => { time += ms }, hide: () => { f.document.hidden = true; dispatch(f.document, 'visibilitychange') }, show: () => { f.document.hidden = false; dispatch(f.document, 'visibilitychange') } }
}
test('a reconnect received while hidden survives a brief app switch and cleans up', () => {
  const f = lifecycle(); f.hide(); f.advance(100); dispatch(f.window, 'online'); assert.equal(f.events.length, 0)
  f.show(); dispatch(f.window, 'focus'); assert.equal(f.events.length, 1); assert.equal(f.events[0].reason, 'online')
  f.stop(); dispatch(f.window, 'online'); assert.equal(f.events.length, 1)
})
test('offline back-forward restoration waits for connectivity', () => {
  const f = lifecycle(); f.navigator.onLine = false; dispatch(f.window, 'pageshow', { persisted: true }); assert.equal(f.events.length, 0)
  f.navigator.onLine = true; dispatch(f.window, 'online'); assert.equal(f.events.length, 1); f.stop()
})
test('freeze and resume recover once; ordinary focus does not refetch', () => {
  const f = lifecycle(); dispatch(f.window, 'focus'); assert.equal(f.events.length, 0)
  dispatch(f.document, 'freeze'); f.advance(50); dispatch(f.document, 'resume'); dispatch(f.window, 'focus')
  assert.equal(f.events.length, 1); f.stop()
})
test('a second background trip inside the deduplication interval still recovers', () => {
  const f = lifecycle(); dispatch(f.window, 'pageshow', { persisted: true }); f.hide(); f.advance(100); dispatch(f.window, 'pageshow', { persisted: true }); f.show()
  assert.equal(f.events.length, 2); f.stop()
})
test('deadline settles an operation that ignores abort', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let signal
  const pending = withDeadline(s => { signal = s; return new Promise(() => {}) }, { timeoutMs: 40 })
  const rejection = assert.rejects(pending, { name: 'TimeoutError' }); await Promise.resolve(); t.mock.timers.tick(40); await rejection; assert.equal(signal.aborted, true)
})
test('pre-cancelled requests do not start the operation', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0
  await assert.rejects(withDeadline(() => { calls++ }, { signal: controller.signal }), { name: 'AbortError' }); assert.equal(calls, 0)
})
test('a failed loader can retry, while concurrent and successful loads share work', async () => {
  let calls = 0; const pending = deferred(); const load = createRetryableLoader(() => { calls++; return calls === 1 ? pending.promise : 'ready' })
  const one = load(); assert.equal(load(), one); pending.reject(new Error('offline')); await assert.rejects(one)
  assert.equal(await load(), 'ready'); assert.equal(await load(), 'ready'); assert.equal(calls, 2)
})
test('a lost POST response is not automatically sent again', async t => {
  let calls = 0; t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('offline') })
  await assert.rejects(fetchWithDeadline('https://fixture.invalid', { method: 'POST', body: 'draft' })); assert.equal(calls, 1)
})
test('fetch deadline includes a stalled body and propagates a Request signal', async t => {
  const pending = deferred(); let signal
  t.mock.method(globalThis, 'fetch', async (_url, init) => { signal = init.signal; return { arrayBuffer: () => pending.promise, status: 200, headers: {} } })
  const controller = new AbortController(); const request = new Request('https://fixture.invalid', { signal: controller.signal })
  const result = fetchWithDeadline(request); const rejected = assert.rejects(result, { name: 'AbortError' }); await Promise.resolve(); await Promise.resolve(); controller.abort(); await rejected; assert.equal(signal.aborted, true)
})
test('read caches expire missing translations instead of retaining them for the tab lifetime', t => {
  t.mock.timers.enable({ apis: ['Date'] }); const cache = new ExpiringCache(50); cache.set('missing', null); assert.equal(cache.has('missing'), true); t.mock.timers.tick(50); assert.equal(cache.has('missing'), false)
})
test('runtime configuration recovers after the first download fails', async t => {
  silenceRenderer(t); let calls = 0
  const mod = await sourceModule('news-app/src/lib/supabaseConfig.js', { globals: { fetch: async () => { calls++; if (calls === 1) throw new Error('offline'); return Response.json({ url: 'https://fixture.invalid', anonKey: 'public-fixture' }) } } })
  assert.equal(await mod.loadSupabaseConfig(), null); assert.equal((await mod.loadSupabaseConfig()).anonKey, 'public-fixture'); assert.equal(calls, 2)
})
test('Supabase SDK imports retry a rejected chunk', async () => {
  let calls = 0; const mod = await sourceModule('news-app/src/lib/supabaseLoader.js', { dynamicImport: async () => { calls++; throw new Error('offline') } })
  await assert.rejects(mod.loadSupabaseClient()); await assert.rejects(mod.loadSupabaseClient()); assert.equal(calls, 2)
})
test('Supabase false initialization does not permanently cache an unusable client', async () => {
  let calls = 0; const client = { fixture: true }
  const mod = await sourceModule('news-app/src/lib/supabaseLoader.js', { imports: { './supabase': { supabase: client, initSupabase: async () => ++calls > 1 } } })
  await assert.rejects(mod.loadSupabaseClient()); assert.equal(await mod.loadSupabaseClient(), client); assert.equal(calls, 2)
})
test('public reads report invalid successful responses as errors rather than empty feeds', async () => {
  const mod = await sourceModule('news-app/src/lib/publicSupabase.js', { imports: { './supabaseConfig': { loadSupabaseConfig: async () => ({ url: 'https://fixture.invalid', anonKey: 'public-fixture' }) } }, globals: { fetch: async () => new Response('<html>proxy error</html>') } })
  const result = await mod.publicSelect('articles', {}); assert.ok(result.error); assert.equal(result.data, null)
})
test('all six chatbot warmups may fail without poisoning a later knowledge lookup', async () => {
  let online = false, calls = 0
  const mod = await sourceModule('shared/chatbot/lib/knowledge.js', { globals: { fetch: async () => { calls++; if (!online) throw new Error('offline'); return Response.json({ language: 'vi', intents: [{ id: 'recovered', answer: 'Ready', keywords: ['ready'] }] }) } } })
  const knowledge = mod.createChatbotKnowledge({ copy: () => ({ fallback: 'Fallback' }) })
  await Promise.all(['vi','en','de','fr','ko','ja'].map(knowledge.ensureKb)); online = true
  assert.equal((await knowledge.ensureKb('vi')).intents.length, 1); assert.equal(calls, 7)
})
test('locale recovery repairs a real i18next failed backend entry and notifies React listeners', async t => {
  silenceRenderer(t); const require = createRequire(new URL('../../news-app/package.json', import.meta.url)); const i18n = require('i18next').createInstance()
  await i18n.use({ type: 'backend', init() {}, read(_language, _namespace, done) { done(new Error('offline'), false) } }).init({ lng: 'de', fallbackLng: 'vi', resources: { vi: { translation: { title: 'Gốc' } } }, partialBundledLanguages: true })
  assert.equal(i18n.hasResourceBundle('de', 'translation'), false)
  const f = platform(); const mod = await sourceModule('shared/resilience/localeRecovery.js', { globals: f }); let changed = 0
  i18n.on('languageChanged', () => changed++)
  const stop = mod.installLocaleRecovery(i18n, { de: async () => ({ default: { title: 'Wieder da' } }) }); dispatch(f.window, 'online'); await new Promise(setImmediate)
  assert.equal(i18n.t('title'), 'Wieder da'); assert.equal(changed, 1); stop()
})
test('a stale translation request cannot repopulate an invalidated cache', async () => {
  const pending = deferred(); let calls = 0
  const mod = await sourceModule('news-app/src/lib/publicTranslate.js', { imports: { './publicSupabase': { publicSelect: () => { calls++; return calls === 1 ? pending.promise : Promise.resolve({ data: [{ title: 'new' }], error: null }) } }, '@icue/text/sanitizeArticleHtml': { sanitizeArticleHtml: value => value } } })
  const old = mod.fetchArticleTranslation('a', 'en'); mod.clearPublicTranslateCache(); pending.resolve({ data: [{ title: 'old' }], error: null }); await old
  assert.equal((await mod.fetchArticleTranslation('a', 'en')).title, 'new'); assert.equal(calls, 2)
})
test('failed image recovery preserves signed URLs and cleans up', async () => {
  const f = platform(); let writes = 0; const signed = 'https://fixture.invalid/a.png?signature=keep'; let src = signed
  const img = { tagName: 'IMG', complete: true, naturalWidth: 0, isConnected: true, currentSrc: signed, srcset: '' }; Object.defineProperty(img, 'src', { get: () => src, set: v => { writes++; src = v } }); f.document.querySelectorAll = () => [img]
  const mod = await sourceModule('shared/resilience/mediaRecovery.js', { globals: f }); const stop = mod.installMediaRecovery(f.document)
  dispatch(f.window, 'online'); assert.equal(src, signed); assert.equal(writes, 1); stop(); dispatch(f.window, 'online'); assert.equal(writes, 1)
})
