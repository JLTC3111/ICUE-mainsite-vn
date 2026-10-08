import test from 'node:test'
import assert from 'node:assert/strict'
import { React, act, create, deferred, platform, sourceModule, silenceRenderer, i18n, title, unmount } from '../../shared/resilience/testHarness.js'

const Null = () => null
const Children = ({ children }) => React.createElement('section', null, children)
const Link = ({ children, to, ...props }) => React.createElement('a', { ...props, href: to }, children)

async function editor(t, onSubmit, initial = {}) {
  silenceRenderer(t)
  const f = platform()
  const mod = await sourceModule('news-app/src/components/ArticleForm.jsx', { globals: f, imports: {
    'react-i18next': i18n,
    'react-router-dom': { Link, useNavigate: () => () => {} },
    'lucide-react': { MessageSquare: Null },
    '../context/AuthContext': { useAuth: () => ({ profile: { display_name: 'Author' } }) },
    './RichTextEditor': { default: Null }, './MediaUploader': { default: Null },
    './ArticleSourcesEditor': { default: Null }, './EditorSection': { default: Children },
    './EditorOutlineRail': { default: Null }, './ArticleTranslationsEditor': { default: Null },
    './CaptionsDrawer': { default: Null }, './CommentTranslationsDrawer': { default: Null },
    './CoverComparisonEditor': { default: Null }, './ArticleThumbnail': { default: Null },
    './DatePickerField': { default: Null }, './TimePickerField': { default: Null },
    './ErrorBoundary': { default: Children }, '../lib/translate': { buildArticleTranslateSample: () => ({}) },
  } })
  let renderer
  await act(async () => { renderer = create(React.createElement(mod.default, { initial, onSubmit, mode: initial.id ? 'edit' : 'create' })) })
  const button = key => renderer.root.findAllByType('button').find(node => node.children.includes(key))
  return { ...f, renderer, button }
}

test('manual account drafts accept an empty body and title, and keep the editor ready for another save', async t => {
  const submissions = []
  const f = await editor(t, async payload => { submissions.push(payload); return { id: 'draft-id' } })
  await act(async () => f.button('editor.saveDraft').props.onClick())
  assert.equal(submissions.length, 1)
  assert.equal(submissions[0].status, 'draft')
  assert.equal(submissions[0].form.title, '')
  assert.equal(submissions[0].form.contentHtml, '')
  assert.ok(JSON.stringify(f.renderer.toJSON()).includes('drafts.saved'))
  assert.equal(f.button('editor.saveDraft').props.disabled, false)
  await act(async () => f.button('editor.saveDraft').props.onClick())
  assert.equal(submissions.length, 2)
  await unmount(f.renderer)
})

test('publishing still requires a title and body even when incomplete drafts are allowed', async t => {
  let calls = 0
  const f = await editor(t, async () => { calls++ })
  await act(async () => f.button('editor.publish').props.onClick())
  assert.equal(calls, 0)
  assert.ok(JSON.stringify(f.renderer.toJSON()).includes('editor.needTitle'))
  const headline = f.renderer.root.findAllByType('input').find(node => node.props.placeholder === 'editor.titlePlaceholder')
  await act(async () => headline.props.onChange({ target: { value: 'Title' } }))
  await act(async () => f.button('editor.publish').props.onClick())
  assert.equal(calls, 0)
  assert.ok(JSON.stringify(f.renderer.toJSON()).includes('editor.needContent'))
  await unmount(f.renderer)
})

test('a lost draft save preserves entered text, rejects double sends and never retries on reconnect', async t => {
  const pending = deferred()
  let calls = 0
  const f = await editor(t, () => { calls++; return pending.promise })
  const headline = () => f.renderer.root.findAllByType('input').find(node => node.props.placeholder === 'editor.titlePlaceholder')
  await act(async () => headline().props.onChange({ target: { value: 'My unfinished draft' } }))
  const save = f.button('editor.saveDraft').props.onClick
  await act(async () => { void save(); void save() })
  assert.equal(calls, 1)
  await act(async () => pending.reject(new Error('Connection lost')))
  await act(async () => f.window.dispatchEvent(new Event('online')))
  assert.equal(calls, 1)
  assert.equal(headline().props.value, 'My unfinished draft')
  assert.equal(f.button('editor.saveDraft').props.disabled, false)
  assert.equal(JSON.stringify(f.renderer.toJSON()).includes('drafts.saved'), false)
  await unmount(f.renderer)
})

test('editing a published article cannot use Save draft to remove the live article', async t => {
  const f = await editor(t, async () => {}, { id: 'published-id', status: 'published' })
  assert.equal(f.button('editor.saveDraft'), undefined)
  assert.ok(f.button('editor.update'))
  await unmount(f.renderer)
})

test('saved drafts list resumes account drafts and never displays the previous account after switching', async t => {
  silenceRenderer(t)
  const f = platform()
  let user = { id: 'owner' }
  let params = new URLSearchParams('tab=drafts')
  const otherRead = deferred()
  const rows = [
    { id: 'draft', author_id: 'owner', title: '', status: 'draft', media: [] },
    { id: 'published', author_id: 'owner', title: 'Public article', status: 'published', slug: 'public-article', media: [] },
    { id: 'other-draft', author_id: 'another-author', title: 'Another author draft', status: 'draft', media: [] },
  ]
  const mod = await sourceModule('news-app/src/pages/Dashboard.jsx', { globals: f, imports: {
    'react-i18next': i18n,
    'react-router-dom': { Link, useSearchParams: () => [params, next => { params = new URLSearchParams(next) }] },
    'lucide-react': { Check: Null, CircleAlert: Null },
    '../context/AuthContext': { useAuth: () => ({ user, isAdmin: true }) },
    '../lib/articles': { fetchMyArticles: id => id === 'owner' ? Promise.resolve(rows) : otherRead.promise, deleteArticle: async () => {} },
    '../lib/translate': { fetchArticleTranslationsForArticles: async () => ({}) },
    '../lib/i18n': { SUPPORTED_LANGUAGES: ['en','vi'] },
    '../components/ArticleThumbnail': { default: Null }, '../hooks/useDocumentTitle': title,
  } })
  let renderer
  await act(async () => { renderer = create(React.createElement(mod.default)) })
  const links = renderer.root.findAllByType('a')
  assert.ok(links.some(node => node.props.href === '/edit/draft' && node.children.includes('drafts.resume')))
  assert.equal(links.some(node => node.props.href === '/edit/other-draft'), false)
  assert.equal(JSON.stringify(renderer.toJSON()).includes('Public article'), false)
  user = { id: 'different-account' }
  await act(async () => renderer.update(React.createElement(mod.default)))
  assert.equal(renderer.root.findAllByType('a').some(node => node.props.href === '/edit/draft'), false)
  await act(async () => otherRead.reject(new Error('Offline')))
  assert.equal(renderer.root.findAllByType('a').some(node => node.props.href === '/edit/draft'), false)
  await unmount(renderer)
})

test('account changes hide the previous draft and its document title while the new read is pending or fails', async t => {
  silenceRenderer(t)
  const f = platform()
  let user = { id: 'owner' }
  const pending = deferred()
  const titles = []
  const mod = await sourceModule('news-app/src/pages/Edit.jsx', { globals: f, imports: {
    'react-i18next': i18n,
    'react-router-dom': { useNavigate: () => () => {}, useParams: () => ({ id: 'draft' }), useLocation: () => ({}) },
    '../context/AuthContext': { useAuth: () => ({ user, isAdmin: false }) },
    '../components/ArticleForm': { default: ({ initial }) => React.createElement('input', { value: initial.title }) },
    '../lib/articles': { fetchArticleById: () => user.id === 'owner' ? Promise.resolve({ id: 'draft', author_id: 'owner', title: 'Private draft title', media: [], status: 'draft' }) : pending.promise,
      updateArticle: async () => ({}), toEditorMedia: value => value, createArticleSaveSession: () => ({}) },
    '../hooks/useDocumentTitle': { useDocumentTitle: value => titles.push(value) },
  } })
  let renderer
  await act(async () => { renderer = create(React.createElement(mod.default)) })
  assert.equal(renderer.root.findByType('input').props.value, 'Private draft title')
  user = { id: 'another-account' }
  await act(async () => renderer.update(React.createElement(mod.default)))
  assert.equal(renderer.root.findAllByType('input').length, 0)
  assert.equal(titles.at(-1), 'editor.editTitle')
  await act(async () => pending.reject(new Error('Offline')))
  assert.equal(JSON.stringify(renderer.toJSON()).includes('Private draft title'), false)
  await unmount(renderer)
})

test('an admin losing access immediately hides another author draft while permissions refresh', async t => {
  silenceRenderer(t)
  const f = platform()
  let isAdmin = true
  const pending = deferred()
  const titles = []
  const mod = await sourceModule('news-app/src/pages/Edit.jsx', { globals: f, imports: {
    'react-i18next': i18n,
    'react-router-dom': { useNavigate: () => () => {}, useParams: () => ({ id: 'draft' }), useLocation: () => ({}) },
    '../context/AuthContext': { useAuth: () => ({ user: { id: 'admin' }, isAdmin }) },
    '../components/ArticleForm': { default: ({ initial }) => React.createElement('input', { value: initial.title }) },
    '../lib/articles': { fetchArticleById: () => isAdmin ? Promise.resolve({ id: 'draft', author_id: 'owner', title: 'Another account private draft', media: [], status: 'draft' }) : pending.promise,
      updateArticle: async () => ({}), toEditorMedia: value => value, createArticleSaveSession: () => ({}) },
    '../hooks/useDocumentTitle': { useDocumentTitle: value => titles.push(value) },
  } })
  let renderer
  await act(async () => { renderer = create(React.createElement(mod.default)) })
  assert.equal(renderer.root.findByType('input').props.value, 'Another account private draft')
  isAdmin = false
  await act(async () => renderer.update(React.createElement(mod.default)))
  assert.equal(renderer.root.findAllByType('input').length, 0)
  assert.equal(titles.at(-1), 'editor.editTitle')
  await act(async () => pending.reject(new Error('Not authorized')))
  assert.equal(JSON.stringify(renderer.toJSON()).includes('Another account private draft'), false)
  await unmount(renderer)
})

test('switching accounts starts a new draft save session and discards the previous working copy', async t => {
  silenceRenderer(t)
  const f = platform()
  let user = { id: 'first-account' }
  let nextSession = 0
  const submissions = []
  const WorkingForm = ({ initial, onSubmit }) => {
    const [text, setText] = React.useState(initial?.title || '')
    return React.createElement('section', null,
      React.createElement('input', { value: text, onChange: event => setText(event.target.value) }),
      React.createElement('button', { onClick: () => onSubmit({ form: { title: text }, status: 'draft' }) }, 'save'),
    )
  }
  const mod = await sourceModule('news-app/src/pages/Upload.jsx', { globals: f, imports: {
    'react-i18next': i18n,
    'react-router-dom': { useNavigate: () => () => {}, useLocation: () => ({}) },
    '../context/AuthContext': { useAuth: () => ({ user }) },
    '../components/ArticleForm': { default: WorkingForm },
    '../lib/articles': { createArticleSaveSession: () => ({ id: ++nextSession }), createArticle: async payload => {
      submissions.push(payload)
      return { id: payload.saveSession.id }
    } },
    '../lib/aiDraft': { consumeAiDraft: () => null },
    '../hooks/useDocumentTitle': title,
  } })
  let renderer
  await act(async () => { renderer = create(React.createElement(mod.default)) })
  await act(async () => renderer.root.findByType('input').props.onChange({ target: { value: 'First account work' } }))
  await act(async () => renderer.root.findByType('button').props.onClick())
  user = { id: 'second-account' }
  await act(async () => renderer.update(React.createElement(mod.default)))
  assert.equal(renderer.root.findByType('input').props.value, '')
  await act(async () => renderer.root.findByType('button').props.onClick())
  assert.deepEqual(submissions.map(payload => payload.userId), ['first-account', 'second-account'])
  assert.notEqual(submissions[0].saveSession.id, submissions[1].saveSession.id)
  await unmount(renderer)
})
