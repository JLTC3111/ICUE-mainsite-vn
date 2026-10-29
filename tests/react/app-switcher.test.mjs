import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const { createRoot } = require('react-dom/client');
const { createPortal } = require('react-dom');
const icons = require('lucide-react');
const implementations = [
  ['Vietnamese site', 'shared/app-switcher/AppSwitcher.jsx', 'website'],
  ['English site', '../ICUE-mainsite-en/shared/app-switcher/AppSwitcher.jsx', 'website'],
  ['HR portal', '../hr_software/src/components/app-switcher/AppSwitcher.jsx', 'hr'],
  ['Contract portal', '../ICUE_company_software/contract-management-app-v2.1/src/components/app-switcher/AppSwitcher.jsx', 'contracts'],
].filter(([, file]) => existsSync(new URL(`../../${file}`, import.meta.url)));

async function fixture(t, file, currentApp, { width = 1280, height = 800, locale = 'en' } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><main></main><button id="outside">Outside</button></body></html>', { pretendToBeVisual: true, url: 'https://icue.test/' });
  const { window } = dom;
  Object.defineProperties(window, { innerWidth: { configurable: true, writable: true, value: width }, innerHeight: { configurable: true, writable: true, value: height } });
  const frames = new Map();
  let frameId = 0, now = 0;
  window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = id => frames.delete(id);
  const media = Object.assign(new window.EventTarget(), { matches: false });
  window.matchMedia = () => media;
  Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return Math.min(860, window.innerWidth - 24); } });
  Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.classList.contains('card-nav__content') ? (window.innerWidth < 584 ? 440 : 204) : 52; } });
  const flush = async (count = 240) => { await act(async () => {
    for (let i = 0; i < count && frames.size; i++) {
      const pending = [...frames.values()]; frames.clear(); now += 1000 / 60;
      for (const callback of pending) callback(now);
    }
  }); };
  const originals = new Map();
  for (const [name, value] of Object.entries({ window, document: window.document })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const { default: AppSwitcher } = await sourceModule(file, {
    globals: { window, document: window.document },
    imports: { 'react-dom': { createPortal }, 'lucide-react': icons },
  });
  const root = createRoot(window.document.querySelector('main'));
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [name, original] of originals) {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    }
  });
  await act(async () => root.render(React.createElement(AppSwitcher, { currentApp, locale })));
  const document = window.document;
  const trigger = document.querySelector('.icue-apps__trigger');
  trigger.getBoundingClientRect = () => ({ left: width - 50, top: 30, bottom: 74, width: 44, height: 44 });
  const click = async (node, settle = true) => {
    await act(async () => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    if (settle) await flush();
  };
  const key = async (key, options = {}) => {
    const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
    await act(async () => document.activeElement.dispatchEvent(event));
    await flush();
    return event;
  };
  return { window, document, trigger, click, key, flush, frames, media, open: () => click(trigger), panel: () => document.querySelector('.icue-apps__panel') };
}

for (const [name, file, currentApp] of implementations) {
  test(`${name}: cross-app links preserve the current tab and mark the current app`, async t => {
    const f = await fixture(t, file, currentApp);
    assert.equal(f.trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(f.panel(), null);
    await f.open();
    const panel = f.panel();
    assert.equal(panel.parentElement, f.document.body, 'The menu escapes header overflow and transformed ancestors');
    assert.equal(panel.querySelectorAll('[aria-current="page"]').length, 1);
    assert.equal(panel.querySelector('[aria-current="page"]').tagName, 'DIV');
    const links = [...panel.querySelectorAll('a')];
    assert.equal(links.length, 2);
    const expected = {
      website: ['https://hr.icue.vn/', 'https://contract.icue.vn/'],
      hr: ['https://en.icue.vn/', 'https://contract.icue.vn/'],
      contracts: ['https://en.icue.vn/', 'https://hr.icue.vn/'],
    }[currentApp];
    assert.deepEqual(links.map(link => link.href), expected);
    for (const link of links) {
      assert.equal(link.target, '_blank');
      assert.equal(link.rel, 'noopener noreferrer');
    }
    assert.equal(f.document.activeElement, links[0]);
    assert.equal(parseFloat(panel.style.left), name === 'Vietnamese site' ? 408 : 916, 'Desktop menu stays within the viewport');
    await f.key('Escape');
    assert.equal(f.panel(), null);
    assert.equal(f.document.activeElement, f.trigger);
    await f.key('ArrowDown');
    assert.ok(f.panel());
    await act(async () => f.document.querySelector('#outside').dispatchEvent(new f.window.Event('pointerdown', { bubbles: true })));
    await f.flush();
    assert.equal(f.panel(), null);
  });
}

test('mobile app sheet traps focus, closes accessibly, and restores page scrolling', async t => {
  const f = await fixture(t, implementations[0][1], 'website', { width: 320, locale: 'vn' });
  f.document.body.style.overflow = 'auto';
  await f.open();
  assert.equal(f.panel().getAttribute('aria-modal'), 'true');
  assert.ok(f.panel().classList.contains('icue-apps__panel--mobile'));
  assert.equal(f.document.body.style.overflow, 'hidden');
  assert.equal(f.trigger.getAttribute('aria-label'), 'Ứng dụng ICUE');
  const close = f.panel().querySelector('button');
  const toggles = f.panel().querySelectorAll('.icue-ecosystem__toggle');
  assert.equal(f.document.activeElement, toggles[0]);
  toggles[toggles.length - 1].focus();
  assert.equal((await f.key('Tab')).defaultPrevented, true);
  assert.equal(f.document.activeElement, close);
  assert.equal((await f.key('Tab', { shiftKey: true })).defaultPrevented, true);
  assert.equal(f.document.activeElement, toggles[toggles.length - 1]);
  await f.click(close);
  assert.equal(f.panel(), null);
  assert.equal(f.document.body.style.overflow, 'auto');
  assert.equal(f.document.activeElement, f.trigger);
});

test('mobile backdrop dismissal restores focus and a viewport resize updates the menu mode', async t => {
  const f = await fixture(t, implementations[0][1], 'contracts', { width: 390 });
  await f.open();
  await act(async () => f.document.querySelector('.icue-apps__backdrop').dispatchEvent(new f.window.Event('pointerdown', { bubbles: true })));
  await f.flush();
  assert.equal(f.panel(), null);
  assert.equal(f.document.activeElement, f.trigger);
  await f.open();
  f.window.innerWidth = 1280;
  await act(async () => f.window.dispatchEvent(new f.window.Event('resize')));
  assert.equal(f.panel().getAttribute('aria-modal'), null);
  assert.equal(f.document.body.style.overflow, '');
  assert.equal(f.document.querySelector('.icue-apps__backdrop'), null);
  assert.ok(parseFloat(f.panel().style.left) >= 12);
});

test('an outbound click closes the menu without intercepting native link navigation', async t => {
  const f = await fixture(t, implementations[0][1], 'hr');
  await f.open();
  const link = f.panel().querySelector('a');
  const event = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
  await act(async () => link.dispatchEvent(event));
  await f.flush();
  assert.equal(event.defaultPrevented, false);
  assert.equal(f.panel(), null);
  assert.equal(f.document.activeElement, f.trigger);
});

test('app links normalize existing language codes and localize website destinations', async () => {
  const { getAppNavigation } = await sourceModule('shared/app-switcher/appLinks.js');
  for (const code of ['vi', 'vn', 'vi-VN']) assert.equal(getAppNavigation(code).apps[0].href, 'https://vi.icue.vn/');
  assert.equal(getAppNavigation('en-US').apps[0].href, 'https://en.icue.vn/');
  assert.equal(getAppNavigation('jp').apps[0].href, 'https://vi.icue.vn/?lang=ja');
  assert.equal(getAppNavigation('kr').apps[0].href, 'https://vi.icue.vn/?lang=ko');
  assert.equal(getAppNavigation('fr').apps[0].href, 'https://vi.icue.vn/?lang=fr');
  assert.equal(getAppNavigation('th').apps[0].href, 'https://en.icue.vn/');
  assert.equal(getAppNavigation('unknown').trigger, 'ICUE Apps');
  assert.equal(getAppNavigation('unknown').apps[0].href, 'https://vi.icue.vn/');
});

test('staff portal footer links render the two external portals in the same order', async t => {
  const dom = new JSDOM('<!doctype html><html><body><main></main></body></html>');
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  const { default: StaffPortalLinks } = await sourceModule('shared/app-switcher/StaffPortalLinks.jsx', { imports: { 'lucide-react': icons } });
  const root = createRoot(dom.window.document.querySelector('main'));
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    globalThis.window = oldWindow;
    globalThis.document = oldDocument;
  });
  await act(async () => root.render(React.createElement(StaffPortalLinks, { locale: 'en' })));
  const links = [...dom.window.document.querySelectorAll('a')];
  assert.deepEqual(links.map(link => link.href), ['https://hr.icue.vn/', 'https://contract.icue.vn/']);
  for (const link of links) assert.equal(link.target, '_blank');
});

test('all app copies share URL data while the Vietnamese public site uses Card Nav', async () => {
  for (const name of ['appLinks.js']) {
    const canonical = await readFile(new URL(`../../shared/app-switcher/${name}`, import.meta.url), 'utf8');
    for (const [, file] of implementations.slice(1)) {
      const source = await readFile(new URL(`../../${file.replace('AppSwitcher.jsx', name)}`, import.meta.url), 'utf8');
      assert.equal(source, canonical, `${file}: ${name}`);
    }
  }
});

test('Card Nav springs into three app cards, uses the new toggle, and stops its frame loop', async t => {
  const f = await fixture(t, implementations[0][1], 'website');
  assert.equal(f.trigger.querySelectorAll('svg.icue-apps__toggle > circle').length, 3);
  assert.equal(f.trigger.querySelector('svg').getAttribute('aria-hidden'), 'true');
  await f.click(f.trigger, false);
  assert.equal(f.panel().querySelectorAll('.card-nav__card').length, 3);
  assert.equal(f.panel().querySelectorAll('.card-nav__app-icon').length, 3);
  assert.equal(f.panel().querySelector('.card-nav').hasAttribute('data-narrow'), false);
  assert.ok(f.frames.size > 0);
  await f.flush(2);
  const first = Number(f.panel().querySelector('.card-nav__card').style.opacity);
  assert.ok(first > 0 && first < 1, 'cards animate rather than appearing instantly');
  await f.flush();
  assert.equal(f.frames.size, 0);
  assert.equal(f.panel().querySelector('.card-nav__card').style.opacity, '1');
  await f.click(f.panel().querySelector('button'), false);
  assert.ok(f.panel(), 'the panel stays mounted for its closing animation');
  assert.equal(f.panel().getAttribute('inert'), '');
  assert.equal(f.panel().querySelector('a').tabIndex, -1);
  await f.flush();
  assert.equal(f.panel(), null);
  assert.equal(f.frames.size, 0);
});

test('Card Nav reflows at mobile widths and honors live reduced-motion changes', async t => {
  const f = await fixture(t, implementations[0][1], 'website', { width: 390, locale: 'vi' });
  await f.click(f.trigger, false);
  assert.equal(f.panel().querySelector('.card-nav').hasAttribute('data-narrow'), true);
  assert.equal(f.panel().querySelector('button').getAttribute('aria-label'), 'Đóng');
  await act(async () => { f.media.matches = true; f.media.dispatchEvent(new f.window.Event('change')); });
  await f.flush(1);
  assert.equal(f.frames.size, 0);
  assert.equal(f.panel().querySelector('.card-nav__card').style.opacity, '1');
  f.window.innerWidth = 1280;
  await act(async () => f.window.dispatchEvent(new f.window.Event('resize')));
  await f.flush();
  assert.equal(f.panel().querySelector('.card-nav').hasAttribute('data-narrow'), false);
  assert.equal(f.panel().getAttribute('aria-modal'), null);
  await f.click(f.panel().querySelector('button'));
  assert.equal(f.panel(), null);
  assert.equal(f.frames.size, 0);
});

test('the ecosystem cards contain the requested functions and mark each possible current platform', async t => {
  const expected = [
    ['Giới thiệu & đội ngũ', 'Nghiên cứu & dự án', 'Tin tức & hoạt động', 'Khám phá ICUE'],
    ['Hồ sơ nhân sự', 'Chấm công & giờ làm', 'Nghỉ phép & phê duyệt', 'Báo cáo hàng tháng'],
    ['Danh sách hợp đồng', 'Thông tin & hồ sơ', 'Theo dõi trạng thái', 'Tra cứu & quản lý'],
  ];
  for (const currentApp of ['website', 'hr', 'contracts']) await t.test(currentApp, async context => {
    const f = await fixture(context, implementations[0][1], currentApp, { locale: 'vi' });
    await f.open();
    assert.equal(f.panel().querySelector('h2').textContent, 'Khám phá hệ sinh thái ICUE');
    assert.ok(f.panel().querySelector('.card-nav__subtitle').textContent);
    const cards = [...f.panel().querySelectorAll('.card-nav__card')];
    cards.forEach((card, index) => {
      assert.deepEqual([...card.querySelectorAll('.icue-ecosystem__features li')].map(li => li.textContent), expected[index]);
      assert.equal(card.querySelector('.icue-ecosystem__category').textContent, index === 0 ? 'CÔNG KHAI' : 'NỘI BỘ');
      assert.equal(card.querySelector('.icue-ecosystem__features h4').textContent, 'CHỨC NĂNG CHÍNH');
      assert.ok(card.querySelector('.icue-ecosystem__domain').textContent.endsWith('icue.vn'));
    });
    const current = f.panel().querySelector('[aria-current="page"]');
    assert.equal(current.querySelector('h3').textContent, { website: 'Website ICUE', hr: 'Cổng nhân sự', contracts: 'Quản lý hợp đồng' }[currentApp]);
    assert.equal(current.querySelector('.card-nav__current').textContent, 'Bạn đang ở đây');
    assert.equal(current.querySelector('a'), null);
    assert.equal(f.panel().querySelectorAll('.icue-ecosystem__action').length, 2);
  });
});

test('mobile accordions expose one platform at a time and keyboard focus skips hidden actions', async t => {
  const f = await fixture(t, implementations[0][1], 'website', { width: 390, locale: 'vi' });
  await f.open();
  const toggles = [...f.panel().querySelectorAll('.icue-ecosystem__toggle')];
  const details = () => [...f.panel().querySelectorAll('.icue-ecosystem__body')];
  assert.deepEqual(toggles.map(button => button.getAttribute('aria-expanded')), ['true', 'false', 'false']);
  assert.deepEqual(details().map(body => body.hidden), [false, true, true]);
  assert.equal((await f.key('ArrowDown')).defaultPrevented, true);
  assert.equal(f.document.activeElement, toggles[1]);
  await f.click(toggles[1]);
  assert.deepEqual(details().map(body => body.hidden), [true, false, true]);
  assert.equal(toggles[1].getAttribute('aria-controls'), details()[1].id);
  assert.equal(f.panel().querySelector('[aria-current="page"] .card-nav__current').textContent, 'Bạn đang ở đây');
  const hiddenLink = details()[2].querySelector('a');
  assert.equal(hiddenLink.tabIndex, -1);
  await f.key('End');
  assert.equal(f.document.activeElement, toggles[2]);
  await f.key('Tab');
  assert.equal(f.document.activeElement, f.panel().querySelector('.card-nav__menu'));
  await f.key('Tab', { shiftKey: true });
  assert.equal(f.document.activeElement, toggles[2]);
  await f.click(toggles[1]);
  assert.ok(details().every(body => body.hidden));
  toggles[2].focus();
  await f.key('Home');
  assert.equal(f.document.activeElement, toggles[0]);
  await f.key('ArrowUp');
  assert.equal(f.document.activeElement, toggles[2]);
  f.window.innerWidth = 1280;
  await act(async () => f.window.dispatchEvent(new f.window.Event('resize')));
  assert.ok(details().every(body => !body.hidden));
});

test('ecosystem details follow existing locale aliases and keep all destination URLs', async () => {
  const { getEcosystemNavigation } = await sourceModule('shared/app-switcher/ecosystemCopy.js');
  const { getAppNavigation } = await sourceModule('shared/app-switcher/appLinks.js');
  for (const locale of ['vi', 'vn', 'vi-VN', 'en', 'en-US', 'de', 'fr', 'es', 'ja', 'jp', 'ko', 'kr', 'th', 'ru', 'zh', 'unknown']) {
    const copy = getEcosystemNavigation(locale);
    assert.deepEqual(Array.from(copy.apps, app => app.href), Array.from(getAppNavigation(locale).apps, app => app.href));
    for (const app of copy.apps) {
      assert.equal(app.features.length, 4);
      assert.ok(app.category && app.action && app.description);
    }
  }
  assert.equal(getEcosystemNavigation('vn').current, 'Bạn đang ở đây');
  assert.equal(getEcosystemNavigation('unknown').heading, 'Explore the ICUE ecosystem');
});
