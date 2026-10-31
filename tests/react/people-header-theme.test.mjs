import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { createPortal } = require('react-dom')
const drawerCss = await fs.readFile(new URL('../../shared/drawer-menu/DrawerMenu.css', import.meta.url), 'utf8')

async function fixture(t, { saved = 'light', initialEnabled = false, systemDark = false, reduced = false, denied = false, query = '' } = {}) {
  const dom = new JSDOM(`<!doctype html><html><head><meta name="theme-color" content="#fff"><style>${drawerCss}</style></head><body><div id="app"></div></body></html>`, {
    url: `https://vi.icue.test/people/experts${query}`, pretendToBeVisual: true,
  })
  const { window } = dom, { document } = window
  const storage = window.localStorage
  storage.setItem('aboutUs_theme', saved)
  storage.setItem('people_bg_video_enabled', String(initialEnabled))
  const blocked = { getItem() { throw new Error('Storage blocked') }, setItem() { throw new Error('Storage blocked') } }
  if (denied) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked') } })
  window.matchMedia = query => Object.assign(new window.EventTarget(), {
    matches: query.includes('prefers-reduced-motion') ? reduced : query.includes('prefers-color-scheme: dark') && systemDark,
  })
  const originals = new Map()
  for (const [name, value] of Object.entries({ window, document })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  const globals = {
    window, document, navigator: window.navigator, localStorage: denied ? blocked : storage,
    performance: window.performance,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  }
  let pathname = '/experts', revision = 0, background
  const { useBackgroundVideo } = await sourceModule('people-app/src/hooks/useBackgroundVideo.js', { globals })
  const { default: PageShell } = await sourceModule('people-app/src/components/PageShell.jsx', {
    globals, env: { BASE_URL: '/people/' },
    imports: {
      'react-dom': { createPortal },
      'react-router-dom': { useLocation: () => ({ pathname }), useNavigate: () => () => {} },
      'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'en', resolvedLanguage: 'en' } }) },
      '@icue/contact-sidebar/DeferredContactSidebar': { default: () => null },
      '../contexts/InteractiveBackgroundContext': { InteractiveBackgroundProvider: ({ children }) => children },
      './InteractiveBackground/InteractiveBackground': { default: ({ enabled }) => React.createElement('div', { 'data-background-enabled': String(enabled) }) },
      './Footer': { default: () => null },
      './ShimmerButton/ShimmerButton': { default: () => null },
      './LanguageSwitcher': { default: () => null },
      '../../../shared/app-switcher/AppSwitcher.jsx': { default: () => null },
      '../hooks/useMainSite': { useMainSite: () => ({
        base: '/', hashLink: page => `/#/${page}`, peopleLink: group => `/people/${group}`, structureLink: () => '/structure/',
      }) },
      '../../../shared/ui/RubberSegment.jsx': {
        toggleSegmentLabels: () => ['Off', 'On'],
        default: props => React.createElement('div', { 'data-segment-role': props.role },
          props.items.map(item => React.createElement('button', {
            key: item.value, type: 'button', 'data-background-option': props.role === 'group' ? item.value : undefined,
            'aria-pressed': props.value === item.value, onClick: () => props.onChange?.(item.value),
          }, item.label)),
        ),
      },
    },
  })
  function Host() {
    background = useBackgroundVideo()
    return React.createElement(PageShell, {
      pageKey: pathname.includes('core') ? 'core' : 'experts',
      showBackgroundToggle: background.canToggle, backgroundEnabled: background.enabled, onBackgroundToggle: background.toggle,
    })
  }
  const root = createRoot(document.getElementById('app'))
  const render = async () => act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Host, { key: revision }))))
  t.after(async () => {
    await act(async () => root.unmount())
    window.close()
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  })
  await render()
  const click = async node => act(async () => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })))
  const assertTheme = expected => {
    assert.equal(document.documentElement.getAttribute('data-icue-page-theme'), expected)
    assert.equal(window.getComputedStyle(document.querySelector('.nav-drawer')).getPropertyValue('--drawer-color-scheme').trim(), expected, 'the body-portalled drawer follows the same background-selected theme')
    assert.equal(document.querySelector('.home-video-toggle--theme'), null, 'People uses its existing Background control, with no second theme selector')
  }
  return { window, document, storage, click, assertTheme, background: () => background,
    async choose(value) { await click(document.querySelector(`[data-background-option="${value}"]`)) },
    async openDrawer() { await click(document.querySelector('.nav-drawer__toggle')) },
    async nextRoute() {
      pathname = pathname === '/experts' ? '/core-team' : '/experts'
      window.history.replaceState({}, '', `/people${pathname}${window.location.search}`)
      revision++
      await render()
    },
  }
}

test('People Background Off selects light and On selects dark, overriding saved and system palettes while the drawer stays open', async t => {
  const f = await fixture(t, { saved: 'dark', initialEnabled: false, systemDark: true })
  f.assertTheme('light')
  await f.openDrawer()
  assert.equal(f.document.querySelector('.nav-drawer').classList.contains('is-open'), true)
  await f.choose('on')
  assert.equal(f.background().enabled, true)
  f.assertTheme('dark')
  assert.equal(f.storage.getItem('people_bg_video_enabled'), 'true')
  await f.choose('off')
  assert.equal(f.background().enabled, false)
  f.assertTheme('light')
  assert.equal(f.storage.getItem('aboutUs_theme'), 'light')
  assert.equal(f.document.querySelector('.nav-drawer').classList.contains('is-open'), true, 'switching the palette does not close the drawer')
})

test('People Background On overrides a saved light palette and retains its choice across profile-group routes', async t => {
  const f = await fixture(t, { saved: 'light', initialEnabled: true })
  f.assertTheme('dark')
  await f.choose('off')
  f.assertTheme('light')
  await f.nextRoute()
  assert.equal(f.background().enabled, false)
  f.assertTheme('light')
  await f.choose('on')
  await f.nextRoute()
  assert.equal(f.background().enabled, true)
  f.assertTheme('dark')
})

test('People background choices update incoming theme links and survive blocked storage on profile-group navigation', async t => {
  const f = await fixture(t, { saved: 'dark', initialEnabled: true, denied: true, query: '?theme=light' })
  f.assertTheme('light')
  await f.choose('on')
  f.assertTheme('dark')
  assert.equal(new URL(f.window.location.href).searchParams.get('theme'), 'dark')
  await f.nextRoute()
  assert.equal(f.background().enabled, true)
  f.assertTheme('dark')
  await f.choose('off')
  assert.equal(new URL(f.window.location.href).searchParams.get('theme'), 'light')
  await f.nextRoute()
  assert.equal(f.background().enabled, false)
  f.assertTheme('light')
})

test('People uses light when reduced motion makes its background unavailable, without adding another selector', async t => {
  const f = await fixture(t, { saved: 'dark', initialEnabled: true, systemDark: true, reduced: true })
  assert.equal(f.document.querySelector('[data-background-option]'), null)
  f.assertTheme('light')
})
