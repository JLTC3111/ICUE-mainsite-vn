import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, deferred, i18n, platform, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'
import { roomChatCopy } from '../../news-app/src/lib/roomChatCopy.js'

const icons = createRequire(import.meta.url)('lucide-react')
const Null = () => null
const signedInAt = '2026-11-09T08:15:00Z'
const firstUser = { id: 'account-a', email: 'a@example.invalid', last_sign_in_at: signedInAt }, secondUser = { id: 'account-b' }
const rooms = [{ id: 'room-one', name: 'Customer A project', kind: 'customers', archived: false }, { id: 'room-two', name: 'Customer B project', kind: 'customers', archived: false }]
const document = text => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const message = (id, text, userId = firstUser.id, clientId = `client-${id}`) => ({ id: String(id), client_id: clientId, user_id: userId, display_name: userId, document: document(text), created_at: '2026-11-09T01:00:00Z', files: [] })
function Composer(props) { return React.createElement('composer', props) }

async function fixture(t, options = {}) {
  silenceRenderer(t)
  const f = platform(), listeners = new Set(), calls = [], timers = new Map(), storage = options.storage || new Map()
  f.window.confirm = options.confirm || (() => true)
  const localStorage = { getItem: key => storage.has(key) ? storage.get(key) : null, setItem: (key, value) => storage.set(String(key), String(value)) }
  let auth = { user: firstUser, profile: { full_name: 'Ada Author' }, loading: false }, timer = 0, clientId = 0
  let read = options.read || (async () => ({ messages: [], has_more: false }))
  let send = options.send || (async args => ({ message: message(1, args.p_document.content[0].content[0].text, firstUser.id, args.p_client_id) }))
  const { default: ChatRooms } = await sourceModule('news-app/src/pages/ChatRooms.jsx', {
    globals: { ...f, localStorage, crypto: { randomUUID: () => `client-id-${++clientId}` }, setTimeout(fn, delay) { const id = ++timer; timers.set(id, { fn, delay }); return id }, clearTimeout: id => timers.delete(id) },
    imports: {
      'react-router-dom': { Link: props => React.createElement('a', { ...props, href: props.to }) },
      'react-i18next': { useTranslation: () => ({ i18n: { resolvedLanguage: 'en' } }) },
      'lucide-react': icons,
      '../context/AuthContext': { useAuth: () => React.useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener) }, () => auth, () => auth) },
      '../hooks/useDocumentTitle': { useDocumentTitle() {} },
      '../components/ChatHeader': { default: Null },
      '../../../shared/ui/LatticeLoader.jsx': { default: Null },
      '../components/RoomComposer': { default: Composer },
      '../components/RoomMessage': { default: props => React.createElement('p', null, props.message.document.content[0].content[0].text) },
      '../lib/roomChat': { recordRoomNetwork: async () => {}, roomChatRpc: async (name, args, request = {}) => {
        calls.push({ name, args, signal: request.signal, userId: auth.user?.id })
        if (name === 'bootstrap') return options.bootstrap ? options.bootstrap(auth.user) : { account: { ...auth.user, role: 'customer', display_name: auth.user.id }, rooms, can_manage: false }
        if (name === 'messages') return read(args, request)
        if (name === 'send') return send(args, request)
        if (name === 'presence') return options.presence ? options.presence(args) : Promise.reject(new Error('Unexpected RPC presence'))
        if (name === 'direct' && options.direct) return options.direct(args)
        if (name === 'set_alias' && options.setAlias) return options.setAlias(args)
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

test('the sidebar shows the signed-in account details', async t => {
  const f = await fixture(t)
  const signedIn = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(signedInAt))
  assert.ok(f.output().includes('Ada Author'))
  assert.ok(f.output().includes('a@example.invalid'))
  assert.ok(f.output().includes('customer'))
  assert.ok(f.output().includes(signedIn))
})

test('the account block collapses and the sidebar handle changes its width', async t => {
  const storage = new Map()
  const f = await fixture(t, { storage })
  for (const locale of ['vi', 'de', 'fr', 'ja']) assert.notEqual(roomChatCopy(locale).myAccount, roomChatCopy('en').myAccount)
  const account = () => f.renderer.root.findByProps({ 'aria-controls': 'room-account-details' })
  assert.equal(account().props.children[0].props.children, 'My Account')
  assert.equal(account().props['aria-expanded'], true)
  assert.ok(f.output().includes('a@example.invalid'))
  await act(async () => account().props.onClick())
  assert.equal(account().props['aria-expanded'], false)
  assert.equal(account().props.children[0].props.children, 'My Account')
  assert.equal(f.output().includes('a@example.invalid'), false)
  assert.equal(storage.get('icue.room.account'), 'closed')
  await act(async () => account().props.onClick())
  assert.ok(f.output().includes('a@example.invalid'))
  const handle = () => f.renderer.root.findByProps({ role: 'separator' })
  assert.equal(handle().props['aria-label'], 'Resize sidebar')
  assert.equal(handle().props['aria-valuenow'], 260)
  const press = key => act(async () => handle().props.onKeyDown({ key, shiftKey: key === 'ArrowRight', preventDefault() {} }))
  await press('ArrowRight')
  assert.equal(handle().props['aria-valuenow'], 292)
  await press('Home')
  assert.equal(handle().props['aria-valuenow'], 200)
  await press('End')
  assert.equal(handle().props['aria-valuenow'], 520)
  const target = { closest: () => ({ getBoundingClientRect: () => ({ left: 10 }) }), setPointerCapture() {}, releasePointerCapture() {} }
  await act(async () => handle().props.onPointerDown({ button: 0, pointerId: 3, currentTarget: target, preventDefault() {} }))
  await act(async () => handle().props.onPointerMove({ clientX: 40, currentTarget: target }))
  assert.equal(handle().props['aria-valuenow'], 200)
  await act(async () => handle().props.onPointerMove({ clientX: 900, currentTarget: target }))
  assert.equal(handle().props['aria-valuenow'], 520)
  await act(async () => handle().props.onPointerUp({ pointerId: 3, currentTarget: target }))
  assert.equal(storage.get('icue.room.sidebar'), '520')
})

test('chat members see names and statuses instead of the room list', async t => {
  const members = [
    { id: 'account-a', display_name: 'Ada Author', role: 'author', status: 'available' },
    { id: 'account-c', display_name: 'Busy Colleague', full_name: 'Busy Person', email: 'busy@example.invalid', role: 'member', status: 'busy' },
    { id: 'account-d', display_name: 'Author', full_name: 'Away Person', email: 'away@example.invalid', role: 'manager', status: 'offline' },
    { id: 'account-e', display_name: 'Author', email: 'placeholder@example.invalid', role: 'author', status: 'offline' },
  ]
  const f = await fixture(t, {
    bootstrap: () => ({ account: { id: firstUser.id, role: 'author', display_name: 'Ada Author' }, rooms, can_manage: false }),
    presence: async () => ({ members }),
  })
  const findNode = (node, type) => {
    if (!node || typeof node !== 'object') return null
    if (node.type === type) return node
    for (const child of node.children || []) { const found = findNode(child, type); if (found) return found }
    return null
  }
  const sidebar = JSON.stringify(findNode(f.renderer.toJSON(), 'aside'))
  const memberList = JSON.stringify(findNode(findNode(f.renderer.toJSON(), 'aside'), 'ul'))
  assert.ok(memberList.includes('Ada Author'))
  assert.ok(memberList.includes('a@example.invalid'))
  assert.ok(memberList.includes('Busy Person'))
  assert.ok(memberList.includes('busy@example.invalid'))
  assert.equal(memberList.includes('Busy Colleague'), false)
  assert.ok(sidebar.includes('Away Person'))
  assert.ok(sidebar.includes('away@example.invalid'))
  assert.ok(memberList.includes('placeholder@example.invalid'))
  assert.equal(memberList.includes('"Author"'), false)
  assert.ok(sidebar.includes('Available'))
  assert.ok(sidebar.includes('Busy'))
  assert.ok(sidebar.includes('Offline'))
  assert.equal(sidebar.includes('Your rooms'), false)
  assert.equal(sidebar.includes('Customer A project'), false)
  assert.ok(f.output().includes('Customer A project'))
  assert.ok(f.calls.some(call => call.name === 'presence' && call.args.p_status === 'available'))
  await act(async () => f.renderer.root.findAllByType('button').find(button => button.props.children === 'Busy').props.onClick())
  assert.ok(f.calls.some(call => call.name === 'presence' && call.args.p_status === 'busy'))
  assert.ok(f.output().includes('Customer A project'))
})

test('managers can open the staff room form', async t => {
  const f = await fixture(t, {
    bootstrap: () => ({ account: { id: firstUser.id, role: 'manager', display_name: 'Ada Author' }, rooms, can_manage: true }),
    presence: async () => ({ members: [] }),
  })
  const button = f.renderer.root.findAllByType('button').find(node => node.props['aria-label'] === 'Create staff room')
  assert.ok(button)
  await act(async () => button.props.onClick())
  assert.ok(f.output().includes('Every internal account can join. Customers cannot see this room.'))
})

const colleague = { id: 'account-c', display_name: 'Busy Colleague', full_name: 'Busy Person', email: 'busy@example.invalid' }
const colleagues = [{ id: 'account-a', display_name: 'Ada Author', role: 'author', status: 'available' }, { ...colleague, role: 'member', status: 'busy' }]
const directRoom = (overrides = {}) => ({ id: 'dm-c', name: 'Direct message', kind: 'dm', archived: false, read_only: false, peer: colleague, ...overrides })
const internal = (role, list) => ({ account: { id: firstUser.id, role, display_name: 'Ada Author' }, rooms: list, can_manage: role === 'manager' })
const threadLabel = f => f.renderer.root.find(node => node.type === 'section' && node.props.className === 'room-chat__thread').props['aria-label']

test('a directory member opens a private direct message named after them', async t => {
  const labels = roomChatCopy('en')
  let opened = false
  const f = await fixture(t, {
    bootstrap: () => internal('manager', opened ? [directRoom(), ...rooms] : rooms),
    presence: async () => ({ members: colleagues }),
    direct: async args => { opened = true; return { room: directRoom({ peer: { ...colleague, id: args.p_user_id } }) } },
  })
  const buttons = () => f.renderer.root.findAllByType('button')
  assert.equal(buttons().some(node => node.props['aria-label']?.startsWith(`${labels.messagePerson}: Ada Author`)), false, 'Your own row is not a DM target')
  assert.ok(buttons().some(node => node.props['aria-label'] === labels.manage), 'Managers keep the Manage button in shared rooms')
  await act(async () => buttons().find(node => node.props['aria-label'] === `${labels.messagePerson}: Busy Person, ${labels.busy}`).props.onClick())
  assert.equal(f.calls.find(call => call.name === 'direct').args.p_user_id, 'account-c')
  assert.equal(threadLabel(f), 'Busy Person')
  assert.ok(f.output().includes(labels.dmHint))
  assert.ok(f.calls.some(call => call.name === 'messages' && call.args.p_room_id === 'dm-c'))
  assert.equal(buttons().some(node => node.props['aria-label'] === labels.manage), false, 'DMs have no manager controls')
  const direct = f.renderer.root.find(node => node.props.className === 'room-chat__direct')
  assert.ok(JSON.stringify(direct.findAllByType('button').map(node => node.props['aria-pressed'])).includes('true'))
})

test('a direct message for another person is rejected and nothing opens', async t => {
  const labels = roomChatCopy('en')
  const f = await fixture(t, {
    bootstrap: () => internal('member', rooms),
    presence: async () => ({ members: colleagues }),
    direct: async () => ({ room: directRoom({ peer: { ...colleague, id: 'someone-else' } }) }),
  })
  await act(async () => f.renderer.root.findAllByType('button').find(node => node.props['aria-label'] === `${labels.messagePerson}: Busy Person, ${labels.busy}`).props.onClick())
  assert.ok(f.output().includes(labels.dmError))
  assert.equal(threadLabel(f), 'Customer A project')
})

test('a recent DM does not open by default, and a read-only DM keeps history but cannot send', async t => {
  const labels = roomChatCopy('en')
  const commons = { id: 'commons', name: 'ICUE members', kind: 'members', archived: false }
  const f = await fixture(t, {
    bootstrap: () => internal('member', [directRoom({ read_only: true }), commons]),
    presence: async () => ({ members: colleagues }),
    read: async args => ({ messages: [message(1, args.p_room_id === 'dm-c' ? 'Earlier DM' : 'Commons')], has_more: false }),
  })
  assert.equal(f.calls.find(call => call.name === 'messages').args.p_room_id, 'commons')
  assert.equal(threadLabel(f), labels.members)
  await act(async () => f.renderer.root.find(node => node.props.className === 'room-chat__direct').findAllByType('button')[0].props.onClick())
  assert.equal(threadLabel(f), 'Busy Person')
  assert.ok(f.output().includes('Earlier DM'))
  assert.ok(f.output().includes(labels.dmReadOnly))
  assert.equal(f.composer().props.archived, true)
  await f.draft('Should not send')
  await f.send()
  assert.equal(f.calls.filter(call => call.name === 'send').length, 0)
})

test('the account section has no portal link and customers get no alias editor', async t => {
  const f = await fixture(t)
  const identity = f.renderer.root.find(node => node.type === 'section' && node.props.className?.startsWith('room-chat__identity'))
  assert.equal(identity.findAllByType('a').length, 0)
  assert.equal(JSON.stringify(identity.findAll(() => true).map(node => node.props.className || '')).includes('room-chat__portal'), false)
  assert.equal(identity.findAllByType('form').length, 0)
})

test('an internal account saves a chat alias after confirming, then waits 30 days to change it again', async t => {
  const labels = roomChatCopy('en')
  const confirms = []
  const nextChange = '2026-12-12T09:00:00Z'
  const f = await fixture(t, {
    confirm: message => { confirms.push(message); return true },
    bootstrap: () => ({ account: { id: firstUser.id, role: 'member', display_name: 'Ada' }, rooms, can_manage: false, alias: { alias: null, changed_at: null, next_change_at: null } }),
    presence: async () => ({ members: [{ id: firstUser.id, display_name: 'Ada', role: 'member', status: 'available' }] }),
    setAlias: async args => ({ alias: args.p_alias, changed_at: '2026-11-12T09:00:00Z', next_change_at: nextChange }),
  })
  const form = () => f.renderer.root.find(node => node.type === 'form' && node.props.className === 'room-chat__alias')
  assert.ok(f.output().includes(labels.aliasHint))
  await act(async () => form().findByType('input').props.onChange({ target: { value: '  Night   Owl ' } }))
  await act(async () => form().props.onSubmit({ preventDefault() {} }))
  assert.deepEqual(confirms, [labels.aliasConfirm])
  assert.equal(f.calls.find(call => call.name === 'set_alias').args.p_alias, 'Night Owl')
  assert.equal(form().findByType('input').props.disabled, true)
  assert.equal(form().findByType('input').props.value, 'Night Owl')
  const date = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(nextChange))
  assert.ok(f.output().includes(labels.aliasNext.replace('{date}', date)))
  assert.equal(form().findAllByType('button').length, 0, 'No save button while the alias is locked')
  const memberList = f.renderer.root.find(node => node.type === 'ul' && node.props.className === 'room-chat__members')
  assert.equal(memberList.findAll(node => node.type === 'strong')[0].children[0], 'Night Owl', 'Your own directory row shows the new alias')
})

test('a declined confirmation or a taken alias does not change anything', async t => {
  const labels = roomChatCopy('en')
  let allow = false
  const f = await fixture(t, {
    confirm: () => allow,
    bootstrap: () => ({ account: { id: firstUser.id, role: 'author', display_name: 'Ada' }, rooms, can_manage: false, alias: { alias: null, changed_at: null, next_change_at: null } }),
    presence: async () => ({ members: [] }),
    setAlias: async () => { throw Object.assign(new Error('taken'), { code: '23505' }) },
  })
  const form = () => f.renderer.root.find(node => node.type === 'form' && node.props.className === 'room-chat__alias')
  await act(async () => form().findByType('input').props.onChange({ target: { value: 'Bao Tran' } }))
  await act(async () => form().props.onSubmit({ preventDefault() {} }))
  assert.equal(f.calls.some(call => call.name === 'set_alias'), false)
  allow = true
  await act(async () => form().props.onSubmit({ preventDefault() {} }))
  assert.ok(f.output().includes(labels.aliasTaken))
  assert.equal(form().findByType('input').props.disabled, false)
})

test('colleague aliases appear with the real name in the directory and direct messages', async t => {
  const labels = roomChatCopy('en')
  const f = await fixture(t, {
    bootstrap: () => internal('member', [directRoom({ peer: { ...colleague, alias: 'Night Owl' } }), ...rooms]),
    presence: async () => ({ members: [{ ...colleague, alias: 'Night Owl', role: 'member', status: 'busy' }] }),
  })
  const memberList = JSON.stringify(f.renderer.root.find(node => node.type === 'ul' && node.props.className === 'room-chat__members').findAll(node => node.type === 'li').map(node => node.findAll(child => child.type === 'strong' || child.type === 'small').map(child => child.children[0])))
  assert.ok(memberList.includes('"Night Owl","Busy Person"'))
  assert.ok(f.renderer.root.findAllByType('button').some(node => node.props['aria-label'] === `${labels.messagePerson}: Night Owl, ${labels.busy}`))
  await act(async () => f.renderer.root.find(node => node.props.className === 'room-chat__direct').findAllByType('button')[0].props.onClick())
  assert.equal(threadLabel(f), 'Night Owl')
  assert.ok(f.output().includes('(Busy Person)'))
})

test('the chatrooms header keeps site navigation and account controls without newsroom tools', async t => {
  silenceRenderer(t)
  const labels = roomChatCopy('en')
  let auth = { isAuthed: false, profile: null }, signOuts = 0
  const anchor = ({ to, end, ...props }) => React.createElement('a', { ...props, href: to })
  const { default: ChatHeader } = await sourceModule('news-app/src/components/ChatHeader.jsx', {
    globals: platform(),
    imports: {
      'react-router-dom': { Link: anchor, NavLink: anchor },
      'react-i18next': i18n,
      '@icue/drawer-menu': { DrawerMenu: Null },
      '../context/AuthContext': { useAuth: () => auth },
      '../lib/defaults': { DEFAULT_AVATAR: 'avatar.png' },
      '../hooks/useMainSite': { useMainSite: () => ({ base: '/?lang=en', hashLink: () => '/', peopleLink: () => '/people', structureLink: () => '/structure' }) },
      '../hooks/useMediaQuery': { default: () => false },
      './LanguageSwitcher': { default: () => React.createElement('lang-switcher') },
      './magicui/AnimatedShinyText': { AnimatedShinyText: props => props.children },
      '../../../shared/app-switcher/AppSwitcher.jsx': { default: Null },
    },
  })
  let renderer
  const render = (props = {}) => React.createElement(ChatHeader, { key: `${auth.isAuthed}-${auth.isAdmin}-${Boolean(props.onSignOut)}`, locale: 'en', ...props })
  await act(async () => { renderer = create(render()) })
  t.after(() => unmount(renderer))
  const links = () => renderer.root.findAllByType('a').map(node => node.props.href)
  const output = () => JSON.stringify(renderer.toJSON())
  assert.ok(output().includes(labels.navBadge))
  assert.ok(output().includes(labels.navRooms) && output().includes(labels.supportChats))
  assert.ok(links().includes('/chatrooms?lang=en'), 'Links to the chatrooms')
  assert.ok(links().includes('/portal?lang=en'), 'Links to the support chats')
  assert.ok(links().includes('/'), 'Links back to the newsroom')
  assert.ok(links().includes('/portal?next=chatrooms&lang=en'), 'Signing in returns to chatrooms')
  assert.equal(renderer.root.findAllByType('lang-switcher').length, 1)
  for (const newsroomOnly of ['search.label', 'nav.archive', 'nav.authorTools', 'notifications']) assert.equal(output().includes(newsroomOnly), false, newsroomOnly)
  auth = { isAuthed: true, profile: { avatar_url: null }, signOut: async () => { signOuts++; return {} } }
  await act(async () => renderer.update(render()))
  assert.equal(links().includes('/portal?next=chatrooms&lang=en'), false)
  assert.ok(links().includes('/portal?lang=en'))
  assert.equal(links().includes('/support?lang=en'), false, 'Only admins see the support inbox link')
  auth = { ...auth, isAdmin: true }
  await act(async () => renderer.update(render()))
  assert.ok(links().includes('/support?lang=en'))
  assert.ok(output().includes('Support inbox'))
  const signOut = () => act(async () => renderer.root.findAllByType('button').find(node => node.props.title === 'nav.logout').props.onClick())
  await signOut()
  assert.equal(signOuts, 1)
  let pageSignOuts = 0
  await act(async () => renderer.update(render({ onSignOut: async () => { pageSignOuts++ } })))
  await signOut()
  assert.equal(pageSignOuts, 1, 'A page can supply its own sign-out')
  assert.equal(signOuts, 1)
})

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

test('the sender can edit or delete a recent message, and a deleted message leaves only the notice', async t => {
  silenceRenderer(t)
  const labels = roomChatCopy('en')
  const calls = []
  const { default: RoomMessage } = await sourceModule('news-app/src/components/RoomMessage.jsx', {
    imports: {
      'lucide-react': icons,
      '../lib/roomChat': {
        downloadRoomFile: async () => {},
        roomChatRpc: async (name, args) => { calls.push({ name, args }); return { message: { id: args.p_message_id, deleted_at: '2026-11-09T12:00:00Z', document: { type: 'doc', content: [] }, files: [] } } },
      },
      './RoomComposer': { default: props => React.createElement('div', { 'data-editing': props.editing ? 'yes' : 'no' }, props.draft?.document?.content?.[0]?.content?.[0]?.text || '') },
    },
  })
  const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const expired = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
  const own = { id: 7, user_id: firstUser.id, display_name: 'Ada', document: document('Hello room'), created_at: recent, files: [{ id: 'file-1', name: 'photo.jpg', mime: 'image/jpeg', size: 2048 }] }
  let renderer
  const show = message => React.createElement(RoomMessage, { key: message.user_id + message.created_at + (message.deleted_at || ''), message, roomId: 'room-one', userId: firstUser.id, locale: 'en', labels, onUpdated() {} })
  await act(async () => { renderer = create(show(own)) })
  t.after(() => unmount(renderer))
  const buttons = () => renderer.root.findAllByType('button')
  assert.ok(buttons().some(node => node.props.children === labels.edit))
  assert.ok(buttons().some(node => node.props.children === labels.deleteMessage))
  assert.ok(buttons().some(node => node.props['aria-label'] === `${labels.deleteFile}: photo.jpg`))
  await act(async () => buttons().find(node => node.props.children === labels.deleteMessage).props.onClick())
  assert.ok(JSON.stringify(renderer.toJSON()).includes(labels.confirmDelete))
  await act(async () => buttons().find(node => node.props.children === labels.deleteMessage).props.onClick())
  assert.equal(calls.at(-1).name, 'delete')
  assert.equal(calls.at(-1).args.p_message_id, 7)
  await act(async () => renderer.update(show(own)))
  await act(async () => buttons().find(node => node.props.children === labels.edit).props.onClick())
  const composer = renderer.root.findAll(node => node.props['data-editing'] === 'yes')
  assert.equal(composer.length, 1)
  assert.equal(composer[0].children[0], 'Hello room')
  await act(async () => renderer.update(show({ ...own, user_id: secondUser.id })))
  assert.equal(buttons().some(node => node.props.children === labels.edit), false)
  assert.equal(buttons().some(node => node.props.children === labels.deleteMessage), false)
  await act(async () => renderer.update(show({ ...own, created_at: expired })))
  assert.equal(buttons().some(node => node.props.children === labels.edit), false)
  assert.equal(buttons().some(node => node.props.children === labels.deleteMessage), false)
  await act(async () => renderer.update(show({ ...own, deleted_at: recent, document: document('Secret wording') })))
  const rendered = JSON.stringify(renderer.toJSON())
  assert.ok(rendered.includes(labels.deleted))
  assert.equal(rendered.includes('Secret wording'), false)
  await act(async () => renderer.update(show({ ...own, user_id: secondUser.id, display_name: 'Alice', alias: 'Night Owl', full_name: 'Alice Nguyen' })))
  const header = JSON.stringify(renderer.toJSON().children[0])
  assert.ok(header.includes('{"type":"strong","props":{},"children":["Night Owl"]}'))
  assert.ok(header.includes('{"type":"span","props":{"className":"room-message__realname"},"children":["Alice Nguyen"]}'))
  await act(async () => renderer.update(show({ ...own, user_id: 'plain-sender', display_name: 'Plain Name' })))
  assert.equal(JSON.stringify(renderer.toJSON().children[0]).includes('room-message__realname'), false)
})

test('oversize visible drafts cannot silently send a previous shorter message', async t => {
  const f = await fixture(t)
  await f.draft('Short original')
  await f.draft('x'.repeat(4001))
  await f.send()
  assert.equal(f.calls.filter(call => call.name === 'send').length, 0)
  assert.equal(f.composer().props.draft.document.content[0].content[0].text.length, 4001)
})
