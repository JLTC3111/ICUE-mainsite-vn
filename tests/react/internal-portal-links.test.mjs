import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const { createRoot } = require('react-dom/client');
const icons = require('lucide-react');
const { getAppNavigation } = await sourceModule('shared/app-switcher/appLinks.js');

// Exercise this repository's cross-app contract. Neighboring application
// checkouts are independently versioned and must not become implicit fixtures.
async function fixture(t, locale) {
  const dom = new JSDOM('<!doctype html><html><body><main></main></body></html>', { url: 'https://vi.icue.vn/' });
  const previous = new Map();
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document })) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const { default: StaffPortalLinks } = await sourceModule('shared/app-switcher/StaffPortalLinks.jsx', { imports: { 'lucide-react': icons } });
  const root = createRoot(dom.window.document.querySelector('main'));
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  await act(async () => root.render(React.createElement(StaffPortalLinks, { locale })));
  return dom.window.document;
}

for (const locale of ['vi', 'en', 'de', 'fr', 'es', 'ja', 'ko', 'th', 'ru', 'zh']) {
  test(`staff portal links preserve destinations, localization and safe new tabs (${locale})`, async t => {
    const document = await fixture(t, locale);
    const copy = getAppNavigation(locale);
    const links = [...document.querySelectorAll('.icue-footer__portals a')];
    assert.deepEqual(links.map(link => link.href), ['https://hr.icue.vn/', 'https://contract.icue.vn/']);
    assert.equal(document.querySelector('h4').textContent, copy.portals);
    links.forEach((link, index) => {
      assert.equal(link.textContent.trim(), copy.apps[index + 1].label);
      assert.equal(link.target, '_blank');
      assert.equal(link.rel, 'noopener noreferrer');
      assert.equal(link.getAttribute('aria-label'), `${copy.apps[index + 1].label} (${copy.newTab})`);
      assert.equal(link.querySelector('svg').getAttribute('aria-hidden'), 'true');
    });
    assert.equal(document.querySelector('.icue-apps__trigger'), null, 'footer destinations remain direct links');
  });
}
