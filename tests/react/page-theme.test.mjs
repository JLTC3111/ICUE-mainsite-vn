import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import {
  React, act, create, platform, silenceRenderer, sourceModule, unmount,
} from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const postcss = require('postcss')
const KEY = 'aboutUs_theme'

async function fixture(t, { saved, dark = false, denied = false, enabled = true } = {}) {
  silenceRenderer(t)
  const dom = new JSDOM('<!doctype html><html><head><meta name="theme-color" content="#ffffff"></head><body></body></html>')
  t.after(() => dom.window.close())
  const f = platform()
  const document = dom.window.document
  const storage = new Map(saved ? [[KEY, saved]] : [])
  const media = Object.assign(new EventTarget(), { matches: dark })
  f.window.matchMedia = () => media
  const { default: usePageTheme } = await sourceModule('shared/ui/usePageTheme.js', {
    globals: {
      ...f, document,
      localStorage: {
        getItem(key) { if (denied) throw new Error('Storage unavailable'); return storage.get(key) ?? null },
        setItem(key, value) { if (denied) throw new Error('Storage unavailable'); storage.set(key, value) },
      },
    },
  })
  let current
  function Probe({ enabled }) {
    current = usePageTheme('faq', { enabled })
    return null
  }
  let renderer
  await act(async () => {
    renderer = create(React.createElement(React.StrictMode, null, React.createElement(Probe, { enabled })))
  })
  return {
    document, storage, renderer, window: f.window,
    current: () => current,
    async update(enabled) {
      await act(async () => renderer.update(React.createElement(React.StrictMode, null, React.createElement(Probe, { enabled }))))
    },
    async system(dark) {
      media.matches = dark
      const event = new Event('change')
      event.matches = dark
      await act(async () => media.dispatchEvent(event))
    },
    async storageEvent(value) {
      if (value == null) storage.delete(KEY)
      else storage.set(KEY, value)
      const event = new Event('storage')
      event.key = KEY
      await act(async () => f.window.dispatchEvent(event))
    },
  }
}

test('a saved theme beats the OS, switches persist, and route cleanup restores document state', async t => {
  const f = await fixture(t, { saved: 'light', dark: true })
  assert.equal(f.current().isDark, false)
  assert.equal(f.document.documentElement.getAttribute('data-icue-page-theme'), 'light')
  await act(async () => f.current().setDark(true))
  assert.equal(f.storage.get(KEY), 'dark')
  assert.equal(f.document.documentElement.getAttribute('data-icue-page-theme'), 'dark')
  assert.equal(f.document.querySelector('meta[name="theme-color"]').content, '#0b0f14')
  await f.system(false)
  assert.equal(f.current().isDark, true)
  await unmount(f.renderer)
  assert.equal(f.document.documentElement.hasAttribute('data-icue-page-theme'), false)
  assert.equal(f.document.documentElement.hasAttribute('data-icue-theme-page'), false)
  assert.equal(f.document.querySelector('meta[name="theme-color"]').content, '#ffffff')
})

test('the OS is followed until a manual selection, including when storage is blocked', async t => {
  const f = await fixture(t, { denied: true })
  await f.system(true)
  assert.equal(f.current().isDark, true)
  await act(async () => f.current().setDark(false))
  await f.system(true)
  assert.equal(f.current().isDark, false, 'Storage failure must not discard the visitor’s manual choice')
  await unmount(f.renderer)
})

test('cross-tab preference changes apply and clearing the preference resumes the OS', async t => {
  const f = await fixture(t, { dark: true })
  await f.storageEvent('light')
  assert.equal(f.current().isDark, false)
  await f.storageEvent(null)
  assert.equal(f.current().isDark, true)
  await unmount(f.renderer)
})

test('inactive routes stay untouched and returning to a themed page reads choices made on another page', async t => {
  const f = await fixture(t, { enabled: false })
  assert.equal(f.document.documentElement.hasAttribute('data-icue-page-theme'), false)
  f.storage.set(KEY, 'dark')
  await f.update(true)
  assert.equal(f.current().isDark, true)
  assert.equal(f.document.documentElement.getAttribute('data-icue-page-theme'), 'dark')
  await f.update(false)
  assert.equal(f.document.documentElement.hasAttribute('data-icue-page-theme'), false)
  f.storage.set(KEY, 'light')
  await f.update(true)
  assert.equal(f.current().isDark, false)
  await unmount(f.renderer)
})

test('the shared nav shows the theme switch only when a page explicitly supplies a controller', async t => {
  silenceRenderer(t)
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://icue.test/faqs' })
  t.after(() => dom.window.close())
  const { window } = dom
  window.matchMedia = () => Object.assign(new EventTarget(), { matches: false })
  let header
  const { default: Nav } = await sourceModule('shared/main-site-nav/MainSiteNav.jsx', {
    globals: { window, document: window.document },
    imports: {
      '@icue/drawer-menu/DrawerMenuPanel.jsx': { default: () => null },
      './bridge': { registerMainSiteNavBridge: () => () => {} },
      './MainSiteHeader': { default: props => { header = props; return null } },
    },
  })
  let renderer
  const calls = []
  const pageTheme = { isDark: true, setDark: value => calls.push(value) }
  await act(async () => { renderer = create(React.createElement(Nav, { variant: 'standalone', locale: 'en', pageTheme })) })
  assert.equal(header.showAboutUsVideoToggle, true)
  assert.equal(header.aboutUsControl, 'theme')
  assert.equal(header.aboutUsThemeDark, true)
  assert.equal(header.labels.aria.aboutUsTheme, 'Switch between light and dark')
  header.onAboutUsThemeToggle(false)
  assert.deepEqual(calls, [false])
  await act(async () => renderer.update(React.createElement(Nav, { variant: 'standalone', locale: 'en' })))
  assert.equal(header.showAboutUsVideoToggle, false, 'Other apps do not gain a control implicitly')
  await unmount(renderer)
})

function luminance(hex) {
  const value = hex.slice(1)
  const channels = [0, 2, 4].map(index => {
    const channel = parseInt(value.slice(index, index + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function assertContrast(foreground, background, label) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  const ratio = (values[0] + 0.05) / (values[1] + 0.05)
  assert.ok(ratio >= 4.5, `${label}: ${foreground} on ${background}: ${ratio.toFixed(2)}:1`)
}

test('all new dark palettes provide readable text, links, and action labels', async () => {
  const specs = [
    ['faq-app/src/styles/theme.css', 'fq', ['ground', 'surface', 'surface-2', 'tint', 'tint-strong']],
    ['recruitment-app/src/styles/theme.css', 'rc', ['ground', 'surface', 'surface-2', 'tint', 'tint-strong']],
    ['community-app/src/styles/theme.css', 'cm', ['ground', 'surface', 'surface-2', 'tint', 'tint-strong']],
    ['contact-app/src/styles/theme.css', 'ct', ['paper', 'paper-raised', 'field', 'field-focus']],
    ['legal-app/src/dark-mode.css', 'legal', ['ground', 'surface', 'raised']],
    ['structure-app/src/styles/dark-mode.css', 'icue', ['surface', 'surface-2']],
    ['people-app/src/styles/theme.css', 'icue', ['surface', 'surface-2']],
  ]
  for (const [file, prefix, surfaces] of specs) {
    const tokens = {}
    const css = postcss.parse(await fs.readFile(new URL(`../../${file}`, import.meta.url), 'utf8'))
    css.walkRules(rule => {
      if (!rule.selector.startsWith(':root[data-icue-page-theme=')) return
      rule.walkDecls(/^--/, decl => { tokens[decl.prop] = decl.value })
    })
    const get = name => tokens[`--${prefix}-${name}`]
    const textNames = prefix === 'icue' ? ['text', 'text-soft', 'text-faint']
      : prefix === 'legal' ? ['ink', 'body', 'muted'] : ['ink', 'ink-2', 'ink-3']
    for (const surface of surfaces) {
      for (const textName of textNames) assertContrast(get(textName), get(surface), `${prefix}: ${textName}/${surface}`)
    }
    const accent = get('accent')
    if (accent) for (const surface of surfaces.slice(0, 3)) assertContrast(accent, get(surface), `${prefix}: link/${surface}`)
    if (['fq', 'rc', 'cm'].includes(prefix)) {
      assertContrast(get('on-accent'), get('accent'), `${prefix}: action`)
      assertContrast(get('on-accent'), get('accent-hover'), `${prefix}: action hover`)
    }
    if (prefix === 'ct') {
      for (const fill of ['accent-fill', 'accent-fill-hover', 'accent-quiet']) assertContrast('#ffffff', get(fill), `contact: ${fill}`)
      assertContrast(get('danger'), get('paper'), 'contact: validation')
    }
  }
  const { themeLegalDocument } = await sourceModule('legal-app/src/legal/theme.js')
  for (const slug of ['privacy', 'terms', 'gdpr', 'cookies']) {
    const palette = themeLegalDocument({ slug }, true)
    assertContrast(palette.accent, palette.accentSoft, `legal ${slug}: accent text`)
    assertContrast('#111827', palette.accent, `legal ${slug}: action label`)
  }
})

test('People navigation follows the page palette independently of the background toggle', async t => {
  silenceRenderer(t)
  let isDark = true
  let header
  const Empty = () => null
  const { default: PageShell } = await sourceModule('people-app/src/components/PageShell.jsx', {
    imports: {
      'react-router-dom': { NavLink: Empty, useLocation: () => ({ pathname: '/experts' }) },
      'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'en' } }) },
      '@icue/contact-sidebar/DeferredContactSidebar': { default: Empty },
      '../../../shared/ui/usePageTheme.js': { default: () => ({ isDark }) },
      './Header': { default: props => { header = props; return null } },
      './Footer': { default: Empty },
      './InteractiveBackground/InteractiveBackground': { default: Empty },
      './ShimmerButton/ShimmerButton': { default: Empty },
    },
  })
  let renderer
  const render = async backgroundEnabled => {
    const element = React.createElement(PageShell, { pageKey: 'experts', showBackgroundToggle: true, backgroundEnabled })
    await act(async () => {
      if (renderer) renderer.update(element)
      else renderer = create(element)
    })
  }
  t.after(async () => { if (renderer) await unmount(renderer) })
  await render(false)
  assert.equal(header.appearance, 'dark', 'background off retains the saved dark palette')
  isDark = false
  await render(false)
  assert.equal(header.appearance, 'light')
  await render(true)
  assert.equal(header.appearance, 'dark', 'the galaxy keeps its dark navigation surface')
  await render(false)
  assert.equal(header.appearance, 'light', 'turning the background off restores the page palette')
})
