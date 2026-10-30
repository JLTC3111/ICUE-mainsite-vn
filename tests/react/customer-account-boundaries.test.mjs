import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, deferred, platform, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'

const icons = createRequire(import.meta.url)('lucide-react')
const Null = () => null
const firstUser = { id: 'account-a', email: 'a@example.invalid' }
const secondUser = { id: 'account-b', email: 'b@example.invalid' }

async function fixture(t, { initialUser = null, readChats = async () => [], signInError = null, accountError = null, search = '' } = {}) {
  silenceRenderer(t)
  const f = platform(), listeners = new Set(), routes = [], destinations = [], calls = [], saved = new Map()
  const liveSnapshot = { messages: [], conversation: null }
  const live = {
    getSnapshot: () => liveSnapshot, subscribe: () => () => {},
    syncAccount: async user => { calls.push({ name: 'syncAccount', user }) },
    saveDraft: () => calls.push({ name: 'saveDraft' }),
  }
  const emit = user => {
    auth = { ...auth, user, profile: user ? { role: 'customer' } : null }
    listeners.forEach(listener => listener())
  }
  const signIn = async (email, password) => {
    calls.push({ name: 'signIn', email, password })
    if (signInError) return { error: signInError }
    emit({ ...firstUser, email })
    return { data: { session: { user: auth.user } }, error: null }
  }
  const signOut = async () => { emit(null); return { error: null } }
  let auth = { user: initialUser, profile: initialUser ? { role: 'customer' } : null, loading: false, signIn, signOut }
  f.window.location = { origin: 'https://vi.icue.vn', pathname: '/newsroom/portal', assign: href => destinations.push(href) }
  const { default: CustomerPortal } = await sourceModule('news-app/src/pages/CustomerPortal.jsx', {
    globals: { ...f, sessionStorage: { setItem: (key, value) => saved.set(key, value) } },
    imports: {
      'react-router-dom': { useNavigate: () => (...args) => routes.push(args), useLocation: () => ({ search }) },
      'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'en' } }) },
      'lucide-react': icons,
      '../context/AuthContext': { useAuth: () => React.useSyncExternalStore(
        listener => { listeners.add(listener); return () => listeners.delete(listener) }, () => auth, () => auth,
      ) },
      '../lib/supabase': { supabase: { rpc: async name => {
        if (name === 'support_chat_customer_chats') return { data: { conversations: await readChats(auth.user) } }
        if (name === 'support_chat_account') return accountError ? { error: accountError } : { data: { id: auth.user.id, role: 'customer' } }
        throw new Error(`Unexpected RPC: ${name}`)
      } } },
      '../lib/authRedirect': { getAuthRedirectUrl: () => 'https://vi.icue.vn/newsroom/login' },
      '../lib/authReset': { authErrorKey: () => 'login.resetError', sendPasswordResetEmail: async () => ({}) },
      '../hooks/useDocumentTitle': { useDocumentTitle() {} },
      '../components/LanguageSwitcher': { default: Null },
      '../../../shared/customer-account/account.js': { connectAccount: async () => ({ auth: { getSession: async () => ({ data: { session: auth.user ? { user: auth.user } : null } }) } }) },
      '../../../shared/chatbot/lib/liveChat.js': { getLiveChatClient: () => live },
      '../../../shared/chatbot/LiveChatPanel.jsx': { default: Null },
    },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(CustomerPortal)) })
  t.after(async () => unmount(renderer))
  return {
    renderer, calls, routes, destinations, saved,
    output: () => JSON.stringify(renderer.toJSON()),
    field: name => renderer.root.findByProps({ name }),
    change: (name, value) => act(async () => renderer.root.findByProps({ name }).props.onChange({ target: { value } })),
    submit: () => act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} })),
    user: next => act(async () => emit(next)),
    logout: () => act(async () => renderer.root.findByProps({ className: 'customer-portal__workspace-header' }).findByType('button').props.onClick()),
  }
}

test('signing in and out discards credentials and password visibility', async t => {
  const f = await fixture(t)
  await f.change('email', firstUser.email)
  await f.change('password', 'synthetic-password')
  await act(async () => f.renderer.root.findByProps({ 'aria-label': 'login.showPassword' }).props.onClick())
  assert.equal(f.field('password').props.type, 'text')
  await f.submit()
  assert.ok(f.output().includes('customer-portal--workspace'))
  await f.logout()
  assert.equal(f.field('password').props.value, '')
  assert.equal(f.field('password').props.type, 'password')
  assert.equal(f.field('email').props.value, '')
  assert.equal(f.output().includes('synthetic-password'), false)
})

test('external account transitions discard the previous private previews before the new fetch resolves or fails', async t => {
  const secondRead = deferred()
  const f = await fixture(t, { initialUser: firstUser, readChats: user => user.id === firstUser.id
    ? Promise.resolve([{ id: 'private-a', preview: 'Private account A enquiry', updated_at: '2026-10-30T00:00:00Z', status: 'active' }])
    : secondRead.promise })
  assert.ok(f.output().includes('Private account A enquiry'))
  await f.user(null)
  await f.user(secondUser)
  assert.ok(f.output().includes(secondUser.email))
  assert.equal(f.output().includes('Private account A enquiry'), false)
  await act(async () => secondRead.reject(new Error('Connection lost')))
  assert.ok(f.output().includes('Could not load your conversations'))
  assert.equal(f.output().includes('Private account A enquiry'), false)
})

test('the account boundary preserves native return navigation and the saved-chat handoff', async t => {
  const f = await fixture(t, { search: '?return=%2Fcontact&lang=en' })
  await f.change('email', firstUser.email)
  await f.change('password', 'synthetic-password')
  await f.submit()
  assert.deepEqual(f.destinations, ['/contact?lang=en'])
  assert.equal(f.saved.get('icue:open-team-chat'), '1')
  assert.equal(f.calls.filter(call => call.name === 'saveDraft').length, 1)
  assert.equal(f.calls.find(call => call.name === 'syncAccount').user.id, firstUser.id)
})

test('failed authentication retains the current credentials for a retry', async t => {
  const f = await fixture(t, { signInError: { code: 'invalid_credentials' } })
  await f.change('email', firstUser.email)
  await f.change('password', 'synthetic-password')
  await f.submit()
  assert.equal(f.field('password').props.value, 'synthetic-password')
  assert.equal(f.field('email').props.value, firstUser.email)
  assert.ok(f.output().includes('login.error'))
})

test('a failed handoff after successful authentication still displays its error', async t => {
  const f = await fixture(t, { accountError: new Error('Connection lost'), search: '?return=%2Fcontact&lang=en' })
  await f.change('email', firstUser.email)
  await f.change('password', 'synthetic-password')
  await f.submit()
  assert.ok(f.output().includes('customer-portal--workspace'))
  assert.ok(f.output().includes('Unable to connect. Please try again.'))
  assert.deepEqual(f.destinations, [])
  await f.logout()
  assert.equal(f.field('password').props.value, '')
})
