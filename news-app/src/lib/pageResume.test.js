import test from 'node:test'
import assert from 'node:assert/strict'
import { subscribeToPageResume } from './pageResume.js'

class FakeDocument extends EventTarget {
  hidden = false
}

function dispatch(target, type, properties = {}) {
  const event = new Event(type)
  Object.defineProperties(event, Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [key, { value }]),
  ))
  target.dispatchEvent(event)
}

test('refreshes once after a mobile tab was suspended long enough', () => {
  const documentTarget = new FakeDocument()
  const windowTarget = new EventTarget()
  const resumes = []
  let time = 1_000
  const unsubscribe = subscribeToPageResume((event) => resumes.push(event), {
    documentTarget,
    windowTarget,
    now: () => time,
    minHiddenMs: 30_000,
  })

  documentTarget.hidden = true
  dispatch(documentTarget, 'visibilitychange')
  time += 30_000
  documentTarget.hidden = false
  dispatch(documentTarget, 'visibilitychange')
  dispatch(windowTarget, 'focus')

  assert.deepEqual(resumes, [{ reason: 'visibilitychange', hiddenFor: 30_000 }])
  unsubscribe()
})

test('does not refetch after a brief app switch', () => {
  const documentTarget = new FakeDocument()
  const windowTarget = new EventTarget()
  let resumeCount = 0
  let time = 1_000
  subscribeToPageResume(() => { resumeCount += 1 }, {
    documentTarget,
    windowTarget,
    now: () => time,
    minHiddenMs: 30_000,
  })

  documentTarget.hidden = true
  dispatch(documentTarget, 'visibilitychange')
  time += 5_000
  documentTarget.hidden = false
  dispatch(documentTarget, 'visibilitychange')

  assert.equal(resumeCount, 0)
})

test('always refreshes a bfcache restore or network reconnect', () => {
  const documentTarget = new FakeDocument()
  const windowTarget = new EventTarget()
  const reasons = []
  let time = 1_000
  subscribeToPageResume(({ reason }) => reasons.push(reason), {
    documentTarget,
    windowTarget,
    now: () => time,
  })

  dispatch(windowTarget, 'pageshow', { persisted: true })
  time += 100
  dispatch(windowTarget, 'online')

  assert.deepEqual(reasons, ['pageshow', 'online'])
})
