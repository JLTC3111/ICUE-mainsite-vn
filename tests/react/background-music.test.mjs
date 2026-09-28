import test from 'node:test'
import assert from 'node:assert/strict'
import { getEventListeners } from 'node:events'
import { React, act, create, deferred, platform, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

test('music controls and late subscribers share actual playback, rejected starts and cleanup', async t => {
  silenceRenderer(t)
  const f = platform()
  const instances = []
  class Audio extends EventTarget {
    paused = true
    ended = false
    error = null
    readyState = 0
    constructor(src) { super(); this.src = src; instances.push(this) }
    play() {
      if (this.blocked) return Promise.reject(new Error('Playback blocked'))
      this.pending = deferred()
      this.paused = false
      this.dispatchEvent(new Event('play'))
      return this.pending.promise
    }
    start() {
      this.readyState = 4
      this.dispatchEvent(new Event('playing'))
      this.pending.resolve()
    }
    pause() { this.paused = true; this.dispatchEvent(new Event('pause')) }
  }
  const globals = { ...f, Audio }
  const { useAudioVisualizer } = await sourceModule('shared/contact-sidebar/useAudioVisualizer.js', { globals })
  const { useBackgroundMusic } = await sourceModule('shared/contact-sidebar/useBackgroundMusic.js', { globals })
  let controls, listener
  function Rail() { controls = useAudioVisualizer(); return null }
  function Listener() { listener = useBackgroundMusic(); return null }
  const render = (showListener = false) => React.createElement(React.StrictMode, null,
    React.createElement(Rail), showListener && React.createElement(Listener))
  let renderer
  await act(async () => { renderer = create(render()) })
  assert.equal(instances.length, 1, 'StrictMode creates one shared audio element')
  const audio = instances[0]
  assert.equal(audio.preload, 'none', 'mounting does not preload or play music')
  assert.equal(controls.isPlaying, false)
  audio.blocked = true
  await act(async () => controls.toggle())
  assert.equal(controls.isPlaying, false, 'rejected playback never activates the rail')
  audio.blocked = false
  let start
  await act(async () => { start = controls.toggle() })
  assert.equal(controls.isPlaying, false, 'a play request alone is not audible playback')
  await act(async () => { audio.start(); await start })
  assert.equal(controls.isPlaying, true)
  assert.equal(controls.isAnimating, true)
  await act(async () => renderer.update(render(true)))
  assert.equal(listener.isPlaying, true, 'late subscribers observe music already playing')
  assert.equal(instances.length, 1)

  await act(async () => {
    f.document.hidden = true
    f.document.dispatchEvent(new Event('visibilitychange'))
  })
  assert.equal(controls.isAnimating, false)
  assert.equal(controls.isPlaying, true, 'hidden pages pause animation, not playback state')
  assert.equal(listener.isPlaying, true)
  await act(async () => controls.toggle())
  assert.equal(controls.isPlaying, false)
  assert.equal(listener.isPlaying, false, 'one pause updates both subscribers')
  await act(async () => {
    f.document.hidden = false
    f.document.dispatchEvent(new Event('visibilitychange'))
  })
  assert.equal(controls.isAnimating, false, 'returning while paused does not restart animation')

  await unmount(renderer)
  for (const event of ['playing', 'pause', 'ended', 'waiting', 'emptied', 'error']) {
    assert.equal(getEventListeners(audio, event).length, 0, `${event} listeners are removed`)
  }
  assert.equal(getEventListeners(f.document, 'visibilitychange').length, 0)
})
