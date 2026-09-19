import test from 'node:test'
import assert from 'node:assert/strict'
import { React, act, create, deferred, platform, sourceModule, silenceRenderer, i18n, title, unmount } from './testHarness.js'

test('sign-in rejection leaves loading state and allows an explicit retry without double-send', async t => {
  silenceRenderer(t); const f = platform(); const pending = deferred(); let calls = 0
  const mod = await sourceModule('news-app/src/pages/Login.jsx', { globals: f, imports: {
    'react-i18next': i18n, 'react-router-dom': { useNavigate: () => () => {}, useLocation: () => ({}) },
    'lucide-react': { Eye: () => null, EyeOff: () => null },
    '../context/AuthContext': { useAuth: () => ({ signIn: () => { calls++; return pending.promise } }) },
    '../lib/supabase': { supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } },
    '../lib/authRedirect': { getAuthRedirectUrl: () => '/login', isPasswordRecoveryUrl: () => false },
    '../lib/authReset': { authErrorKey: () => 'login.resetError', sendPasswordResetEmail() {} },
    '../hooks/useDocumentTitle': title, '../components/LanguageSwitcher': { default: () => null },
  } })
  let renderer; await act(async () => { renderer = create(React.createElement(mod.default)) })
  const send = renderer.root.findByType('form').props.onSubmit
  await act(async () => { void send({ preventDefault() {} }); void send({ preventDefault() {} }) }); assert.equal(calls, 1)
  await act(async () => pending.reject(new Error('offline'))); assert.ok(JSON.stringify(renderer.toJSON()).includes('login.error'))
  await act(async () => send({ preventDefault() {} })); assert.equal(calls, 2); await unmount(renderer)
})
test('a failed lazy component recovers without discarding a sibling draft', async t => {
  silenceRenderer(t); const f = platform(); let calls = 0
  const mod = await sourceModule('shared/resilience/lazyWithRecovery.jsx', { globals: f })
  const Lazy = mod.lazyWithRecovery(async () => { calls++; if (calls === 1) throw new Error('offline'); return { default: () => React.createElement('output', null, 'recovered') } })
  function Fixture() { const [draft, setDraft] = React.useState(''); return React.createElement(React.Fragment, null, React.createElement('input', { value: draft, onChange: e => setDraft(e.target.value) }), React.createElement(Lazy)) }
  let renderer; await act(async () => { renderer = create(React.createElement(Fixture)) })
  await act(async () => renderer.root.findByType('input').props.onChange({ target: { value: 'unsaved text' } }))
  await act(async () => f.window.dispatchEvent(new Event('online')))
  assert.equal(calls, 2); assert.equal(renderer.root.findByType('input').props.value, 'unsaved text'); assert.equal(renderer.root.findByType('output').children[0], 'recovered'); await unmount(renderer)
})
test('title translation retries after failure, retains ready text on errors, and removes deleted translations', async t => {
  silenceRenderer(t); const f = platform(); let calls = 0, latest
  const fetchTitles = async () => { calls++; if (calls === 1 || calls === 3) throw new Error('offline'); return { titles: calls === 2 ? { a: 'translated' } : {}, subtitles: {} } }
  const mod = await sourceModule('news-app/src/hooks/useArticleTitleTranslations.js', { globals: f, imports: { '../lib/publicTranslate': { fetchArticleTitleTranslations: fetchTitles, fetchArticleTranslation: async () => ({}), clearPublicTranslateCache() {} } } })
  const rows = [{ id: 'a', language: 'vi', title: 'Nghiên cứu' }]
  function Fixture() { latest = mod.useArticleTitleTranslations(rows, 'en'); return null }
  let renderer; await act(async () => { renderer = create(React.createElement(Fixture)) }); assert.equal(latest.pending, false)
  await act(async () => f.window.dispatchEvent(new Event('online'))); assert.equal(latest.titles.a, 'translated')
  await act(async () => f.window.dispatchEvent(new Event('online'))); assert.equal(latest.titles.a, 'translated')
  await act(async () => f.window.dispatchEvent(new Event('online'))); assert.equal(latest.titles.a, undefined); assert.equal(calls, 4); await unmount(renderer)
})
async function editFixture(t, fetchArticleById, params = { id: 'a' }) {
  silenceRenderer(t); const f = platform()
  function Form({ initial }) { const [draft, setDraft] = React.useState(initial.title); return React.createElement('input', { value: draft, onChange: e => setDraft(e.target.value) }) }
  const mod = await sourceModule('news-app/src/pages/Edit.jsx', { globals: f, imports: {
    'react-i18next': i18n, 'react-router-dom': { useNavigate: () => () => {}, useParams: () => params },
    '../context/AuthContext': { useAuth: () => ({ user: { id: 'u' } }) }, '../components/ArticleForm': { default: Form },
    '../lib/articles': { fetchArticleById, updateArticle: async () => ({}), toEditorMedia: v => v }, '../hooks/useDocumentTitle': title,
  } })
  let renderer; await act(async () => { renderer = create(React.createElement(mod.default)) }); return { ...f, renderer, Component: mod.default }
}
test('an editor retries its failed initial read, then preserves a ready unsaved draft on reconnect', async t => {
  let calls = 0
  const f = await editFixture(t, async () => { calls++; if (calls === 1) throw new Error('offline'); return { id: 'a', title: 'server text', media: [] } })
  await act(async () => f.window.dispatchEvent(new Event('online')))
  await act(async () => f.renderer.root.findByType('input').props.onChange({ target: { value: 'local draft' } }))
  await act(async () => f.window.dispatchEvent(new Event('online')))
  assert.equal(calls, 2); assert.equal(f.renderer.root.findByType('input').props.value, 'local draft'); await unmount(f.renderer)
})
test('a superseded editor read is cancelled and cannot replace the newer article', async t => {
  const pending = deferred(); const params = { id: 'a' }; let firstSignal
  const f = await editFixture(t, (id, { signal }) => { if (id === 'a') { firstSignal = signal; return pending.promise } return Promise.resolve({ id, title: 'new article', media: [] }) }, params)
  params.id = 'b'; await act(async () => f.renderer.update(React.createElement(f.Component))); assert.equal(firstSignal.aborted, true)
  await act(async () => pending.resolve({ id: 'a', title: 'stale article', media: [] })); assert.equal(f.renderer.root.findByType('input').props.value, 'new article'); await unmount(f.renderer)
})
test('profile refresh preserves dirty fields and rejected saves cannot display success or navigate', async t => {
  silenceRenderer(t); const f = platform(); const pending = deferred(); let profile = null, saves = 0, navigations = 0
  const query = { update() { return this }, eq() { return this }, select() { return this }, single() { saves++; return pending.promise } }
  const mod = await sourceModule('news-app/src/pages/Profile.jsx', { globals: f, imports: {
    'react-i18next': i18n, 'react-router-dom': { useNavigate: () => () => { navigations++ } },
    '../context/AuthContext': { useAuth: () => ({ user: { id: 'u' }, profile, refreshProfile: async () => {} }) },
    '../lib/supabase': { supabase: { from: () => query } }, '../lib/articles': { uploadAvatar: async () => ({}) }, '../lib/defaults': { DEFAULT_AVATAR: '/avatar' }, '../hooks/useDocumentTitle': title,
  } })
  let renderer; await act(async () => { renderer = create(React.createElement(mod.default)) })
  const field = () => renderer.root.findAllByType('input').find(n => n.props.value !== undefined)
  await act(async () => field().props.onChange({ target: { value: 'my unsaved name' } }))
  profile = { display_name: 'server name' }; await act(async () => renderer.update(React.createElement(mod.default))); assert.equal(field().props.value, 'my unsaved name')
  const save = renderer.root.findAllByType('button').find(n => n.children.includes('profile.save')).props.onClick
  await act(async () => { void save(); void save() }); assert.equal(saves, 1)
  await act(async () => pending.resolve({ error: new Error('offline') })); assert.equal(navigations, 0); assert.equal(field().props.value, 'my unsaved name'); assert.equal(JSON.stringify(renderer.toJSON()).includes('profile.saved'), false); await unmount(renderer)
})
test('contact submission is sent once and retains entered values after a lost response', async t => {
  silenceRenderer(t); const f = platform(); const pending = deferred(); let calls = 0, latest
  const mod = await sourceModule('contact-app/src/hooks/useContactForm.js', { globals: f, imports: { '../lib/netlifyForm': { submitToNetlify: () => { calls++; return pending.promise } } } })
  function Fixture() { latest = mod.useContactForm(); return null }
  let renderer; await act(async () => { renderer = create(React.createElement(Fixture)) })
  await act(async () => { latest.setField('name', 'Reader'); latest.setField('email', 'reader@example.test'); latest.setField('message', 'Please keep this message'); latest.setField('consent', true) })
  const send = latest.submit; await act(async () => { void send('en'); void send('en') }); assert.equal(calls, 1)
  await act(async () => pending.reject(new Error('lost response'))); await act(async () => f.window.dispatchEvent(new Event('online')))
  assert.equal(latest.status, 'error'); assert.equal(latest.values.message, 'Please keep this message'); assert.equal(calls, 1); await unmount(renderer)
})
test('notification reconnect supersedes a hung badge read and ignores its late response', async t => {
  silenceRenderer(t); const f = platform(); const pending = deferred(); let calls = 0, latest, firstSignal
  const mod = await sourceModule('news-app/src/hooks/useNotifications.js', { globals: f, imports: {
    '../context/AuthContext': { useAuth: () => ({ user: { id: 'u' }, isAuthed: true }) },
    '../lib/notifications': { fetchUnreadCount: ({ signal }) => { calls++; if (calls === 1) { firstSignal = signal; return pending.promise } return Promise.resolve(5) }, fetchNotifications: async () => [], isMissingNotificationsSchema: () => false, subscribeToNotifications: () => () => {}, markNotificationRead: async () => {}, markAllNotificationsRead: async () => {}, dismissNotification: async () => {} },
  } })
  function Fixture() { latest = mod.default(); return null }
  let renderer; await act(async () => { renderer = create(React.createElement(Fixture)) }); await act(async () => f.window.dispatchEvent(new Event('online')))
  assert.equal(firstSignal.aborted, true); assert.equal(latest.unreadCount, 5); await act(async () => pending.resolve(99)); assert.equal(latest.unreadCount, 5); await unmount(renderer)
})
async function authFixture(t, { read, getSession, initialSession } = {}) {
  silenceRenderer(t); const f = platform(); let authChanged, latest, inserts = 0
  const session = initialSession ?? { user: { id: 'u', email: 'fixture@example.test' } }
  const query = { select() { return this }, eq() { return this }, maybeSingle: read, insert() { inserts++; return this }, single: async () => ({ data: { id: 'u' }, error: null }) }
  const client = { from: () => query, auth: { onAuthStateChange: cb => { authChanged = cb; return { data: { subscription: { unsubscribe() {} } } } }, getSession: getSession ?? (async () => ({ data: { session }, error: null })), signOut: async () => ({ error: null }), signInWithPassword: async () => ({ data: { session }, error: null }) } }
  const mod = await sourceModule('news-app/src/context/AuthContext.jsx', { globals: f, imports: { '../lib/supabaseLoader': { mayHaveSupabaseSession: () => true, loadSupabaseClient: async () => client } } })
  function Probe() { latest = mod.useAuth(); return null }
  let renderer; await act(async () => { renderer = create(React.createElement(mod.AuthProvider, null, React.createElement(Probe))) })
  return { ...f, renderer, emit: (event, next = session) => authChanged(event, next), latest: () => latest, inserts: () => inserts }
}
test('concurrent auth events share a profile read and transient errors preserve the known role', async t => {
  const pending = deferred(); let calls = 0
  const f = await authFixture(t, { read: () => { calls++; return calls === 1 ? pending.promise : Promise.resolve({ error: new Error('offline'), data: null }) } })
  await act(async () => { f.emit('TOKEN_REFRESHED'); f.emit('SIGNED_IN') }); assert.equal(calls, 1)
  await act(async () => pending.resolve({ data: { id: 'u', role: 'admin' }, error: null })); assert.equal(f.latest().isAdmin, true)
  await act(async () => f.emit('TOKEN_REFRESHED')); assert.equal(f.latest().isAdmin, true); assert.equal(f.inserts(), 0); await unmount(f.renderer)
})
test('a late session restoration cannot undo sign-out', async t => {
  const pending = deferred()
  const f = await authFixture(t, { getSession: () => pending.promise, read: async () => ({ data: { id: 'u' }, error: null }) })
  await act(async () => f.latest().signOut()); await act(async () => pending.resolve({ data: { session: { user: { id: 'u' } } }, error: null }))
  assert.equal(f.latest().isAuthed, false); assert.equal(f.latest().user, null); await unmount(f.renderer)
})
test('article resume revalidates content, retains a ready page on failure, and does not replay view writes', async t => {
  silenceRenderer(t); const f = platform(); let reads = 0, views = 0
  const identity = value => value
  const imports = {
    'react-router-dom': { useParams: () => ({ slug: 'story' }), useNavigate: () => () => {}, Link: 'a' }, 'react-i18next': i18n,
    'lucide-react': { ScanSearch: () => null }, '../context/AuthContext': { useAuth: () => ({ user: null, isAdmin: false }) },
    '../lib/articles': { fetchArticleBySlug: async () => { reads++; if (reads === 2) throw new Error('offline'); return { id: 'a', slug: 'story', title: reads === 1 ? 'First title' : 'Updated title', status: 'published', language: 'en', media: [], sources: [], content_html: '<p>Story</p>' } }, deleteArticle: async () => {} },
    '../lib/engagement': { recordArticleView: async () => { views++; return { count: 1 } } },
    '../lib/helpers': { formatDate: () => '', articlePublishDate: () => '', articleEditedDate: () => '', normalizeHtmlUnicode: identity, normalizeUnicode: value => value || '', sanitizeArticleHtml: identity },
    '../lib/defaults': { DEFAULT_AVATAR: '/avatar' }, '../lib/translate': { fetchArticleTranslation: async () => ({ original: true }), shouldTranslateArticle: () => false, buildArticleTranslateSample: () => '', clearTranslateCache() {} },
    '../lib/mediaTranslations': { applyMediaCaptions: identity, findUntranslatedCaptions: () => [] }, '../hooks/useMediaQuery': { default: () => false },
    '../lib/videoEmbeds': { embedVideosInHtml: identity }, '../lib/mediaComparison': { findAllCoverComparisonImages: () => [] }, '../lib/categories': { categoryColor: () => '#000', isCategory: () => true },
    '../lib/articleSources': { articleSourceNeedsTranslation: () => false }, '../hooks/useDocumentTitle': title,
    '../context/PerformanceProfileContext': { usePerformanceProfile: () => ({ disableLens: true, showScrollProgress: false, reduceMotion: true }) },
  }
  for (const component of ['RetroGrid','SocialGooeyNav','MediaGallery','ArticleComparisonCarousel','ArticleSources','AuthorLink','HeartButton','ClapButton','CommentSection','ArticleTranslator','TranslationSkeleton','ArticleViewCounter','HyperText','ArticlePagedContent','ArticleMoreStories','Lens','ScrollProgress']) imports['../components/'+component] = { default: () => null }
  imports['../components/HyperText'] = { default: ({ as: Tag = 'span', children }) => React.createElement(Tag, null, children) }
  const mod = await sourceModule('news-app/src/pages/ArticleDetail.jsx', { globals: f, imports })
  let renderer; await act(async () => { renderer = create(React.createElement(mod.default)) }); assert.ok(JSON.stringify(renderer.toJSON()).includes('First title'))
  await act(async () => f.window.dispatchEvent(new Event('online'))); assert.ok(JSON.stringify(renderer.toJSON()).includes('First title'))
  await act(async () => f.window.dispatchEvent(new Event('online'))); assert.ok(JSON.stringify(renderer.toJSON()).includes('Updated title')); assert.equal(views, 1); assert.equal(reads, 3); await unmount(renderer)
})
