import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, deferred, platform, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'

const icons = createRequire(import.meta.url)('lucide-react')
const Null = () => null
const firstUser = { id: 'account-a' }, secondUser = { id: 'account-b' }
const rooms = [{ id: 'room-one', name: 'Customer A project', kind: 'customers', archived: false }, { id: 'room-two', name: 'Customer B project', kind: 'customers', archived: false }]
const document = text => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const message = (id, text, userId = firstUser.id, clientId = `client-${id}`) => ({ id: String(id), client_id: clientId, user_id: userId, display_name: userId, document: document(text), created_at: '2026-11-09T01:00:00Z', files: [] })
function Composer(props) { return React.createElement('composer', props) }

async function fixture(t, options = {}) {
  silenceRenderer(t)
  const f = platform(), listeners = new Set(), calls = [], timers = new Map()
  let auth = { user: firstUser, loading: false }, timer = 0, clientId = 0
  let read = options.read || (async () => ({ messages: [], has_more: false }))
  let send = options.send || (async args => ({ message: message(1, args.p_document.content[0].content[0].text, firstUser.id, args.p_client_id) }))
  const { default: ChatRooms } = await sourceModule('news-app/src/pages/ChatRooms.jsx', {
    globals: { ...f, crypto: { randomUUID: () => `client-id-${++clientId}` }, setTimeout(fn, delay) { const id = ++timer; timers.set(id, { fn, delay }); return id }, clearTimeout: id => timers.delete(id) },
    imports: {
      'react-router-dom': { Link: props => React.createElement('a', { ...props, href: props.to }) },
      'react-i18next': { useTranslation: () => ({ i18n: { resolvedLanguage: 'en' } }) },
      'lucide-react': icons,
      '../context/AuthContext': { useAuth: () => React.useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener) }, () => auth, () => auth) },
      '../hooks/useDocumentTitle': { useDocumentTitle() {} },
      '../components/LanguageSwitcher': { default: Null },
      '../../../shared/ui/LatticeLoader.jsx': { default: Null },
      '../components/RoomComposer': { default: Composer },
      '../components/RoomMessage': { default: props => React.createElement('p', null, props.message.document.content[0].content[0].text) },
      '../lib/roomChat': { recordRoomNetwork: async () => {}, roomChatRpc: async (name, args, request = {}) => {
        calls.push({ name, args, signal: request.signal, userId: auth.user?.id })
        if (name === 'bootstrap') return options.bootstrap ? options.bootstrap(auth.user) : { account: { ...auth.user, role: 'customer', display_name: auth.user.id }, rooms, can_manage: false }
        if (name === 'messages') return read(args, request)
        if (name === 'send') return send(args, request)
        throw new Error(`Unexpected RPC ${name}`)
      } },
    },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(ChatRooms)) })
  t.after(() => unmount(renderer))
  return { renderer, calls, timers, output: () => JSON.stringify(renderer.toJSON()),
    composer: () => renderer.root.findByType(Composer),
    draft: text => act(async () => { const component = renderer.root.findByType(Composer); component.props.onDraft({ ...component.props.draft, document: document(text) }) }),
    send: () => act(async () => renderer.root.findByType(Composer).props.onSend()),
    async room(id) { await act(async () => renderer.root.findAllByType('button').find(button => button.props.children?.[1]?.props?.children?.[0]?.props?.children === rooms.find(room => room.id === id).name).props.onClick()) },
    async user(next) { await act(async () => { auth = { ...auth, user: next }; listeners.forEach(listener => listener()) }) },
    async poll() { await act(async () => f.window.dispatchEvent(new Event('online'))) },
    async hidden(value) { await act(async () => { f.document.hidden = value; f.document.dispatchEvent(new Event('visibilitychange')) }) },
    setRead: next => { read = next }, setSend: next => { send = next },
  }
}

test('an unconfirmed send retries the same immutable payload and only the sender can acknowledge it', async t => {
  const firstSend = deferred()
  const f = await fixture(t, { send: () => firstSend.promise })
  await f.draft('Private message')
  let pending
  await act(async () => { pending = f.composer().props.onSend() })
  const sent = f.calls.find(call => call.name === 'send').args
  await act(async () => { firstSend.reject(new Error('Lost acknowledgement')); await pending })
  assert.equal(f.composer().props.draft.pending.id, sent.p_client_id)
  f.setRead(async () => ({ messages: [message(9, 'Peer message with the same client UUID', secondUser.id, sent.p_client_id)], has_more: false }))
  await f.poll()
  assert.equal(f.composer().props.draft.pending.id, sent.p_client_id, 'A peer UUID collision must not discard the sender draft')
  f.setSend(async args => ({ message: message(10, 'Private message', firstUser.id, args.p_client_id) }))
  await f.send()
  const retried = f.calls.filter(call => call.name === 'send').at(-1).args
  assert.deepEqual(JSON.parse(JSON.stringify(retried)), JSON.parse(JSON.stringify(sent)))
  assert.equal(f.composer().props.draft.pending, null)
  assert.ok(f.output().includes('Private message'))
})

test('stale room responses cannot replace the selected room and account changes erase private state', async t => {
  const stale = deferred()
  const f = await fixture(t, { read: async args => args.p_room_id === 'room-one' ? { messages: [message(1, 'Private account A')], has_more: false } : { messages: [message(2, 'Other room')], has_more: false } })
  assert.ok(f.output().includes('Private account A'))
  f.setRead(args => args.p_room_id === 'room-one' ? stale.promise : Promise.resolve({ messages: [message(2, 'Other room')], has_more: false }))
  await f.poll()
  await f.room('room-two')
  assert.ok(f.output().includes('Other room'))
  await act(async () => stale.resolve({ messages: [message(3, 'Stale secret')], has_more: false }))
  assert.equal(f.output().includes('Stale secret'), false)
  const nextRead = deferred(); f.setRead(() => nextRead.promise)
  await f.user(secondUser)
  assert.equal(f.output().includes('Private account A'), false)
  assert.equal(f.output().includes('Other room'), false)
  await f.user(null)
  assert.equal(f.output().includes('Sign in to chat'), true)
  await act(async () => nextRead.resolve({ messages: [message(4, 'Late private data')], has_more: false }))
  assert.equal(f.output().includes('Late private data'), false)
})

test('hidden chatrooms stop polling and resume immediately; backend rejection clears private history', async t => {
  const f = await fixture(t, { read: async () => ({ messages: [message(1, 'Private history')], has_more: false }) })
  await f.hidden(true)
  assert.equal(f.timers.size, 0)
  const before = f.calls.length
  await f.poll()
  assert.equal(f.calls.length, before)
  await f.hidden(false)
  assert.ok(f.calls.length > before)
  f.setRead(async () => { throw Object.assign(new Error('Revoked'), { code: '42501' }) })
  await f.poll()
  assert.equal(f.output().includes('Private history'), false)
  assert.equal(f.output().includes('Room access is unavailable'), true)
})

test('oversize visible drafts cannot silently send a previous shorter message', async t => {
  const f = await fixture(t)
  await f.draft('Short original')
  await f.draft('x'.repeat(4001))
  await f.send()
  assert.equal(f.calls.filter(call => call.name === 'send').length, 0)
  assert.equal(f.composer().props.draft.document.content[0].content[0].text.length, 4001)
})
