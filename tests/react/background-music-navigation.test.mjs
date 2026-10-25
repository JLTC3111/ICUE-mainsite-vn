import test from 'node:test'
import assert from 'node:assert/strict'
import { platform, sourceModule } from '../../shared/resilience/testHarness.js'

const KEY = 'icue-background-music'
const SRC = '/public/music/mixkit-driving-ambition-32.mp3'
const snapshot = (playing, currentTime) => ({ version: 1, src: SRC, playing, currentTime })
const settle = async () => { for (let i = 0; i < 6; i++) await Promise.resolve() }

function session(initial) {
  const values = new Map(initial === undefined ? [] : [[KEY, typeof initial === 'string' ? initial : JSON.stringify(initial)]])
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    read: () => JSON.parse(values.get(KEY) || 'null'),
  }
}

async function page(storage = session()) {
  const f = platform()
  const instances = []
  class Audio extends EventTarget {
    paused = true
    ended = false
    error = null
    readyState = 0
    duration = Number.NaN
    playCalls = 0
    pauseCalls = 0
    loadCalls = 0
    time = 0
    constructor(src) { super(); this.src = src; instances.push(this) }
    get currentTime() { return this.time }
    set currentTime(value) {
      if (this.readyState < 1) throw new DOMException('Metadata is unavailable', 'InvalidStateError')
      this.time = value
    }
    play() {
      this.playCalls++
      if (this.playError) return Promise.reject(this.playError)
      this.paused = false
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    }
    pause() {
      this.pauseCalls++
      this.paused = true
      this.dispatchEvent(new Event('pause'))
    }
    load() { this.loadCalls++ }
    metadata(duration = 180) {
      this.duration = duration
      this.readyState = 1
      this.dispatchEvent(new Event('loadedmetadata'))
    }
    playing() {
      this.paused = false
      this.readyState = 4
      this.dispatchEvent(new Event('playing'))
    }
    advance(time) {
      this.time = time
      this.dispatchEvent(new Event('timeupdate'))
    }
  }
  f.window.Audio = Audio
  f.window.sessionStorage = storage
  const api = await sourceModule('shared/contact-sidebar/backgroundMusic.js', {
    globals: { ...f, Audio, sessionStorage: storage },
  })
  return { ...f, ...api, storage, instances, Audio }
}

function lifecycle(target, type, persisted = false) {
  const event = new Event(type)
  Object.defineProperty(event, 'persisted', { value: persisted })
  target.dispatchEvent(event)
}

function gesture(target, type = 'click', musicToggle = false) {
  const event = new Event(type)
  Object.defineProperties(event, {
    target: { value: { closest: selector => musicToggle && selector.includes('data-icue-music-toggle') ? {} : null } },
    key: { value: 'Enter' },
    isTrusted: { value: true },
  })
  target.dispatchEvent(event)
}

test('fresh pages share one idle audio element and do not download or autoplay music', async () => {
  const f = await page()
  const audio = f.getBackgroundAudio()
  assert.equal(f.getBackgroundAudio(), audio)
  assert.equal(f.window.__icueBackgroundAudio, audio)
  assert.equal(f.instances.length, 1)
  assert.equal(audio.preload, 'none')
  assert.equal(audio.playCalls, 0)
  assert.equal(audio.loadCalls, 0)
  assert.equal(f.storage.read()?.playing ?? false, false)
})

test('a new document resumes saved music at its previous position after metadata arrives', async () => {
  const f = await page(session(snapshot(true, 42.75)))
  const audio = f.getBackgroundAudio()
  await settle()
  assert.equal(audio.playCalls, 1, 'saved playback is resumed without another toggle')
  assert.equal(audio.currentTime, 0, 'seeking waits until the media supports it')
  assert.equal(f.storage.read().currentTime, 42.75, 'loading does not overwrite the saved position')
  audio.metadata()
  await settle()
  assert.equal(audio.currentTime, 42.75)
  assert.equal(f.storage.read().playing, true)
})

test('page changes carry playback intent and position even when the old document pauses during unload', async () => {
  const storage = session()
  const oldPage = await page(storage)
  const oldAudio = oldPage.getBackgroundAudio()
  await oldPage.toggleBackgroundMusic()
  oldAudio.metadata()
  oldAudio.playing()
  oldAudio.advance(28.5)
  lifecycle(oldPage.window, 'pagehide')
  oldAudio.pause()
  assert.equal(storage.read().playing, true, 'unload pauses must not become a user pause')
  assert.equal(storage.read().currentTime, 28.5)

  const nextPage = await page(storage)
  const nextAudio = nextPage.getBackgroundAudio()
  await settle()
  nextAudio.metadata()
  assert.notEqual(nextAudio, oldAudio)
  assert.equal(nextAudio.playCalls, 1)
  assert.equal(nextAudio.currentTime, 28.5)
})

test('a saved position waits for a seekable media range instead of resetting to the beginning', async () => {
  const f = await page(session(snapshot(true, 42.75)))
  const audio = f.getBackgroundAudio()
  let buffered = false
  audio.seekable = { get length() { return buffered ? 1 : 0 }, start: () => 0, end: () => 180 }
  audio.metadata()
  audio.playing()
  audio.advance(0.2)
  assert.equal(audio.currentTime, 0.2)
  assert.equal(f.storage.read().currentTime, 42.75, 'loading events retain the desired position')
  buffered = true
  audio.dispatchEvent(new Event('progress'))
  assert.equal(audio.currentTime, 42.75)
  audio.advance(43.5)
  assert.equal(f.storage.read().currentTime, 43.5)
})

test('an explicit pause remains paused across navigation and resumes from the saved position on demand', async () => {
  const storage = session(snapshot(true, 12))
  const oldPage = await page(storage)
  const oldAudio = oldPage.getBackgroundAudio()
  await settle()
  oldAudio.metadata()
  oldAudio.playing()
  oldAudio.advance(16)
  await oldPage.toggleBackgroundMusic()
  assert.equal(storage.read().playing, false)
  lifecycle(oldPage.window, 'pagehide')

  const nextPage = await page(storage)
  const nextAudio = nextPage.getBackgroundAudio()
  await settle()
  assert.equal(nextAudio.playCalls, 0)
  nextAudio.metadata()
  assert.equal(nextAudio.currentTime, 16)
  await nextPage.toggleBackgroundMusic()
  assert.equal(nextAudio.playCalls, 1)
  assert.equal(nextAudio.currentTime, 16)
})

test('autoplay rejection retries once on a user gesture and keeps the saved position', async () => {
  const f = await page(session(snapshot(true, 37)))
  f.Audio.prototype.playError = new DOMException('User activation required', 'NotAllowedError')
  const audio = f.getBackgroundAudio()
  audio.metadata()
  await settle()
  assert.equal(audio.playCalls, 1)
  assert.equal(audio.paused, true)
  assert.equal(f.storage.read().playing, true, 'policy rejection preserves the visitor playback choice')
  delete f.Audio.prototype.playError
  gesture(f.document)
  await settle()
  assert.equal(audio.playCalls, 2)
  assert.equal(audio.currentTime, 37)
  audio.playing()
  gesture(f.document)
  await settle()
  assert.equal(audio.playCalls, 2, 'successful retry disarms gesture listeners')
})

test('queued media events cannot reverse a newer explicit play or pause choice', async () => {
  const f = await page()
  const audio = f.getBackgroundAudio()
  audio.metadata()
  await f.toggleBackgroundMusic()
  audio.playing()
  await f.toggleBackgroundMusic()
  audio.dispatchEvent(new Event('playing'))
  assert.equal(f.storage.read().playing, false, 'a queued playing event cannot undo an explicit pause')
  await f.toggleBackgroundMusic()
  audio.dispatchEvent(new Event('pause'))
  audio.dispatchEvent(new Event('ended'))
  assert.equal(f.storage.read().playing, true, 'old stop events cannot undo a newer play request')
})

test('the music toggle handles a blocked restore without an additional gesture retry', async () => {
  const f = await page(session(snapshot(true, 37)))
  f.Audio.prototype.playError = new DOMException('User activation required', 'NotAllowedError')
  const audio = f.getBackgroundAudio()
  audio.metadata()
  await settle()
  delete f.Audio.prototype.playError
  gesture(f.document, 'click', true)
  await settle()
  assert.equal(audio.playCalls, 1, 'the automatic retry ignores clicks on the music control')
  await f.toggleBackgroundMusic()
  await settle()
  assert.equal(audio.playCalls, 2)
  audio.playing()
  gesture(f.document, 'keydown')
  await settle()
  assert.equal(audio.playCalls, 2)
})

test('back-forward cache restoration follows the latest document playback state', async () => {
  const storage = session(snapshot(true, 10))
  const f = await page(storage)
  const audio = f.getBackgroundAudio()
  audio.metadata()
  await settle()
  audio.playing()
  lifecycle(f.window, 'pagehide', true)
  storage.setItem(KEY, JSON.stringify(snapshot(false, 54)))
  audio.advance(11)
  audio.playing()
  assert.equal(storage.read().currentTime, 54, 'late events from the departing document cannot overwrite the next page')
  assert.equal(storage.read().playing, false)
  lifecycle(f.window, 'pageshow', true)
  await settle()
  assert.equal(audio.paused, true)
  assert.equal(audio.currentTime, 54)
  assert.equal(storage.read().playing, false)

  lifecycle(f.window, 'pagehide', true)
  storage.setItem(KEY, JSON.stringify(snapshot(true, 72)))
  lifecycle(f.window, 'pageshow', true)
  await settle()
  assert.equal(audio.paused, false)
  assert.equal(audio.currentTime, 72)
  assert.equal(f.instances.length, 1, 'BFCache uses the existing document audio')
})

test('invalid or inaccessible session state cannot break music controls', async () => {
  for (const invalid of ['{broken', snapshot(true, -1), snapshot(true, '42'), { ...snapshot(true, 12), version: 2 }, { ...snapshot(true, 12), src: '/other.mp3' }]) {
    const f = await page(session(invalid))
    const audio = f.getBackgroundAudio()
    await settle()
    assert.equal(audio.playCalls, 0, `invalid state is ignored: ${JSON.stringify(invalid)}`)
    await f.toggleBackgroundMusic()
    assert.equal(audio.playCalls, 1)
  }
  const inaccessible = {
    getItem() { throw new DOMException('Storage disabled', 'SecurityError') },
    setItem() { throw new DOMException('Storage disabled', 'SecurityError') },
  }
  const f = await page(inaccessible)
  const audio = f.getBackgroundAudio()
  assert.equal(audio.playCalls, 0)
  await f.toggleBackgroundMusic()
  audio.metadata()
  audio.playing()
  audio.advance(8)
  lifecycle(f.window, 'pagehide')
  assert.equal(audio.error, null)
})
