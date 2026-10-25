import assert from 'node:assert/strict'
import test from 'node:test'
import { React, act, create, platform, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

async function fixture(t, { playing = false, locale = 'en' } = {}) {
  silenceRenderer(t)
  const f = platform()
  const timers = new Map()
  let serial = 0, now = 0
  let playback = { isPlaying: playing, trackTitle: 'mixkit-driving-ambition-32.mp3' }
  f.window.setTimeout = (callback, delay) => {
    const id = ++serial
    timers.set(id, { callback, at: now + delay })
    return id
  }
  f.window.clearTimeout = id => timers.delete(id)
  const { default: Banner } = await sourceModule('shared/contact-sidebar/BackgroundMusicBanner.jsx', {
    globals: f,
    imports: { './useBackgroundMusic.js': { useBackgroundMusic: () => playback } },
  })
  const element = () => React.createElement(React.StrictMode, null, React.createElement(Banner, { locale }))
  let renderer
  await act(async () => { renderer = create(element()) })
  const update = async (next, nextLocale = locale) => {
    playback = { ...playback, ...next }
    locale = nextLocale
    await act(async () => renderer.update(element()))
  }
  const tick = async ms => {
    await act(async () => {
      now += ms
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(id)
          timer.callback()
        }
      }
    })
  }
  return { renderer, timers, update, tick,
    status: () => renderer.root.findAllByProps({ role: 'status' }),
    close: () => renderer.root.findByType('button'),
  }
}

test('song notification waits for actual playback, hides after six seconds and returns on resume', async t => {
  const f = await fixture(t)
  assert.equal(f.status().length, 0)
  assert.equal(f.timers.size, 0, 'idle or rejected playback creates no notification deadline')
  await f.update({ isPlaying: true })
  assert.equal(f.status().length, 1)
  assert.equal(f.status()[0].props['aria-live'], 'polite')
  assert.deepEqual(f.status()[0].findAllByType('span').map(span => span.children.join('')), ['Now playing', 'mixkit-driving-ambition-32.mp3'])
  assert.equal(f.timers.size, 1, 'Strict Mode leaves one auto-dismiss deadline')
  await f.tick(5999)
  assert.equal(f.status().length, 1)
  await f.tick(1)
  assert.equal(f.status().length, 0)
  await f.update({}, 'vi')
  assert.equal(f.status().length, 0, 'locale changes and host rerenders do not repeat a dismissed banner')
  await f.update({ isPlaying: false })
  await f.update({ isPlaying: true })
  assert.equal(f.status().length, 1)
  assert.equal(f.status()[0].findAllByType('span')[0].children[0], 'Đang phát')
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('manual dismissal changes the notification only, and paused or buffering playback removes it', async t => {
  const f = await fixture(t, { playing: true })
  assert.equal(f.status().length, 1, 'restored music is announced when the next page mounts')
  assert.equal(f.close().props['aria-label'], 'Dismiss song notification')
  await act(async () => f.close().props.onClick())
  assert.equal(f.status().length, 0)
  assert.equal(f.timers.size, 0)
  await f.update({ trackTitle: 'another-track.mp3' })
  assert.equal(f.status().length, 1, 'a new song gets a fresh notification')
  await f.update({ isPlaying: false })
  assert.equal(f.status().length, 0, 'paused, waiting or failed audio never displays now playing')
  assert.equal(f.timers.size, 0)
  await unmount(f.renderer)
})

test('keyboard users can reach dismissal without the notification timing out under focus', async t => {
  const f = await fixture(t, { playing: true, locale: 'ja' })
  await act(async () => f.close().props.onFocus())
  assert.equal(f.timers.size, 0)
  await f.tick(10_000)
  assert.equal(f.status().length, 1)
  await act(async () => f.close().props.onBlur())
  assert.equal(f.timers.size, 1)
  await f.tick(6000)
  assert.equal(f.status().length, 0)
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})
