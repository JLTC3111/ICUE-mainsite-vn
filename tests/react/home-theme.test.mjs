import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { React, act, create, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const icons = require('lucide-react')
const THEME = 'icue_home_theme'
const BEAMS = 'icue_home_beams'

async function fixture(t, { saved, denied = false, reduced = false } = {}) {
  silenceRenderer(t)
  const dom = new JSDOM('<html><head><meta name="theme-color" content="#123456"></head><body></body></html>', { url: 'https://icue.test/' })
  const { window } = dom, { document } = window
  const storage = new Map(saved ? [[THEME, saved]] : [])
  Object.defineProperty(window, 'localStorage', { get() {
    if (denied) throw new Error('Storage blocked')
    return { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  } })
  const media = Object.assign(new window.EventTarget(), { matches: reduced })
  window.matchMedia = () => media
  const globals = { window, document }
  const preference = await sourceModule('home-app/src/hooks/useHomeTheme.js', { globals })
  const beamsPreference = await sourceModule('home-app/src/hooks/useHomeBeamsEnabled.js', { globals })
  const imports = {
    'lucide-react': icons,
    'react-dom': { flushSync: callback => callback() },
    'react-i18next': { useTranslation: () => ({ i18n: { resolvedLanguage: 'en' } }) },
    '../hooks/useHomeTheme.js': { ...preference },
    '../hooks/useHomeBeamsEnabled.js': { ...beamsPreference },
  }
  const { default: Toggle } = await sourceModule('home-app/src/components/HomeThemeToggle.jsx', { globals, imports })
  const { default: Beams } = await sourceModule('home-app/src/components/HomeBeamsToggle.jsx', { globals, imports })
  function Page() {
    preference.useHomeTheme({ applyToDocument: true })
    return React.createElement(React.Fragment, null, React.createElement(Toggle), React.createElement(Beams))
  }
  let renderer, mounted = false
  const mount = async () => { await act(async () => {
    renderer = create(React.createElement(React.StrictMode, null, React.createElement(Page)), { createNodeMock: () => ({
      getBoundingClientRect: () => ({ left: 20, top: 8, width: 44, height: 44 }),
    }) })
    mounted = true
  }) }
  const destroy = async () => { if (mounted) { mounted = false; await unmount(renderer) } }
  t.after(async () => { await destroy(); window.close() })
  await mount()
  const themeButton = () => renderer.root.findAllByType('button').find(node => node.props.className.includes('home-theme-toggle'))
  const cpuButton = () => renderer.root.findByProps({ className: 'home-beams-toggle' })
  return {
    window, document, storage, preference, themeButton, cpuButton, destroy,
    get renderer() { return renderer },
    async themeClick() { await act(async () => themeButton().props.onClick()) },
    async cpuClick() { await act(async () => cpuButton().props.onClick()) },
    async remount() { await destroy(); await mount() },
    async crossTab(value, key = THEME) {
      if (value == null) storage.delete(THEME)
      else storage.set(THEME, value)
      await act(async () => window.dispatchEvent(new window.StorageEvent('storage', { key })))
    },
    async reduce(value) { media.matches = value; await act(async () => media.dispatchEvent(new window.Event('change'))) },
  }
}


test('switching video off leaves the hero effect uncovered and preserves its title and actions', async t => {
  silenceRenderer(t)
  let enabled = true
  const { default: HomeHero } = await sourceModule('home-app/src/components/HomeHero.jsx', {
    imports: {
      '../hooks/useRainText': { useRainText() {} },
      '../hooks/useHomeBackgroundVideoEnabled': { useHomeBackgroundVideoEnabled: () => enabled },
      './HeroVideoTitle': { default: ({ text }) => React.createElement('h1', null, text) },
      './magicui/RainbowButton': { default: 'a' },
      './magicui/WarpBackground': { default: ({ className }) => React.createElement('div', { className }) },
      './HomeHeroGridScan': { default: () => React.createElement('div', { className: 'home-hero__grid-scan' }) },
    },
  })
  const hero = {
    ariaLabel: 'Home', title: 'Institute', subtitle: 'Research and community',
    bannerHref: '/news', bannerLabel: 'Latest news',
    actions: [{ label: 'Contact', variant: 'primary', href: '/contact' }, { label: 'Projects', variant: 'ghost', href: '/our-work' }],
  }
  const render = () => React.createElement(React.StrictMode, null, React.createElement(HomeHero, { hero, effectsEnabled: true }))
  let renderer
  await act(async () => { renderer = create(render()) })
  for (const next of [true, false, true, false]) {
    enabled = next
    await act(async () => renderer.update(render()))
    const media = renderer.root.findByProps({ className: 'home-hero__media' })
    assert.equal(media.findAllByProps({ className: 'home-hero__overlay' }).length, enabled ? 1 : 0,
      'The video shade must leave the DOM when the effect is active')
    assert.equal(renderer.root.findByType('h1').children.join(''), hero.title)
    assert.deepEqual(renderer.root.findAllByType('a').slice(-2).map(link => link.props.href), ['/contact', '/our-work'])
    if (!enabled) assert.ok(media.findAll(node => ['home-hero__warp', 'home-hero__grid-scan'].includes(node.props.className)).length > 0)
  }
  await unmount(renderer)
})

test('Home defaults to light with effects off, keeps both controls independent, and remembers an explicit dark choice', async t => {
  const f = await fixture(t)
  const root = f.document.documentElement
  assert.equal(root.getAttribute('data-icue-home-theme'), 'light')
  assert.equal(f.cpuButton().props['aria-pressed'], false)
  assert.equal(f.themeButton().props['aria-label'], 'Switch to dark mode')
  await f.themeClick()
  assert.equal(root.getAttribute('data-icue-home-theme'), 'dark')
  assert.equal(root.getAttribute('data-icue-page-theme'), 'dark')
  assert.equal(f.document.querySelector('meta').content, '#0c0f14')
  assert.equal(f.storage.get(THEME), 'dark')
  assert.equal(f.cpuButton().props['aria-pressed'], false)
  await f.cpuClick()
  assert.equal(f.storage.get(BEAMS), 'on')
  assert.equal(f.cpuButton().props['aria-pressed'], true)
  assert.equal(root.getAttribute('data-icue-home-theme'), 'dark')
  await f.remount()
  assert.equal(f.themeButton().props['aria-pressed'], true)
  assert.equal(f.cpuButton().props['aria-pressed'], true)
  const fresh = await sourceModule('home-app/src/hooks/useHomeTheme.js', { globals: { window: f.window } })
  assert.equal(fresh.readHomeTheme(), 'dark')
})

test('blocked storage leaves theme changes usable and Home cleans its palette up on route exit', async t => {
  const f = await fixture(t, { denied: true })
  assert.equal(f.document.documentElement.getAttribute('data-icue-home-theme'), 'light')
  await f.themeClick()
  assert.equal(f.document.documentElement.getAttribute('data-icue-home-theme'), 'dark')
  await f.remount()
  assert.equal(f.themeButton().props['aria-pressed'], true)
  await f.destroy()
  assert.equal(f.document.documentElement.hasAttribute('data-icue-home-theme'), false)
  assert.equal(f.document.documentElement.hasAttribute('data-icue-page-theme'), false)
  assert.equal(f.document.documentElement.hasAttribute('data-icue-theme-page'), false)
  assert.equal(f.document.querySelector('meta').content, '#123456')
})

test('cross-tab changes update both moon/sun states; leaving Home preserves a new page owner', async t => {
  const f = await fixture(t, { saved: 'light' })
  await f.crossTab('dark')
  assert.equal(f.themeButton().props['aria-pressed'], true)
  await f.crossTab('light')
  assert.equal(f.themeButton().props['aria-pressed'], false)
  await f.crossTab(null, null)
  assert.equal(f.themeButton().props['aria-pressed'], false)
  const root = f.document.documentElement
  root.setAttribute('data-icue-theme-page', 'archive')
  root.setAttribute('data-icue-page-theme', 'light')
  f.document.querySelector('meta').content = '#abcdef'
  await f.destroy()
  assert.equal(root.getAttribute('data-icue-theme-page'), 'archive')
  assert.equal(root.getAttribute('data-icue-page-theme'), 'light')
  assert.equal(root.hasAttribute('data-icue-home-theme'), false)
  assert.equal(f.document.querySelector('meta').content, '#abcdef')
})

test('both theme directions use the same transition duration and reduced motion skips the wipe', async t => {
  const f = await fixture(t)
  const animations = []
  let transitions = 0
  f.document.documentElement.animate = (frames, options) => { animations.push({ frames, options }) }
  f.document.startViewTransition = update => {
    transitions++
    update()
    return { ready: Promise.resolve(), finished: Promise.resolve() }
  }
  await f.themeClick()
  await f.themeClick()
  assert.equal(transitions, 2)
  assert.equal(animations.length, 2)
  assert.equal(animations[0].options.duration, 450)
  assert.equal(animations[1].options.duration, 450)
  assert.equal(f.themeButton().props['aria-pressed'], false)
  assert.equal(f.document.documentElement.dataset.icueViewToggleVt, undefined)
  await f.reduce(true)
  await f.themeClick()
  assert.equal(transitions, 2)
  assert.equal(f.themeButton().props['aria-pressed'], true)
})
