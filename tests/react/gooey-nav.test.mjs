import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const { createRoot } = require('react-dom/client');

function graphics({ compile = true } = {}) {
  const events = { draws: 0, buffers: 0, programs: 0, deletedBuffers: 0, deletedPrograms: 0, deletedShaders: 0 };
  const methods = {
    createShader: () => ({}), createProgram: () => { events.programs++; return {}; },
    createBuffer: () => { events.buffers++; return {}; },
    getShaderParameter: () => compile, getProgramParameter: () => true,
    getUniformLocation: (_program, name) => name, getAttribLocation: () => 0,
    drawArrays: () => { events.draws++; },
    deleteBuffer: () => { events.deletedBuffers++; }, deleteProgram: () => { events.deletedPrograms++; },
    deleteShader: () => { events.deletedShaders++; },
  };
  return { events, gl: new Proxy(methods, { get: (target, property) => property in target ? target[property] : /^[A-Z_0-9]+$/.test(String(property)) ? String(property) : () => {} }) };
}

const ITEMS = [
  { label: 'Website', href: 'https://icue.vn/', target: '_blank', ariaLabel: 'ICUE Website' },
  { label: 'HR Portal', href: 'https://hr.icue.vn/', target: '_blank' },
];

async function fixture(t, props = {}, { webgl = false, compile = true, observers = true } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><main></main><button id="outside">Outside</button></body></html>', { pretendToBeVisual: true, url: 'https://icue.test/' });
  const { window } = dom, { document } = window;
  const previous = new Map();
  for (const [key, value] of Object.entries({ window, document })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const media = Object.assign(new window.EventTarget(), { matches: false });
  window.matchMedia = () => media;
  const { gl, events } = graphics({ compile });
  let contexts = 0, hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  window.HTMLCanvasElement.prototype.getContext = () => { contexts++; return webgl ? gl : null; };
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    const index = Number(this.dataset.gooeyIndex || 0);
    const item = this.tagName === 'LI';
    const width = item ? 140 : 284;
    return { left: 20 + (item ? index * 144 : 0), top: 20, right: 20 + width, bottom: 64, width, height: 44 };
  };
  const frames = new Map(), intersections = new Set(), resizes = new Set();
  let next = 0, now = 0;
  class Intersection { constructor(callback) { this.callback = callback; intersections.add(this); } observe() {} disconnect() { intersections.delete(this); } }
  class Resize { constructor(callback) { this.callback = callback; resizes.add(this); } observe() {} disconnect() { resizes.delete(this); } }
  const { default: GooeyNav } = await sourceModule('shared/ui/GooeyNav.jsx', { globals: {
    window, document, performance: { now: () => now },
    requestAnimationFrame: callback => { frames.set(++next, callback); return next; },
    cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: observers ? Intersection : undefined,
    ResizeObserver: observers ? Resize : undefined,
  } });
  const root = createRoot(document.querySelector('main'));
  let currentProps = { items: ITEMS, ariaLabel: 'ICUE links', ...props };
  const update = async nextProps => {
    currentProps = { ...currentProps, ...nextProps };
    await act(async () => root.render(React.createElement(GooeyNav, currentProps)));
  };
  const unmount = async () => { await act(async () => root.unmount()); };
  t.after(async () => {
    await unmount();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  await update({});
  const links = () => [...document.querySelectorAll('a')];
  const click = async (node, options = {}) => {
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, ...options });
    await act(async () => node.dispatchEvent(event));
    return event;
  };
  return {
    document, window, frames, intersections, resizes, media, events, update, unmount, links, click,
    contexts: () => contexts,
    active: () => document.querySelector('[data-active]')?.dataset.gooeyIndex,
    async flush(count = 1) {
      await act(async () => {
        for (let i = 0; i < count && frames.size; i++) {
          const queue = [...frames.values()]; frames.clear(); now += 16;
          queue.forEach(callback => callback(now));
        }
      });
    },
    async visibility(value) { hidden = value; await act(async () => document.dispatchEvent(new window.Event('visibilitychange'))); },
    async reduced(value) { media.matches = value; await act(async () => media.dispatchEvent(new window.Event('change'))); },
  };
}

test('current Gooey Nav retains native external links and a static fallback without WebGL', async t => {
  const f = await fixture(t, {}, { observers: false });
  assert.equal(f.document.querySelector('nav').getAttribute('aria-label'), 'ICUE links');
  assert.equal(f.links().length, 2, 'The visual overlay never duplicates interactive links');
  assert.equal(f.links()[0].getAttribute('aria-label'), 'ICUE Website');
  for (const link of f.links()) {
    assert.equal(link.target, '_blank');
    assert.equal(link.rel, 'noopener noreferrer');
  }
  assert.equal(f.document.querySelector('canvas').style.display, 'none');
  assert.equal(f.document.querySelector('.gooey-nav__stage').dataset.gooeyStatic, 'true');
  assert.equal(f.document.querySelector('.gooey-nav__fallback').style.display, 'block');
  assert.equal((await f.click(f.links()[1], { metaKey: true })).defaultPrevented, false);
  assert.equal(f.active(), '1');
  assert.equal(f.frames.size, 0, 'Fallback navigation does not run an animation loop');
  await act(async () => f.window.dispatchEvent(new f.window.Event('resize')));
  assert.equal(f.active(), '1');
});

test('route-controlled selection follows navigation and browser history rather than click state', async t => {
  let changes = 0;
  const f = await fixture(t, { activeIndex: 0, onChange: () => changes++ });
  await f.click(f.links()[1]);
  assert.equal(changes, 1);
  assert.equal(f.active(), '0');
  await f.update({ activeIndex: 1 });
  assert.equal(f.active(), '1');
  assert.equal(f.links()[1].getAttribute('aria-current'), 'page');
  await f.update({ activeIndex: 0 });
  assert.equal(f.active(), '0');
});

test('hover social links also activate on keyboard focus and clear when focus leaves', async t => {
  const f = await fixture(t, { activateOnHover: true, initialActiveIndex: -1, ariaCurrent: null });
  assert.equal(f.active(), undefined);
  await act(async () => f.links()[1].focus());
  assert.equal(f.active(), '1');
  assert.equal(f.document.querySelector('[aria-current]'), null, 'Hovering a social link does not declare it the current page');
  await act(async () => f.document.querySelector('#outside').focus());
  assert.equal(f.active(), undefined);
  assert.equal(f.frames.size, 0);
});

test('empty and shorter item lists stay usable, and action-only items remain native buttons', async t => {
  let clicks = 0;
  const f = await fixture(t, { initialActiveIndex: 1 });
  await f.update({ items: [] });
  assert.equal(f.active(), undefined);
  await f.update({ items: [{ label: 'Action', onClick: () => clicks++ }] });
  const button = f.document.querySelector('.gooey-nav__link');
  assert.equal(button.tagName, 'BUTTON');
  await f.click(button);
  assert.equal(clicks, 1);
  assert.equal(f.active(), '0');
});

test('canvas goo transitions settle and release all GPU and observer resources', async t => {
  const f = await fixture(t, {}, { webgl: true });
  assert.equal(f.document.querySelector('canvas').style.display, 'block');
  await f.click(f.links()[1]);
  assert.ok(f.frames.size > 0);
  await f.flush(500);
  assert.equal(f.frames.size, 0, 'A settled pill stops requesting frames');
  assert.ok(f.events.draws > 2);
  await f.unmount();
  assert.equal(f.events.deletedBuffers, f.events.buffers);
  assert.equal(f.events.deletedPrograms, f.events.programs);
  assert.equal(f.intersections.size, 0);
  assert.equal(f.resizes.size, 0);
});

test('hidden and offscreen navigation stops animation and retains the selected destination', async t => {
  const f = await fixture(t, {}, { webgl: true });
  await f.click(f.links()[1]);
  await f.visibility(true);
  assert.equal(f.frames.size, 0);
  await f.visibility(false);
  assert.equal(f.active(), '1');
  await f.click(f.links()[0]);
  for (const observer of f.intersections) observer.callback([{ isIntersecting: false }]);
  assert.equal(f.frames.size, 0);
  for (const observer of f.intersections) observer.callback([{ isIntersecting: true }]);
  assert.equal(f.active(), '0');
});

test('live reduced motion and explicit reduced mode stop canvas work without losing navigation', async t => {
  const f = await fixture(t, {}, { webgl: true });
  await f.click(f.links()[1]);
  await f.reduced(true);
  assert.equal(f.frames.size, 0);
  assert.equal(f.document.querySelector('canvas').style.display, 'none');
  await f.click(f.links()[0]);
  assert.equal(f.active(), '0');
  await f.reduced(false);
  assert.equal(f.document.querySelector('canvas').style.display, 'block');
  const contexts = f.contexts();
  await f.update({ reduceMotion: true });
  assert.equal(f.contexts(), contexts, 'Explicit reduced motion does not acquire a graphics context');
  assert.equal(f.frames.size, 0);
});

test('context loss switches to the native-link fallback and restoration rebuilds the renderer', async t => {
  const f = await fixture(t, {}, { webgl: true });
  const canvas = f.document.querySelector('canvas');
  await f.click(f.links()[1]);
  await act(async () => canvas.dispatchEvent(new f.window.Event('webglcontextlost', { cancelable: true })));
  assert.equal(f.frames.size, 0);
  assert.equal(canvas.style.display, 'none');
  assert.equal(f.active(), '1');
  await act(async () => canvas.dispatchEvent(new f.window.Event('webglcontextrestored')));
  assert.equal(canvas.style.display, 'block');
  assert.equal(f.document.querySelector('.gooey-nav__stage').dataset.gooeyStatic, 'false');
  assert.equal(f.active(), '1');
  assert.equal(f.events.programs, 2);
});

test('shader compilation failure leaves ordinary navigation available and cleans failed shaders', async t => {
  const f = await fixture(t, {}, { webgl: true, compile: false });
  assert.equal(f.document.querySelector('canvas').style.display, 'none');
  assert.equal(f.events.deletedShaders, 2);
  assert.equal(f.events.deletedPrograms, f.events.programs);
  await f.click(f.links()[1]);
  assert.equal(f.active(), '1');
  assert.equal(f.frames.size, 0);
});
