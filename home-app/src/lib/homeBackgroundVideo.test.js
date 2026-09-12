import assert from 'node:assert/strict';
import test from 'node:test';

let fixtureId = 0;

async function createFixture(t, { play, readyState = 2 } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', () => {});
  const idleTasks = new Map();
  const warmupVideos = [];
  let idleId = 0;

  class Video extends EventTarget {
    attributes = new Map();
    style = {};
    paused = true;
    readyState = readyState;
    currentTime = 0;
    duration = 30;
    playCalls = 0;
    loads = 0;
    setAttribute(key, value) { this.attributes.set(key, String(value)); }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    removeAttribute(key) { this.attributes.delete(key); }
    get src() { return this.getAttribute('src') || ''; }
    set src(value) { this.setAttribute('src', value); }
    get currentSrc() { return this.src; }
    querySelectorAll() { return []; }
    load() { this.loads += 1; }
    pause() { this.paused = true; }
    play() {
      this.playCalls += 1;
      if (play) return play(this);
      this.paused = false;
      return Promise.resolve();
    }
    remove() { warmupVideos.splice(warmupVideos.indexOf(this), 1); }
  }

  const video = new Video();
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: new Video(),
    getElementById: id => id === 'bgVideo' ? video : null,
    createElement: () => new Video(),
    body: { appendChild: el => warmupVideos.push(el) },
  });
  const window = Object.assign(new EventTarget(), {
    matchMedia: () => ({ matches: false }),
    requestIdleCallback: callback => {
      idleTasks.set(++idleId, callback);
      return idleId;
    },
    cancelIdleCallback: id => idleTasks.delete(id),
  });
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
  };
  const globals = { window, document, navigator: {}, localStorage: storage(), sessionStorage: storage() };
  const descriptors = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const { default: manager } = await import(`./homeBackgroundVideo.js?fixture=${++fixtureId}`);
  t.after(() => {
    manager.destroy();
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return { manager, video, document, window, idleTasks, warmupVideos };
}

test('turning video off cancels queued preloads and resize work', async t => {
  const { manager, video, window, idleTasks, warmupVideos } = await createFixture(t);
  manager.init();
  assert.ok(video.src);
  assert.equal(idleTasks.size, 1);
  window.dispatchEvent(new Event('resize'));
  manager.setEnabled(false);
  for (const callback of idleTasks.values()) callback();
  t.mock.timers.tick(2000);
  assert.equal(video.src, '');
  assert.equal(idleTasks.size, 0);
  assert.equal(warmupVideos.length, 0);
  assert.equal(video.playCalls, 1);
});

test('a play rejection after leaving Home cannot access the detached video', async t => {
  let rejectPlay;
  const { manager, video } = await createFixture(t, {
    play: () => new Promise((resolve, reject) => { rejectPlay = reject; }),
  });
  manager.init();
  manager.destroy();
  rejectPlay(new Error('autoplay blocked'));
  await Promise.resolve();
  t.mock.timers.tick(2000);
  assert.equal(video.playCalls, 1);
  assert.equal(video.src, '');
});

test('a queued autoplay retry is cancelled when video is turned off', async t => {
  const { manager, video } = await createFixture(t, {
    play: () => Promise.reject(new Error('autoplay blocked')),
  });
  manager.init();
  await Promise.resolve();
  manager.setEnabled(false);
  t.mock.timers.tick(2000);
  assert.equal(video.playCalls, 1);
});

test('a rejected promise from a previous activation cannot retry the new video', async t => {
  let rejectPlay;
  const { manager, video } = await createFixture(t, {
    play: el => el.playCalls === 1
      ? new Promise((resolve, reject) => { rejectPlay = reject; })
      : Promise.resolve(),
  });
  manager.init();
  manager.init();
  rejectPlay(new Error('old autoplay blocked'));
  await Promise.resolve();
  t.mock.timers.tick(200);
  assert.equal(video.playCalls, 2);
});

test('loading completion and retry timers do not resume video in a hidden tab', async t => {
  const { manager, video, document } = await createFixture(t, { readyState: 0 });
  manager.init();
  document.hidden = true;
  video.dispatchEvent(new Event('canplay'));
  t.mock.timers.tick(1500);
  assert.equal(video.playCalls, 0);
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(video.playCalls, 1);
});

test('leaving Home removes pending media event listeners', async t => {
  const { manager, video } = await createFixture(t, { readyState: 0 });
  manager.init();
  manager.destroy();
  video.dispatchEvent(new Event('loadedmetadata'));
  video.dispatchEvent(new Event('canplay'));
  t.mock.timers.tick(2000);
  assert.equal(video.playCalls, 0);
});
