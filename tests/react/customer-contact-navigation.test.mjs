import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, create, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'

const { JSDOM } = createRequire(import.meta.url)('jsdom')
const locales = ['vi', 'en', 'de', 'fr', 'ja', 'ko']

test('shared navigation routes Contact to the authenticated workspace in every language and both navigation modes', async t => {
  silenceRenderer(t)
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://vi.icue.vn/contact#/Contact' })
  t.after(() => dom.window.close())
  const { window } = dom
  window.matchMedia = () => Object.assign(new EventTarget(), { matches: false })
  let header, drawer
  const { default: Nav } = await sourceModule('shared/main-site-nav/MainSiteNav.jsx', {
    globals: { window, document: window.document },
    imports: {
      '@icue/drawer-menu/DrawerMenuPanel.jsx': { default: props => { drawer = props; return null } },
      './bridge': { registerMainSiteNavBridge: () => () => {} },
      './MainSiteHeader': { default: props => { header = props; return null } },
    },
  })
  let renderer
  t.after(async () => { if (renderer) await unmount(renderer) })
  for (const variant of ['hash', 'standalone']) {
    for (const locale of locales) {
      const props = { variant, locale, contactHref: '/about-us' }
      await act(async () => {
        if (renderer) renderer.update(React.createElement(Nav, props))
        else renderer = create(React.createElement(Nav, props))
      })
      const expected = `/newsroom/chatrooms?lang=${locale}`
      assert.equal(drawer.links.find(link => link.page === 'Contact').href, expected)
      assert.equal(header.pillItems.find(link => link.page === 'Contact').href, expected)
      assert.equal(drawer.links.find(link => link.page === 'Contact').isCurrent, false)
      assert.equal(header.contactHref, `/about-us?lang=${locale}`, 'The introduction wordmark keeps its About Us destination')
    }
  }
})

test('Contact performs native navigation even when the current page is the old contact page', async () => {
  const calls = []
  const module = await sourceModule('shared/main-site-nav/buildDrawerNav.js', {
    globals: { window: { location: { origin: 'https://vi.icue.vn', hash: '#/Contact', assign: href => calls.push(href) } } },
  })
  for (const links of [module.DRAWER_LINKS, module.STANDALONE_DRAWER_LINKS]) {
    const { navLinks } = module.buildMainSiteDrawerNav({ activePage: 'Contact', links, onClose: () => calls.push('closed') })
    const contact = navLinks.find(link => link.page === 'Contact')
    assert.equal(contact.isCurrent, false)
    contact.onClick({ preventDefault: () => calls.push('prevented') })
    assert.deepEqual(calls.splice(0), ['prevented', 'closed', '/newsroom/chatrooms?lang=vi'])
  }
})

test('footer collaboration links preserve locale and hand English-host visitors to the customer host', async () => {
  for (const origin of ['https://vi.icue.vn', 'https://en.icue.vn']) {
    const { getFooterLinks } = await sourceModule('shared/site-footer/footerLinks.js', { globals: { window: { location: { origin } } } })
    for (const locale of locales) {
      for (const mode of ['hash', 'standalone']) {
        const links = getFooterLinks(mode, locale)
        const prefix = origin === 'https://en.icue.vn' ? 'https://vi.icue.vn' : ''
        assert.equal(links.contact, `${prefix}/newsroom/chatrooms?lang=${locale}`)
        assert.equal(links.recruitment, `/recruitment?lang=${locale}`)
        assert.equal(links.privacy, `/legal/privacy?lang=${locale}`)
      }
    }
  }
})
