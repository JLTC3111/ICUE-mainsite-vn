import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceModule, platform } from './testHarness.js'

async function boot(t, href = 'https://icue.test/notable-awards?lang=en&test=1#certifications', modules = []) {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const f = platform()
  const nodes = []
  const maps = []
  f.document.head = { append: node => maps.push(node) }
  f.document.body.append = node => nodes.push(node)
  f.document.createElement = tagName => Object.assign(new EventTarget(), {
    tagName, style: {}, children: [], setAttribute() {},
    append(...children) { this.children.push(...children) },
    remove() { nodes.splice(nodes.indexOf(this), 1) },
  })
  const navigations = []
  f.window.location = { href, search: new URL(href).search, replace: url => navigations.push(url), reload() {} }
  const history = []
  f.window.history = { state: { key: 'restored' }, replaceState: (...args) => history.push(args) }
  const mod = await sourceModule('shared/resilience/bootRecovery.js', { globals: f })
  mod.installBootRecovery(modules)
  const resourceEvent = (type, target) => {
    const event = new Event(type)
    Object.defineProperty(event, 'target', { value: target })
    f.window.dispatchEvent(event)
  }
  return { ...f, navigations, nodes, maps, history, resourceEvent, fail: () => resourceEvent('error', { tagName: 'SCRIPT', type: 'module' }) }
}

test('a failed entry recovers before React, preserving the restored URL', async t => {
  const f = await boot(t)
  f.fail()
  assert.equal(f.nodes.length, 1)
  t.mock.timers.tick(1500)
  assert.equal(f.navigations.length, 1)
  const url = new URL(f.navigations[0])
  assert.equal(url.pathname, '/notable-awards')
  assert.equal(url.searchParams.get('lang'), 'en')
  assert.equal(url.searchParams.get('test'), '1')
  assert.equal(url.hash, '#certifications')
  assert.equal(url.searchParams.get('__icue_boot_retry'), '1')
})

test('recovery remaps module URLs consistently to bypass WebKit failed-import caching', async t => {
  const f = await boot(t, 'https://icue.test/notable-awards?__icue_boot_retry=1', ['/assets/Awards.js', '/assets/react.js'])
  assert.equal(f.maps[0].type, 'importmap')
  assert.deepEqual(JSON.parse(f.maps[0].textContent).imports, {
    'https://icue.test/assets/Awards.js': 'https://icue.test/assets/Awards.js?__icue_module_retry=1',
    'https://icue.test/assets/react.js': 'https://icue.test/assets/react.js?__icue_module_retry=1',
  })
})

test('offline or hidden startup waits until visible and reconnected', async t => {
  const f = await boot(t)
  f.navigator.onLine = false
  f.fail()
  t.mock.timers.tick(1500)
  assert.equal(f.navigations.length, 0)
  f.document.hidden = true
  f.navigator.onLine = true
  f.window.dispatchEvent(new Event('online'))
  t.mock.timers.tick(1500)
  assert.equal(f.navigations.length, 0)
  f.document.hidden = false
  f.document.dispatchEvent(new Event('visibilitychange'))
  t.mock.timers.tick(1500)
  assert.equal(f.navigations.length, 1)
})

test('automatic document reloads are bounded without relying on storage', async t => {
  const f = await boot(t, 'https://icue.test/faqs?lang=ja&__icue_boot_retry=2')
  f.fail()
  t.mock.timers.tick(25_000)
  f.window.dispatchEvent(new Event('online'))
  t.mock.timers.tick(1500)
  assert.equal(f.navigations.length, 0)
  assert.equal(f.nodes[0].children[1].tagName, 'button')
})

test('successful startup cancels reload and clears only its internal URL marker', async t => {
  const f = await boot(t, 'https://icue.test/recruitment?lang=fr&__icue_boot_retry=1#open-positions')
  f.fail()
  f.window.dispatchEvent(new Event('icue:app-ready'))
  t.mock.timers.tick(25_000)
  assert.equal(f.navigations.length, 0)
  assert.equal(f.nodes.length, 0)
  assert.equal(f.history[0][0].key, 'restored')
  assert.equal(f.history[0][2], 'https://icue.test/recruitment?lang=fr#open-positions')
})

test('stalled bootstrap has a deadline; a ready page is never reloaded on resume', async t => {
  const f = await boot(t)
  t.mock.timers.tick(20_000)
  assert.equal(f.nodes.length, 1)
  f.window.dispatchEvent(new Event('icue:app-ready'))
  f.window.dispatchEvent(new Event('online'))
  t.mock.timers.tick(1500)
  assert.equal(f.navigations.length, 0)
})

test('a pending route keeps the reload budget until its module really loads', async t => {
  const f = await boot(t, 'https://icue.test/notable-awards?lang=en&__icue_boot_retry=1')
  f.window.dispatchEvent(Object.assign(new Event('icue:route-loading'), { detail: 'awards' }))
  f.window.dispatchEvent(new Event('icue:app-ready'))
  assert.equal(f.history.length, 0)
  f.window.dispatchEvent(new Event('icue:route-error'))
  t.mock.timers.tick(1500)
  assert.equal(new URL(f.navigations[0]).searchParams.get('__icue_boot_retry'), '2')
  f.window.dispatchEvent(Object.assign(new Event('icue:route-ready'), { detail: 'awards' }))
  assert.equal(f.history[0][2], 'https://icue.test/notable-awards?lang=en')
})

test('styles retry in place without reloading ready content and stop after two attempts', async t => {
  const f = await boot(t)
  const link = Object.assign(new EventTarget(), { tagName: 'LINK', rel: 'stylesheet', href: 'https://icue.test/assets/index.css' })
  f.window.dispatchEvent(new Event('icue:app-ready'))
  f.resourceEvent('error', link)
  t.mock.timers.tick(1500)
  assert.equal(new URL(link.href).searchParams.get('__icue_asset_retry'), '1')
  f.resourceEvent('error', link)
  t.mock.timers.tick(1500)
  assert.equal(new URL(link.href).searchParams.get('__icue_asset_retry'), '2')
  f.resourceEvent('error', link)
  f.window.dispatchEvent(new Event('online'))
  t.mock.timers.tick(1500)
  assert.equal(new URL(link.href).searchParams.get('__icue_asset_retry'), '2')
  assert.equal(f.navigations.length, 0)
  link.dispatchEvent(new Event('load'))
  assert.equal(f.nodes.length, 0)
})
