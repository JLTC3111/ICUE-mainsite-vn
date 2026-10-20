import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { transformWithEsbuild } from 'vite';
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const { createRoot } = require('react-dom/client');
const icons = require('lucide-react');
const { getAppNavigation } = await sourceModule('shared/app-switcher/appLinks.js');
const desktop = new URL('../../../', import.meta.url);
const hrFile = new URL('hr_software/src/components/sidebar.jsx', desktop);
const contractFile = new URL('ICUE_company_software/contract-management-app-v2.1/src/components/layout/Sidebar.jsx', desktop);
const t = (key, fallback) => fallback || key;

async function fixture(context, file, imports, props = {}) {
  const dom = new JSDOM('<!doctype html><html><body><main></main></body></html>', { pretendToBeVisual: true, url: 'https://icue.test/' });
  const previous = new Map();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  Object.defineProperty(dom.window, 'innerWidth', { value: 1280, configurable: true });
  const module = { exports: {} };
  const source = await readFile(file, 'utf8');
  const { code } = await transformWithEsbuild(source, file.pathname, { loader: 'jsx', format: 'cjs', jsx: 'transform' });
  vm.runInNewContext(code, {
    React, module, exports: module.exports,
    window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, console,
    require(specifier) {
      if (specifier === 'react') return React;
      if (specifier === 'lucide-react') return icons;
      if (specifier.endsWith('.css')) return {};
      if (specifier in imports) return imports[specifier];
      throw new Error('Unexpected import: ' + specifier);
    },
  });
  const root = createRoot(dom.window.document.querySelector('main'));
  context.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  await act(async () => root.render(React.createElement(module.exports.default, props)));
  return {
    document: dom.window.document,
    async click(node) { await act(async () => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); },
  };
}

function assertLinks(document, expected) {
  const links = [...document.querySelectorAll('a[target="_blank"]')];
  assert.deepEqual(links.map(link => link.href), expected);
  for (const link of links) {
    assert.equal(link.rel, 'noopener noreferrer');
    assert.ok(link.getAttribute('aria-label'));
  }
  assert.equal(document.querySelector('.icue-apps__trigger'), null);
}

test('HR cross-app links live in its existing sidebar, including the collapsed rail', { skip: !existsSync(hrFile) }, async context => {
  const industry = await import(new URL('hr_software/src/theme/industry.js', desktop));
  const f = await fixture(context, hrFile, {
    'react-router-dom': { NavLink: ({ to, style, children, end: _end, ...props }) => React.createElement('a', { ...props, href: to, style: typeof style === 'function' ? style({ isActive: false }) : style }, typeof children === 'function' ? children({ isActive: false }) : children) },
    '../contexts/ThemeContext.jsx': { useTheme: () => ({ isDarkMode: false }) },
    '../contexts/LanguageContext.jsx': { useLanguage: () => ({ t, currentLanguage: 'en' }) },
    '../contexts/NotificationContext.jsx': { useNotifications: () => ({ unreadCount: 0 }) },
    '../contexts/AuthContext.jsx': { useAuth: () => ({ user: { id: 'fixture' } }) },
    '../utils/translationAccess.js': { isTranslationEditor: () => false },
    '../utils/translationQueueStatus.js': { subscribeTranslationQueue: () => () => {}, getTranslationQueueCount: () => 0 },
    '../theme/industry.js': industry,
    './app-switcher/appLinks.js': { getAppNavigation },
  }, { isMobileMenuOpen: true, setIsMobileMenuOpen() {} });
  const expected = ['https://en.icue.vn/', 'https://contract.icue.vn/'];
  assertLinks(f.document, expected);
  await f.click(f.document.querySelector('[aria-label="Collapse sidebar"]'));
  assertLinks(f.document, expected);
});

test('Contract cross-app links are direct sidebar rows that survive collapse', { skip: !existsSync(contractFile) }, async context => {
  const empty = { __esModule: true, default: () => null };
  const f = await fixture(context, contractFile, {
    'react-router-dom': { useLocation: () => ({ pathname: '/' }), useNavigate: () => () => {} },
    'react-i18next': { useTranslation: () => ({ t, i18n: { language: 'en', resolvedLanguage: 'en' } }) },
    '../../hooks/useUser': { useUser: () => ({ user: { id: 'fixture' }, isDemoMode: false }) },
    '../app-switcher/appLinks.js': { getAppNavigation },
    'react-hot-toast': { __esModule: true, default: { success() {}, error() {} } },
    '../../utils/supaBaseClient': { supabase: {} },
    '../../utils/permissions': { canEditContracts: () => false },
    '../../pages/ContractRecord': { LAST_RECORD_KEY: 'fixture-last-record' },
    './RssPulse': empty, './PasswordChangeModal': empty, './SidebarMobile': empty, '../FeedbackDialog': empty,
  });
  const expected = ['https://en.icue.vn/', 'https://hr.icue.vn/'];
  assertLinks(f.document, expected);
  assert.equal(f.document.querySelector('.rail__portals').querySelectorAll('a').length, 2);
  await f.click(f.document.querySelector('.rail__toggle'));
  assertLinks(f.document, expected);
});

test('both authentication pages and the HR header exclude the cross-app popup', async () => {
  const files = [
    'hr_software/src/components/login.jsx',
    'hr_software/src/components/header.jsx',
    'ICUE_company_software/contract-management-app-v2.1/src/pages/Login.jsx',
  ].map(file => new URL(file, desktop)).filter(file => existsSync(file));
  for (const file of files) assert.doesNotMatch(await readFile(file, 'utf8'), /AppSwitcher|icue-apps__trigger/, file.pathname);
});
