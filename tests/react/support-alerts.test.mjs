import test from 'node:test'
import assert from 'node:assert/strict'
import { deferred, platform, sourceModule } from '../../shared/resilience/testHarness.js'

const { createSupportAlerts } = await sourceModule('news-app/src/lib/supportAlerts.js')
const first = '00000000-0000-4000-8000-000000008401'
const second = '00000000-0000-4000-8000-000000008402'
const event = (seq, id = first, count = 1) => ({ conversation_id: id, seq: String(seq), count, visitor_name: 'Visitor', preview: `Question ${seq}` })
const response = (cursor, events = [], extra = {}) => ({ cursor: String(cursor), events, unread: events.reduce((n, e) => n + e.count, 0), has_more: false, ...extra })
const storage = () => {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve() }

function fixture(options = {}) {
  const f = platform(), calls = [], timers = new Map()
  let timerId = 0
  const preferenceStorage = options.preferenceStorage || storage()
  const sessionStorage = options.sessionStorage || storage()
  const service = createSupportAlerts({ userId: options.userId || 'staff-one', preferenceStorage, sessionStorage, ...f,
    rpc(args, options) { const d = deferred(); calls.push({ ...d, args, options }); return d.promise },
    setTimer(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id },
    clearTimer: id => timers.delete(id),
  })
  return { ...f, calls, timers, preferenceStorage, sessionStorage, service,
    async resolve(data) { calls.at(-1).resolve(data); await flush() },
    async next() { const [id, timer] = timers.entries().next().value; timers.delete(id); timer.fn(); await flush(); return timer.delay },
  }
}

test('staff opt in once, receive grouped persistent alerts, and the badge includes the whole inbox', async () => {
  const f = fixture()
  f.service.start()
  assert.equal(f.calls.length, 0)
  f.service.setEnabled(true)
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].args.p_after, null)
  await f.resolve(response(2, [event(2, first, 2)], { unread: 120 }))
  assert.equal(f.service.getSnapshot().unread, 120)
  assert.equal(f.service.getSnapshot().toasts[0].count, 2)
  assert.equal(f.service.getSnapshot().arrival, 1)
  assert.equal(await f.next(), 2500)
  await f.resolve(response(3, [event(3)], { unread: 0 }))
  assert.equal(f.service.getSnapshot().toasts.length, 1)
  assert.equal(f.service.getSnapshot().toasts[0].count, 3)
  assert.equal(f.service.getSnapshot().toasts[0].preview, 'Question 3')
  for (let i = 0; i < 12; i++) { await f.next(); await f.resolve(response(3, [], { unread: 0 })) }
  assert.equal(f.service.getSnapshot().toasts.length, 1, 'Read state and time never dismiss a toast')
  f.service.dismiss(first, '3')
  assert.equal(f.service.getSnapshot().toasts.length, 0)
  await f.next(); await f.resolve(response(3, [event(3)]))
  assert.equal(f.service.getSnapshot().toasts.length, 0, 'A replay cannot recreate a clicked alert')
  f.service.stop()
  assert.equal(f.timers.size, 0)
})

test('new messages survive an acknowledgement racing the previous toast and large batches drain immediately', async () => {
  const f = fixture()
  f.service.start(); f.service.setEnabled(true)
  await f.resolve(response(1, [event(1)]))
  await f.next(); await f.resolve(response(2, [event(2)], { has_more: true }))
  f.service.dismiss(first, '1')
  assert.equal(f.service.getSnapshot().toasts[0].seq, '2')
  assert.equal(await f.next(), 0)
  await f.resolve(response(3, [event(3, second)]))
  assert.equal(f.service.getSnapshot().toasts.length, 2)
  f.service.stop()
})

test('overlapping polls catch late commits while acknowledged and baseline messages stay dismissed', async () => {
  const f = fixture()
  f.service.start(); f.service.setEnabled(true)
  await f.resolve(response(10, [event(10)], { seen: ['8', '10'] }))
  f.service.dismiss(first, '10')
  await f.next(); await f.resolve(response(10, [], { overlap: [event(10), event(9, second), event(8)] }))
  assert.equal(f.service.getSnapshot().toasts.length, 1)
  assert.equal(f.service.getSnapshot().toasts[0].id, second)
  assert.equal(f.service.getSnapshot().toasts[0].seq, '9')
  f.service.dismiss(second, '9')
  await f.next(); await f.resolve(response(10, [], { overlap: [event(9, second)] }))
  assert.equal(f.service.getSnapshot().toasts.length, 0)
  f.service.stop()
})

test('preferences, pending toasts and the cursor survive reloads and stay scoped to the staff account', async () => {
  const f = fixture()
  f.service.start(); f.service.setEnabled(true)
  await f.resolve(response(9, [event(9)])); f.service.stop()
  const reload = fixture({ preferenceStorage: f.preferenceStorage, sessionStorage: f.sessionStorage })
  reload.service.start()
  assert.equal(reload.calls[0].args.p_after, '9')
  assert.equal(reload.service.getSnapshot().toasts[0].seq, '9')
  await reload.resolve(response(9))
  assert.equal(reload.service.getSnapshot().toasts.length, 1)
  const other = fixture({ userId: 'staff-two', preferenceStorage: f.preferenceStorage, sessionStorage: f.sessionStorage })
  other.service.start()
  assert.equal(other.calls.length, 0)
  assert.equal(other.service.getSnapshot().toasts.length, 0)
  reload.service.stop(); other.service.stop()
})

test('hidden tabs keep checking and reconnect immediately without overlapping requests', async () => {
  const f = fixture()
  f.service.start(); f.service.setEnabled(true)
  f.document.hidden = true
  await f.resolve(response(1))
  assert.equal(await f.next(), 10_000)
  f.window.dispatchEvent(new Event('online'))
  assert.equal(f.calls.length, 2, 'Do not start a second request while one is pending')
  await f.resolve(response(2, [event(2)]))
  assert.equal(f.service.getSnapshot().toasts.length, 1)
  f.document.hidden = false
  f.document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(f.calls.length, 3)
  await f.resolve(response(2)); f.service.stop()
})

test('muting and cross-tab preferences stop requests without silently discarding pending toasts', async () => {
  const f = fixture()
  f.service.start(); f.service.setEnabled(true)
  await f.resolve(response(1, [event(1)]))
  f.service.setEnabled(false)
  assert.equal(f.timers.size, 0)
  assert.equal(f.service.getSnapshot().toasts.length, 1)
  f.preferenceStorage.setItem('icue:support-alerts:staff-one', 'true')
  f.window.dispatchEvent(Object.assign(new Event('storage'), { key: 'icue:support-alerts:staff-one' }))
  assert.equal(f.calls.length, 2)
  assert.equal(f.calls[1].args.p_after, '1')
  await f.resolve(response(1)); f.service.stop()
})

test('network failure preserves alerts, backs off, and revoked permission clears private state', async () => {
  const f = fixture()
  f.service.start(); f.service.setEnabled(true)
  await f.resolve(response(1, [event(1)]))
  await f.next(); f.calls.at(-1).reject(new Error('Offline')); await flush()
  assert.equal(f.service.getSnapshot().error, true)
  assert.equal(f.service.getSnapshot().toasts.length, 1)
  assert.equal(await f.next(), 5000)
  await f.resolve(response(2, [event(2)]))
  assert.equal(f.service.getSnapshot().error, false)
  await f.next(); f.calls.at(-1).reject(Object.assign(new Error('Access revoked'), { code: '42501' })); await flush()
  assert.equal(f.service.getSnapshot().enabled, false)
  assert.equal(f.service.getSnapshot().toasts.length, 0)
  assert.equal(f.service.getSnapshot().unread, 0)
  assert.equal(f.timers.size, 0)
  f.service.stop()
})

test('blocked storage, late responses and malformed payloads cannot lose or leak alerts', async () => {
  const blocked = { getItem() { throw new Error('Blocked') }, setItem() { throw new Error('Blocked') } }
  const f = fixture({ preferenceStorage: blocked, sessionStorage: blocked })
  f.service.start(); f.service.setEnabled(true)
  await f.resolve(response(1, [event(1)]))
  await f.next(); await f.resolve(response(2, [{ ...event(2), conversation_id: '<script>' }]))
  assert.equal(f.service.getSnapshot().toasts[0].seq, '1')
  assert.equal(f.service.getSnapshot().error, true)
  await f.next()
  assert.equal(f.calls.at(-1).args.p_after, '1')
  const pending = f.calls.at(-1)
  f.service.stop()
  assert.equal(pending.options.signal.aborted, true)
  pending.resolve(response(3, [event(3, second)])); await flush()
  assert.equal(f.service.getSnapshot().toasts.length, 1)
  assert.equal(f.timers.size, 0)
})
