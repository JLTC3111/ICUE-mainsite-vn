import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, platform, sourceModule, silenceRenderer, i18n, title, unmount } from '../../shared/resilience/testHarness.js'
const icons = createRequire(import.meta.url)('lucide-react')
const Null = () => null

async function signup(t) {
 silenceRenderer(t)
 const calls = [], f = platform(), snapshot = { messages: [], conversation: null }
 const mod = await sourceModule('news-app/src/pages/CustomerPortal.jsx', { globals: f, imports: {
  'react-i18next': i18n,
  'react-router-dom': { useNavigate: () => () => {}, useLocation: () => ({ search: '' }) },
  'lucide-react': icons,
  '../context/AuthContext': { useAuth: () => ({ user: null, loading: false }) },
  '../lib/supabase': { supabase: { auth: { signUp: async payload => { calls.push(payload); return { data: { session: null } } } } } },
  '../lib/authRedirect': { getAuthRedirectUrl: () => 'https://example.invalid/newsroom/login' },
  '../lib/authReset': { authErrorKey: () => '', sendPasswordResetEmail: async () => ({}) },
  '../hooks/useDocumentTitle': title,
  '../components/LanguageSwitcher': { default: Null },
  '../../../shared/customer-account/account.js': { connectAccount: async () => ({}) },
  '../../../shared/chatbot/lib/liveChat.js': { getLiveChatClient: () => ({ getSnapshot: () => snapshot, subscribe: () => () => {} }) },
  '../../../shared/chatbot/LiveChatPanel.jsx': { default: Null },
 } })
 let renderer
 await act(async () => { renderer = create(React.createElement(mod.default)) })
 const field = name => renderer.root.findByProps({ name })
 const change = (name, value) => act(async () => field(name).props.onChange({ target: { value } }))
 const submit = () => act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }))
 const switchMode = () => act(async () => renderer.root.findByProps({ className: 'customer-portal__switch' }).findByType('button').props.onClick())
 await switchMode()
 await change('name', 'Customer'); await change('email', 'customer@example.invalid'); await change('password', 'test-password-123')
 return { renderer, calls, field, change, submit, switchMode }
}

test('customer signup requires a matching confirmation before calling Auth', async t => {
 const f = await signup(t)
 assert.equal(f.field('confirmPassword').props.required, true)
 assert.equal(f.field('confirmPassword').props.autoComplete, 'new-password')
 await f.submit()
 assert.equal(f.calls.length, 0)
 assert.equal(f.field('confirmPassword').props['aria-invalid'], true)
 await f.change('confirmPassword', 'different-password')
 await f.submit()
 assert.equal(f.calls.length, 0)
 assert.ok(JSON.stringify(f.renderer.toJSON()).includes('login.resetMismatch'))
 await f.change('confirmPassword', 'test-password-123')
 assert.equal(f.field('confirmPassword').props['aria-invalid'], undefined)
 await f.submit()
 assert.equal(f.calls.length, 1)
 assert.equal(f.calls[0].password, 'test-password-123')
 assert.equal('confirmPassword' in f.calls[0], false)
 await unmount(f.renderer)
})

test('leaving signup clears confirmation and removes the extra field from sign-in', async t => {
 const f = await signup(t)
 await f.change('confirmPassword', 'different-password'); await f.submit()
 await f.switchMode()
 assert.equal(f.renderer.root.findAllByProps({ name: 'confirmPassword' }).length, 0)
 assert.equal(JSON.stringify(f.renderer.toJSON()).includes('login.resetMismatch'), false)
 await f.switchMode()
 assert.equal(f.field('confirmPassword').props.value, '')
 assert.equal(f.field('confirmPassword').props['aria-invalid'], undefined)
 await unmount(f.renderer)
})
